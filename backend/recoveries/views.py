from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db import transaction
from decimal import Decimal
from datetime import timedelta

from .models import RecoveryRecord, PaymentReceipt
from .serializers import RecoveryRecordSerializer, PaymentReceiptSerializer
from buyers.models import Buyer


class RecoveryRecordViewSet(viewsets.ModelViewSet):
    queryset = RecoveryRecord.objects.all()
    serializer_class = RecoveryRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'seller', 'buyer']
    search_fields = ['bill_number', 'buyer_name', 'seller_name', 'buyer_city']

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        total_bills = qs.count()
        total_billed = qs.aggregate(s=Sum('billed_amount'))['s'] or Decimal('0.00')
        total_balance = qs.aggregate(s=Sum('balance_amount'))['s'] or Decimal('0.00')
        total_collected = total_billed - total_balance

        pending_count = qs.filter(status='PENDING').count()
        partial_count = qs.filter(status='PARTIAL').count()
        paid_count = qs.filter(status='PAID').count()

        # Overdue bills
        overdue_qs = [r for r in qs if r.is_overdue]
        overdue_amount = sum(r.balance_amount for r in overdue_qs)

        # Aging Buckets: 0-15, 16-30, 31-45, 45+ days
        today = timezone.now().date()
        unpaid_qs = qs.filter(balance_amount__gt=Decimal('0.00'))

        bucket_0_15_count = 0
        bucket_0_15_amount = Decimal('0.00')
        bucket_16_30_count = 0
        bucket_16_30_amount = Decimal('0.00')
        bucket_31_45_count = 0
        bucket_31_45_amount = Decimal('0.00')
        bucket_45_plus_count = 0
        bucket_45_plus_amount = Decimal('0.00')

        for rec in unpaid_qs:
            days = (today - rec.bill_date).days if rec.bill_date else 0
            if days <= 15:
                bucket_0_15_count += 1
                bucket_0_15_amount += rec.balance_amount
            elif days <= 30:
                bucket_16_30_count += 1
                bucket_16_30_amount += rec.balance_amount
            elif days <= 45:
                bucket_31_45_count += 1
                bucket_31_45_amount += rec.balance_amount
            else:
                bucket_45_plus_count += 1
                bucket_45_plus_amount += rec.balance_amount

        return Response({
            'total_bills': total_bills,
            'total_billed': float(total_billed),
            'total_balance': float(total_balance),
            'total_collected': float(total_collected),
            'pending_count': pending_count,
            'partial_count': partial_count,
            'paid_count': paid_count,
            'overdue_count': len(overdue_qs),
            'overdue_amount': float(overdue_amount),
            'aging': {
                'bucket_0_15': {'count': bucket_0_15_count, 'amount': float(bucket_0_15_amount)},
                'bucket_16_30': {'count': bucket_16_30_count, 'amount': float(bucket_16_30_amount)},
                'bucket_31_45': {'count': bucket_31_45_count, 'amount': float(bucket_31_45_amount)},
                'bucket_45_plus': {'count': bucket_45_plus_count, 'amount': float(bucket_45_plus_amount)},
            }
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        recovery = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        deductions_amount = Decimal(str(request.data.get('deductions_amount', 0) or 0))
        deduction_reason = request.data.get('deduction_reason', '')
        payment_date = request.data.get('payment_date')
        payment_mode = request.data.get('payment_mode', 'RTGS')
        ref_no = request.data.get('reference_number', '')
        collected_by = request.data.get('collected_by', '')
        notes = request.data.get('notes', '')

        if amount <= 0 and deductions_amount <= 0:
            return Response({'error': 'Amount or Deductions must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        payment = PaymentReceipt.objects.create(
            recovery=recovery,
            amount=amount,
            deductions_amount=deductions_amount,
            deduction_reason=deduction_reason,
            payment_date=payment_date or timezone.now().date(),
            payment_mode=payment_mode,
            reference_number=ref_no,
            collected_by=collected_by,
            notes=notes
        )

        recovery.refresh_from_db()
        return Response({
            'success': True,
            'message': f'Payment of ₹{amount} recorded successfully.',
            'new_balance': float(recovery.balance_amount),
            'status': recovery.status,
            'payment': PaymentReceiptSerializer(payment).data
        })

    @action(detail=False, methods=['post'])
    def allocate_payment(self, request):
        """
        Allocates a single lump-sum payment (e.g. 1 RTGS of ₹1,50,000) across multiple
        unpaid bills for a buyer, ordered by oldest bill date first.
        """
        buyer_id = request.data.get('buyer_id')
        total_amount = Decimal(str(request.data.get('amount', 0) or 0))
        total_deduction = Decimal(str(request.data.get('deductions_amount', 0) or 0))
        deduction_reason = request.data.get('deduction_reason', '')
        payment_date = request.data.get('payment_date') or timezone.now().date()
        payment_mode = request.data.get('payment_mode', 'RTGS')
        ref_no = request.data.get('reference_number', '')
        collected_by = request.data.get('collected_by', '')
        notes = request.data.get('notes', '')
        bill_ids = request.data.get('bill_ids', [])

        if total_amount <= 0 and total_deduction <= 0:
            return Response({'error': 'Total payment or deduction must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        if not buyer_id and not bill_ids:
            return Response({'error': 'Please provide buyer_id or a list of bill_ids'}, status=status.HTTP_400_BAD_REQUEST)

        # Select target bills
        if bill_ids:
            bills = list(RecoveryRecord.objects.filter(id__in=bill_ids, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))
        else:
            bills = list(RecoveryRecord.objects.filter(buyer_id=buyer_id, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))

        if not bills:
            return Response({'error': 'No outstanding bills found to allocate payment against.'}, status=status.HTTP_400_BAD_REQUEST)

        remaining_cash = total_amount
        remaining_ded = total_deduction
        allocated_receipts = []

        with transaction.atomic():
            for bill in bills:
                if remaining_cash <= 0 and remaining_ded <= 0:
                    break

                bill_bal = bill.balance_amount

                # Allocate deduction first if any
                ded_for_this = Decimal('0.00')
                if remaining_ded > 0:
                    ded_for_this = min(remaining_ded, bill_bal)
                    remaining_ded -= ded_for_this
                    bill_bal -= ded_for_this

                # Allocate cash
                cash_for_this = Decimal('0.00')
                if remaining_cash > 0 and bill_bal > 0:
                    cash_for_this = min(remaining_cash, bill_bal)
                    remaining_cash -= cash_for_this

                if cash_for_this > 0 or ded_for_this > 0:
                    receipt = PaymentReceipt.objects.create(
                        recovery=bill,
                        amount=cash_for_this,
                        deductions_amount=ded_for_this,
                        deduction_reason=deduction_reason if ded_for_this > 0 else '',
                        payment_date=payment_date,
                        payment_mode=payment_mode,
                        reference_number=ref_no,
                        collected_by=collected_by,
                        notes=f"Lump sum allocation ({ref_no}). {notes}".strip()
                    )
                    bill.refresh_from_db()
                    allocated_receipts.append({
                        'bill_id': bill.id,
                        'bill_number': bill.bill_number,
                        'allocated_amount': float(cash_for_this),
                        'allocated_deduction': float(ded_for_this),
                        'remaining_balance': float(bill.balance_amount),
                        'new_status': bill.status
                    })

        return Response({
            'success': True,
            'message': f"Successfully allocated ₹{total_amount} across {len(allocated_receipts)} bills.",
            'unallocated_remaining': float(remaining_cash),
            'allocated_receipts': allocated_receipts
        })

    @action(detail=False, methods=['post'])
    def log_reminder(self, request):
        """
        Logs that a consolidated WhatsApp reminder was sent for a buyer's bills.
        """
        buyer_id = request.data.get('buyer_id')
        bill_ids = request.data.get('bill_ids', [])

        qs = RecoveryRecord.objects.all()
        if bill_ids:
            qs = qs.filter(id__in=bill_ids)
        elif buyer_id:
            qs = qs.filter(buyer_id=buyer_id)
        else:
            return Response({'error': 'buyer_id or bill_ids is required'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        count = 0
        for bill in qs:
            bill.last_reminder_sent_at = now
            bill.reminder_count = (bill.reminder_count or 0) + 1
            bill.save(update_fields=['last_reminder_sent_at', 'reminder_count'])
            count += 1

        return Response({
            'success': True,
            'message': f"Logged reminder for {count} bills.",
            'timestamp': now.isoformat()
        })


class PaymentReceiptViewSet(viewsets.ModelViewSet):
    queryset = PaymentReceipt.objects.all()
    serializer_class = PaymentReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['recovery', 'payment_mode']

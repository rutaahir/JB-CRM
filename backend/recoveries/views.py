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
    queryset = RecoveryRecord.objects.all().select_related('buyer_contact', 'company_contact', 'deal')
    serializer_class = RecoveryRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'seller', 'buyer', 'buyer_contact', 'company_contact']
    search_fields = ['bill_number', 'buyer_name', 'seller_name', 'buyer_city', 'buyer_phone', 'buyer_contact__name', 'company_contact__name']

    @action(detail=False, methods=['get'])
    def party_summary(self, request):
        """
        Returns company-wise cumulative balance summary:
        Total Billed, Total Paid, Net Remaining Outstanding, Pending Bills Count,
        Oldest Overdue Days, Contact info, and list of unpaid bills.
        """
        qs = self.get_queryset()
        
        parties = {}
        for rec in qs:
            key = rec.buyer_contact_id or (f"b_{rec.buyer_id}" if rec.buyer_id else rec.buyer_name.strip().lower())
            if key not in parties:
                contact = rec.buyer_contact
                buyer_model = rec.buyer
                name = contact.name if contact else (buyer_model.company_name if buyer_model else rec.buyer_name)
                city = contact.city if contact else (buyer_model.address.split(',')[0] if buyer_model else rec.buyer_city)
                phone = (contact.mobile_1 or contact.phone_office_1 or contact.mobile_2) if contact else (buyer_model.whatsapp or buyer_model.phone if buyer_model else rec.buyer_phone)
                
                parties[key] = {
                    'party_key': str(key),
                    'buyer_contact_id': rec.buyer_contact_id,
                    'buyer_id': rec.buyer_id,
                    'company_name': name,
                    'city': city or '',
                    'phone': phone or '',
                    'total_billed': Decimal('0.00'),
                    'total_balance': Decimal('0.00'),
                    'total_paid': Decimal('0.00'),
                    'pending_bills_count': 0,
                    'total_bills_count': 0,
                    'oldest_bill_date': None,
                    'max_overdue_days': 0,
                    'last_reminder_sent_at': None,
                    'reminder_count': 0,
                    'bills': []
                }
            
            p = parties[key]
            p['total_bills_count'] += 1
            p['total_billed'] += rec.billed_amount
            p['total_balance'] += rec.balance_amount
            p['total_paid'] += (rec.billed_amount - rec.balance_amount)
            if rec.balance_amount > Decimal('0.00'):
                p['pending_bills_count'] += 1
                if rec.overdue_days > p['max_overdue_days']:
                    p['max_overdue_days'] = rec.overdue_days
                if not p['oldest_bill_date'] or (rec.bill_date and rec.bill_date < p['oldest_bill_date']):
                    p['oldest_bill_date'] = rec.bill_date

            if rec.last_reminder_sent_at:
                if not p['last_reminder_sent_at'] or rec.last_reminder_sent_at > p['last_reminder_sent_at']:
                    p['last_reminder_sent_at'] = rec.last_reminder_sent_at
            p['reminder_count'] += (rec.reminder_count or 0)

            p['bills'].append({
                'id': rec.id,
                'bill_number': rec.bill_number,
                'bill_date': rec.bill_date.strftime('%Y-%m-%d') if rec.bill_date else '',
                'seller_name': rec.seller_name,
                'billed_amount': float(rec.billed_amount),
                'balance_amount': float(rec.balance_amount),
                'paid_amount': float(rec.billed_amount - rec.balance_amount),
                'status': rec.status,
                'overdue_days': rec.overdue_days,
                'is_overdue': rec.is_overdue,
            })

        result = []
        for p in parties.values():
            result.append({
                'party_key': p['party_key'],
                'buyer_contact_id': p['buyer_contact_id'],
                'buyer_id': p['buyer_id'],
                'company_name': p['company_name'],
                'city': p['city'],
                'phone': p['phone'],
                'total_billed': float(p['total_billed']),
                'total_paid': float(p['total_paid']),
                'total_balance': float(p['total_balance']),
                'pending_bills_count': p['pending_bills_count'],
                'total_bills_count': p['total_bills_count'],
                'oldest_bill_date': p['oldest_bill_date'].strftime('%Y-%m-%d') if p['oldest_bill_date'] else None,
                'max_overdue_days': p['max_overdue_days'],
                'last_reminder_sent_at': p['last_reminder_sent_at'].isoformat() if p['last_reminder_sent_at'] else None,
                'reminder_count': p['reminder_count'],
                'bills': p['bills'],
            })

        result.sort(key=lambda x: x['total_balance'], reverse=True)
        return Response(result)

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
        buyer_contact_id = request.data.get('buyer_contact_id')
        buyer_id = request.data.get('buyer_id')
        buyer_name = request.data.get('buyer_name', '').strip()
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

        if not buyer_contact_id and not buyer_id and not buyer_name and not bill_ids:
            return Response({'error': 'Please provide buyer_contact_id, buyer_name, or bill_ids'}, status=status.HTTP_400_BAD_REQUEST)

        # Select target bills
        if bill_ids:
            bills = list(RecoveryRecord.objects.filter(id__in=bill_ids, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))
        elif buyer_contact_id:
            bills = list(RecoveryRecord.objects.filter(buyer_contact_id=buyer_contact_id, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))
        elif buyer_id:
            bills = list(RecoveryRecord.objects.filter(buyer_id=buyer_id, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))
        elif buyer_name:
            bills = list(RecoveryRecord.objects.filter(buyer_name__iexact=buyer_name, balance_amount__gt=Decimal('0.00')).order_by('bill_date', 'id'))
        else:
            bills = []

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

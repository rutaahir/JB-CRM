from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal

from .models import Deal, BrokeragePayment
from .serializers import DealSerializer, BrokeragePaymentSerializer
from sellers.models import Seller
from buyers.models import Buyer


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'brokerage_status', 'seller', 'buyer']
    search_fields = ['deal_number', 'seller_name', 'buyer_name', 'product_name', 'buyer_city']

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        total_deals = qs.count()
        total_volume = qs.aggregate(s=Sum('gross_amount'))['s'] or Decimal('0.00')
        total_brokerage = qs.aggregate(s=Sum('brokerage_total'))['s'] or Decimal('0.00')
        total_received = qs.aggregate(s=Sum('brokerage_received'))['s'] or Decimal('0.00')
        pending_brokerage = max(Decimal('0.00'), total_brokerage - total_received)
        total_bags = qs.aggregate(s=Sum('quantity'))['s'] or 0

        return Response({
            'total_deals': total_deals,
            'total_volume': float(total_volume),
            'total_brokerage': float(total_brokerage),
            'total_brokerage_received': float(total_received),
            'pending_brokerage': float(pending_brokerage),
            'total_bags': total_bags
        })

    @action(detail=True, methods=['post'])
    def record_brokerage_payment(self, request, pk=None):
        deal = self.get_object()
        amount = Decimal(str(request.data.get('amount', 0)))
        paid_by = request.data.get('paid_by', 'SELLER')
        payment_date = request.data.get('payment_date') or timezone.now().date()
        payment_mode = request.data.get('payment_mode', 'RTGS')
        ref_no = request.data.get('reference_number', '')
        collected_by = request.data.get('collected_by', '')
        notes = request.data.get('notes', '')

        if amount <= 0:
            return Response({'error': 'Payment amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        payment = BrokeragePayment.objects.create(
            deal=deal,
            amount=amount,
            paid_by=paid_by,
            payment_date=payment_date,
            payment_mode=payment_mode,
            reference_number=ref_no,
            collected_by=collected_by,
            notes=notes
        )

        deal.refresh_from_db()
        return Response({
            'success': True,
            'message': f'Brokerage payment of ₹{amount} recorded successfully.',
            'brokerage_received': float(deal.brokerage_received),
            'brokerage_status': deal.brokerage_status,
            'payment': BrokeragePaymentSerializer(payment).data
        })

    @action(detail=False, methods=['get'])
    def brokerage_ledger(self, request):
        """
        Comprehensive brokerage ledger breakdown:
        Earned vs Received vs Pending, grouped by Seller (Mill) and Buyer.
        """
        qs = self.get_queryset()

        total_earned = qs.aggregate(s=Sum('brokerage_total'))['s'] or Decimal('0.00')
        total_received = qs.aggregate(s=Sum('brokerage_received'))['s'] or Decimal('0.00')
        total_pending = max(Decimal('0.00'), total_earned - total_received)

        # Mill (Seller) breakdown
        seller_ids = qs.values_list('seller_id', flat=True).distinct()
        mill_summary = []
        for s_id in seller_ids:
            if not s_id:
                continue
            seller = Seller.objects.filter(id=s_id).first()
            if not seller:
                continue
            s_deals = qs.filter(seller_id=s_id)
            s_earned = s_deals.aggregate(s=Sum('brokerage_total'))['s'] or Decimal('0.00')
            s_received = s_deals.aggregate(s=Sum('brokerage_received'))['s'] or Decimal('0.00')
            mill_summary.append({
                'seller_id': seller.id,
                'company_name': seller.company_name,
                'phone': seller.phone,
                'gstin': getattr(seller, 'gstin', ''),
                'deals_count': s_deals.count(),
                'brokerage_earned': float(s_earned),
                'brokerage_received': float(s_received),
                'brokerage_pending': float(max(Decimal('0.00'), s_earned - s_received))
            })

        # Recent brokerage payments
        recent_payments = BrokeragePayment.objects.select_related('deal').all()[:20]
        payments_data = [{
            'id': p.id,
            'deal_number': p.deal.deal_number,
            'amount': float(p.amount),
            'paid_by': p.paid_by,
            'payment_date': p.payment_date,
            'payment_mode': p.payment_mode,
            'reference_number': p.reference_number
        } for p in recent_payments]

        return Response({
            'total_earned': float(total_earned),
            'total_received': float(total_received),
            'total_pending': float(total_pending),
            'mill_summary': mill_summary,
            'recent_payments': payments_data
        })

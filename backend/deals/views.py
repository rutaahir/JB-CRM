import csv
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal

from .models import Deal, BrokeragePayment, MillOrder, PendingOrder, PartyProductMapping, PartyProductTarget, sync_deal_side_effects
from .serializers import (
    DealSerializer,
    BrokeragePaymentSerializer,
    MillOrderSerializer,
    PendingOrderSerializer,
    PartyProductMappingSerializer,
    PartyProductTargetSerializer,
)
from sellers.models import Seller
from buyers.models import Buyer


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all().select_related('company_contact', 'buyer_contact', 'product', 'mill_order')
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['deal_number', 'seller_name', 'buyer_name', 'product_name', 'buyer_city']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        buyer_id = params.get('buyer_contact') or params.get('buyer')
        if buyer_id:
            qs = qs.filter(Q(buyer_contact_id=buyer_id) | Q(buyer_id=buyer_id))

        company_id = params.get('company_contact') or params.get('seller')
        if company_id:
            qs = qs.filter(Q(company_contact_id=company_id) | Q(seller_id=company_id))

        product_id = params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)

        status_val = params.get('status')
        if status_val and status_val != 'ALL':
            qs = qs.filter(Q(status=status_val) | Q(delivery_status=status_val))

        delivery_status = params.get('delivery_status')
        if delivery_status and delivery_status != 'ALL':
            qs = qs.filter(delivery_status=delivery_status)

        payment_status = params.get('payment_status')
        if payment_status and payment_status != 'ALL':
            qs = qs.filter(payment_status=payment_status)

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)

        date_exact = params.get('date')
        if date_exact:
            qs = qs.filter(date=date_exact)

        return qs

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """
        Sauda Register Excel / CSV Export with UTF-8 BOM for proper Gujarati text display.
        """
        deals = self.get_queryset().order_by('-date', '-id')

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="Sauda_Register_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        # Write UTF-8 BOM so Excel opens Gujarati text correctly
        response.write(b'\xef\xbb\xbf')

        writer = csv.writer(response)
        writer.writerow([
            'Sauda No',
            'Deal Date',
            'Company / Mill',
            'Buyer Party',
            'Buyer City',
            'Product',
            'Quantity',
            'Quantity Unit',
            'Rate (Rs)',
            'Rate Unit',
            'Delivery / Payment',
            'Gross Amount (Rs)',
            'Mill Order No'
        ])

        for d in deals:
            c_name = d.company_contact.name if d.company_contact else (d.seller.company_name if d.seller else (d.seller_name or "-"))
            b_name = d.buyer_contact.name if d.buyer_contact else (d.buyer.company_name if d.buyer else (d.buyer_name or "-"))
            b_city = d.buyer_contact.city if (d.buyer_contact and d.buyer_contact.city) else (d.buyer_city or "-")
            p_name = d.product.name if d.product else (d.product_name or "-")
            mo_no = getattr(getattr(d, 'mill_order', None), 'order_number', f"MO-{d.deal_number}")
            status_val = d.delivery_payment_status or d.delivery_status or d.status or 'Pending'
            gross_val = d.gross_amount if (d.rate_unit == d.quantity_unit and d.gross_amount is not None) else "Mixed units"

            writer.writerow([
                d.deal_number,
                d.date.strftime('%d-%m-%Y') if hasattr(d.date, 'strftime') else str(d.date),
                c_name,
                b_name,
                b_city,
                p_name,
                d.quantity,
                d.quantity_unit,
                d.rate,
                d.rate_unit,
                status_val,
                gross_val,
                mo_no
            ])

        return response

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


class MillOrderViewSet(viewsets.ModelViewSet):
    queryset = MillOrder.objects.all().select_related('deal', 'company_contact', 'buyer_contact', 'product')
    serializer_class = MillOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'company_contact', 'buyer_contact', 'product']
    search_fields = ['order_number', 'company_contact__name', 'buyer_contact__name', 'product__name']


class PendingOrderViewSet(viewsets.ModelViewSet):
    queryset = PendingOrder.objects.all().select_related('deal', 'company_contact', 'buyer_contact', 'product')
    serializer_class = PendingOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'company_contact', 'buyer_contact', 'product']
    search_fields = ['deal__deal_number', 'company_contact__name', 'company_name', 'buyer_contact__name', 'party_name', 'city', 'product__name', 'product_name']


class PartyProductMappingViewSet(viewsets.ModelViewSet):
    queryset = PartyProductMapping.objects.all().select_related('buyer_contact', 'product')
    serializer_class = PartyProductMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['buyer_contact', 'product']


class PartyProductTargetViewSet(viewsets.ModelViewSet):
    queryset = PartyProductTarget.objects.all().select_related('buyer_contact', 'product')
    serializer_class = PartyProductTargetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['buyer_contact', 'product', 'month_str']

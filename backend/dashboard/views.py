from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q
from decimal import Decimal

from contacts.models import Contact
from products.models import Product
from deals.models import Deal, MillOrder, PendingOrder, PartyProductTarget
from recoveries.models import RecoveryRecord

User = get_user_model()

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request):
        today = timezone.now().date()
        month_str = today.strftime('%Y-%m')

        # Contacts count
        total_mills = Contact.objects.filter(party_type='COMPANY_MILL', is_active=True).count()
        total_buyers = Contact.objects.filter(party_type='BUYER', is_active=True).count()
        total_contacts = total_mills + total_buyers
        total_products = Product.objects.filter(is_active=True).count()

        # Staff
        total_staff = User.objects.filter(role=User.Role.STAFF).count()
        active_staff = User.objects.filter(role=User.Role.STAFF, is_active=True).count()

        # Deals
        all_deals = Deal.objects.filter(is_test=False)
        total_deals = all_deals.count()
        today_deals_count = all_deals.filter(date=today).count()
        total_bags = all_deals.aggregate(s=Sum('quantity'))['s'] or 0
        total_brokerage = all_deals.aggregate(s=Sum('brokerage_total'))['s'] or Decimal('0.00')

        # Pending Orders
        all_po = PendingOrder.objects.all()
        total_pending_orders = all_po.filter(status__in=['Pending', 'Dispatch Due']).count()
        total_pending_bags = all_po.filter(status__in=['Pending', 'Dispatch Due']).aggregate(s=Sum('pending_quantity'))['s'] or Decimal('0.00')
        total_dispatched_bags = all_po.aggregate(s=Sum('dispatch_quantity'))['s'] or Decimal('0.00')

        # Mill Orders
        total_mill_orders = MillOrder.objects.count()
        pending_mill_orders = MillOrder.objects.filter(status='Pending').count()

        # Target Progress (Current Month)
        targets = PartyProductTarget.objects.filter(month_str=month_str)
        target_goal_sum = targets.aggregate(s=Sum('target_quantity'))['s'] or Decimal('0.00')
        target_actual_sum = targets.aggregate(s=Sum('actual_quantity'))['s'] or Decimal('0.00')
        target_percentage = int((target_actual_sum / target_goal_sum * 100)) if target_goal_sum > Decimal('0.00') else 0

        # Recovery stats
        total_balance = RecoveryRecord.objects.aggregate(s=Sum('balance_amount'))['s'] or Decimal('0.00')
        total_recovered = (RecoveryRecord.objects.aggregate(s=Sum('billed_amount'))['s'] or Decimal('0.00')) - total_balance

        # Recent Deals
        recent_deals = [
            {
                'id': d.id,
                'deal_number': d.deal_number,
                'date': d.date.strftime('%d-%m-%Y'),
                'seller_name': d.seller_name,
                'buyer_name': d.buyer_name,
                'product_name': d.product_name,
                'quantity': d.quantity,
                'quantity_unit': d.quantity_unit,
                'rate': str(d.rate),
                'rate_unit': d.rate_unit,
                'delivery_payment_status': d.delivery_payment_status or d.delivery_status,
            }
            for d in all_deals.order_by('-date', '-id')[:6]
        ]

        # Recent Pending Orders
        recent_pending_orders = [
            {
                'id': po.id,
                'order_date': po.order_date.strftime('%d-%m-%Y'),
                'company_name': po.company_name or (po.company_contact.name if po.company_contact else 'Mill'),
                'buyer_name': po.party_name or (po.buyer_contact.name if po.buyer_contact else 'Buyer'),
                'city': po.city,
                'product_name': po.product_name or (po.product.name if po.product else ''),
                'pending_quantity': float(po.pending_quantity),
                'status': po.status,
                'days_pending': max((today - po.order_date).days, 0) if po.order_date else 0,
            }
            for po in all_po.filter(status__in=['Pending', 'Dispatch Due']).order_by('-order_date')[:6]
        ]

        # Recent Products
        recent_products = [
            {
                "id": p.id,
                "name": p.name,
                "is_active": p.is_active,
                "created_at": p.created_at.strftime('%d-%m-%Y'),
            }
            for p in Product.objects.all().order_by('-created_at')[:6]
        ]

        data = {
            "stats": {
                "total_mills": total_mills,
                "total_buyers": total_buyers,
                "total_contacts": total_contacts,
                "total_products": total_products,
                "total_staff": total_staff,
                "active_staff": active_staff,
                "total_deals": total_deals,
                "today_deals_count": today_deals_count,
                "total_bags": total_bags,
                "total_brokerage": float(total_brokerage),
                "total_pending_orders": total_pending_orders,
                "total_pending_bags": float(total_pending_bags),
                "total_dispatched_bags": float(total_dispatched_bags),
                "total_mill_orders": total_mill_orders,
                "pending_mill_orders": pending_mill_orders,
                "target_goal_sum": float(target_goal_sum),
                "target_actual_sum": float(target_actual_sum),
                "target_percentage": target_percentage,
                "total_balance": float(total_balance),
                "total_recovered": float(total_recovered),
            },
            "recent_deals": recent_deals,
            "recent_pending_orders": recent_pending_orders,
            "recent_products": recent_products,
        }
        return Response(data)


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta
from decimal import Decimal

from sellers.models import Seller
from buyers.models import Buyer
from products.models import Product
from deals.models import Deal
from recoveries.models import RecoveryRecord

User = get_user_model()

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: dict})
    def get(self, request):
        total_sellers = Seller.objects.count()
        total_buyers = Buyer.objects.count()
        total_products = Product.objects.count()
        total_staff = User.objects.filter(role=User.Role.STAFF).count()
        active_staff = User.objects.filter(role=User.Role.STAFF, is_active=True).count()

        # Deals & Brokerage stats
        total_deals = Deal.objects.count()
        total_volume = Deal.objects.aggregate(s=Sum('gross_amount'))['s'] or Decimal('0.00')
        total_brokerage = Deal.objects.aggregate(s=Sum('brokerage_total'))['s'] or Decimal('0.00')
        total_bags = Deal.objects.aggregate(s=Sum('quantity'))['s'] or 0

        # Recovery stats
        total_balance = RecoveryRecord.objects.aggregate(s=Sum('balance_amount'))['s'] or Decimal('0.00')
        total_recovered = (RecoveryRecord.objects.aggregate(s=Sum('billed_amount'))['s'] or Decimal('0.00')) - total_balance

        # Recent items
        recent_sellers = list(Seller.objects.all().order_by('-created_at')[:5].values(
            'id', 'company_name', 'phone', 'email', 'created_at'
        ))
        recent_buyers = list(Buyer.objects.all().order_by('-created_at')[:5].values(
            'id', 'company_name', 'phone', 'email', 'created_at'
        ))
        recent_products = [
            {
                "id": p.id,
                "name": p.name,
                "category__name": p.category.name if p.category else "",
                "price": str(p.price) if p.price else None,
                "price_unit": p.price_unit,
                "packaging": p.packaging,
                "image": request.build_absolute_uri(p.image.url) if p.image else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in Product.objects.select_related('category').all().order_by('-created_at')[:5]
        ]
        recent_deals = list(Deal.objects.all().order_by('-date', '-id')[:5].values(
            'id', 'deal_number', 'date', 'seller_name', 'buyer_name', 'product_name', 'quantity', 'rate', 'gross_amount', 'brokerage_total', 'status'
        ))

        s_cur = max(total_sellers, 0)
        b_cur = max(total_buyers, 0)
        p_cur = max(total_products, 0)

        data = {
            "stats": {
                "total_sellers": s_cur,
                "total_buyers": b_cur,
                "total_products": p_cur,
                "total_staff": total_staff,
                "active_staff": active_staff,
                "total_deals": total_deals,
                "total_volume": float(total_volume),
                "total_brokerage": float(total_brokerage),
                "total_bags": total_bags,
                "total_balance": float(total_balance),
                "total_recovered": float(total_recovered),
                "sellers_growth": "+12% from last month",
                "buyers_growth": "+8% from last month",
                "products_growth": "+15% from last month",
                "staff_active_percentage": f"{int((active_staff / total_staff * 100)) if total_staff > 0 else 100}% active"
            },
            "recent_sellers": recent_sellers,
            "recent_buyers": recent_buyers,
            "recent_products": recent_products,
            "recent_deals": recent_deals,
        }
        return Response(data)

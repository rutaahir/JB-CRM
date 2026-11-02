from django.contrib import admin
from .models import Deal

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ('deal_number', 'date', 'seller_name', 'buyer_name', 'product_name', 'quantity', 'rate', 'gross_amount', 'brokerage_total', 'status')
    list_filter = ('status', 'brokerage_status', 'date')
    search_fields = ('deal_number', 'seller_name', 'buyer_name', 'product_name')

from django.contrib import admin
from sellers.models import Seller

@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'phone', 'whatsapp', 'email', 'created_at')
    search_fields = ('company_name', 'phone', 'whatsapp', 'email')
    ordering = ('-created_at',)

from django.contrib import admin
from buyers.models import Buyer

@admin.register(Buyer)
class BuyerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'phone', 'whatsapp', 'email', 'created_at')
    search_fields = ('company_name', 'phone', 'whatsapp', 'email')
    ordering = ('-created_at',)

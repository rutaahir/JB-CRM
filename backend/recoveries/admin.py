from django.contrib import admin
from .models import RecoveryRecord, PaymentReceipt

class PaymentReceiptInline(admin.TabularInline):
    model = PaymentReceipt
    extra = 1

@admin.register(RecoveryRecord)
class RecoveryRecordAdmin(admin.ModelAdmin):
    list_display = ('bill_number', 'bill_date', 'buyer_name', 'buyer_city', 'seller_name', 'billed_amount', 'balance_amount', 'status')
    list_filter = ('status', 'seller_name')
    search_fields = ('bill_number', 'buyer_name', 'seller_name')
    inlines = [PaymentReceiptInline]

@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ('recovery', 'amount', 'payment_date', 'payment_mode', 'reference_number')
    list_filter = ('payment_mode', 'payment_date')

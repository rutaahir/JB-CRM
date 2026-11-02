from django.db import models
from django.utils import timezone
from decimal import Decimal
from sellers.models import Seller
from buyers.models import Buyer
from products.models import Product

class Deal(models.Model):
    STATUS_CHOICES = [
        ('BOOKED', 'Sauda Booked / સોદો નોંધાયો'),
        ('DISPATCHED', 'Dispatched / રવાના'),
        ('DELIVERED', 'Delivered / પહોંચી ગયું'),
        ('COMPLETED', 'Completed / પૂર્ણ'),
        ('CANCELLED', 'Cancelled / રદ'),
    ]

    BROKERAGE_TYPE_CHOICES = [
        ('PER_UNIT', '₹ Per Bag/Unit'),
        ('PERCENTAGE', '% Percentage'),
    ]

    BROKERAGE_FROM_CHOICES = [
        ('SELLER', 'Seller Only'),
        ('BUYER', 'Buyer Only'),
        ('BOTH', 'Both (Seller & Buyer)'),
    ]

    BROKERAGE_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid / બાકી'),
        ('PARTIAL', 'Partial / અડધું મળ્યું'),
        ('PAID', 'Paid / પૂરું મળ્યું'),
    ]

    deal_number = models.CharField(max_length=100, unique=True, blank=True, verbose_name="Sauda Number")
    date = models.DateField(default=timezone.now, verbose_name="Deal Date")

    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Seller / Mill")
    seller_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Seller Name")

    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Buyer / Party")
    buyer_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Buyer Name")
    buyer_city = models.CharField(max_length=150, blank=True, default='', verbose_name="Buyer City / Station")

    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Product")
    product_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Product / Item Name")

    packaging = models.CharField(max_length=100, default="50 kg Bag", verbose_name="Packaging")
    quantity = models.IntegerField(default=0, verbose_name="Quantity (Bags / Units)")
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Rate (₹)")
    rate_unit = models.CharField(max_length=50, default="Per Bag", verbose_name="Rate Unit")
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Gross Deal Amount (₹)")

    # Brokerage configuration
    brokerage_type = models.CharField(max_length=20, choices=BROKERAGE_TYPE_CHOICES, default='PER_UNIT', verbose_name="Brokerage Calculation Type")
    brokerage_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('5.00'), verbose_name="Brokerage Rate")
    brokerage_from = models.CharField(max_length=20, choices=BROKERAGE_FROM_CHOICES, default='SELLER', verbose_name="Brokerage Charged From")
    brokerage_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Brokerage Earned (₹)")
    brokerage_received = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Brokerage Received (₹)")
    brokerage_status = models.CharField(max_length=20, choices=BROKERAGE_STATUS_CHOICES, default='UNPAID', verbose_name="Brokerage Payment Status")

    statement = models.ForeignKey('statements.UploadedStatement', on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Imported From Statement")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='BOOKED', verbose_name="Deal Status")
    delivery_terms = models.CharField(max_length=255, blank=True, default='', verbose_name="Delivery Place / Condition")
    payment_terms = models.CharField(max_length=255, blank=True, default='', verbose_name="Payment Terms / Due Days")
    notes = models.TextField(blank=True, default='', verbose_name="Notes / Special Instructions")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "Sauda Deal"
        verbose_name_plural = "Sauda Deals"

    def __str__(self):
        return f"{self.deal_number} - {self.seller_name} to {self.buyer_name}"

    def update_brokerage_status(self):
        if self.brokerage_total <= Decimal('0.00'):
            self.brokerage_status = 'PAID'
        elif self.brokerage_received >= self.brokerage_total:
            self.brokerage_status = 'PAID'
        elif self.brokerage_received > Decimal('0.00'):
            self.brokerage_status = 'PARTIAL'
        else:
            self.brokerage_status = 'UNPAID'

    def save(self, *args, **kwargs):
        if self.seller and not self.seller_name:
            self.seller_name = self.seller.company_name
        if self.buyer and not self.buyer_name:
            self.buyer_name = self.buyer.company_name
        if self.product and not self.product_name:
            self.product_name = self.product.name

        if self.gross_amount == Decimal('0.00') or self.gross_amount is None:
            self.gross_amount = Decimal(self.quantity) * Decimal(self.rate)

        if self.brokerage_total == Decimal('0.00') or self.brokerage_total is None:
            mult = 2 if self.brokerage_from == 'BOTH' else 1
            if self.brokerage_type == 'PER_UNIT':
                self.brokerage_total = Decimal(self.quantity) * Decimal(self.brokerage_rate) * mult
            else:
                self.brokerage_total = (self.gross_amount * Decimal(self.brokerage_rate) / Decimal('100.00')) * mult

        self.update_brokerage_status()

        if not self.deal_number:
            from django.db import transaction
            with transaction.atomic():
                date_prefix = timezone.now().strftime('%Y%m%d')
                last_deal = Deal.objects.filter(deal_number__startswith=f'SD-{date_prefix}').order_by('-deal_number').first()
                if last_deal and last_deal.deal_number:
                    try:
                        last_seq = int(last_deal.deal_number.split('-')[-1])
                        next_seq = last_seq + 1
                    except Exception:
                        next_seq = Deal.objects.filter(deal_number__startswith=f'SD-{date_prefix}').count() + 1
                else:
                    next_seq = 1
                self.deal_number = f'SD-{date_prefix}-{next_seq:04d}'

        super().save(*args, **kwargs)


class BrokeragePayment(models.Model):
    PAYMENT_MODE_CHOICES = [
        ('RTGS', 'RTGS / Bank Transfer'),
        ('NEFT', 'NEFT'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI / Net Banking'),
        ('CASH', 'Cash'),
        ('TDS_ADJUSTMENT', 'TDS / Book Adjustment'),
    ]

    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='brokerage_payments', verbose_name="Sauda Reference")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Brokerage Amount Paid (₹)")
    payment_date = models.DateField(default=timezone.now, verbose_name="Payment Date")
    paid_by = models.CharField(max_length=20, default='SELLER', choices=[('SELLER', 'Seller / Mill'), ('BUYER', 'Buyer / Party')], verbose_name="Paid By")
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODE_CHOICES, default='RTGS', verbose_name="Payment Mode")
    reference_number = models.CharField(max_length=100, blank=True, default='', verbose_name="UTR / Cheque / Txn Number")
    collected_by = models.CharField(max_length=150, blank=True, default='', verbose_name="Collected By")
    notes = models.TextField(blank=True, default='', verbose_name="Remarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']
        verbose_name = "Brokerage Payment"
        verbose_name_plural = "Brokerage Payments"

    def __str__(self):
        return f"₹{self.amount} brokerage for {self.deal.deal_number} ({self.paid_by})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalculate parent deal brokerage
        total_rec = self.deal.brokerage_payments.aggregate(models.Sum('amount'))['amount__sum'] or Decimal('0.00')
        self.deal.brokerage_received = total_rec
        self.deal.update_brokerage_status()
        self.deal.save(update_fields=['brokerage_received', 'brokerage_status'])

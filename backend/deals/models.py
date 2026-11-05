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
    company_contact = models.ForeignKey('contacts.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='company_deals', verbose_name="Company / Mill (Party ID)")

    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Buyer / Party")
    buyer_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Buyer Name")
    buyer_city = models.CharField(max_length=150, blank=True, default='', verbose_name="Buyer City / Station")
    buyer_contact = models.ForeignKey('contacts.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='buyer_deals', verbose_name="Buyer (Party ID)")

    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='deals', verbose_name="Product")
    product_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Product / Item Name")

    packaging = models.CharField(max_length=100, default="50 kg Bag", verbose_name="Packaging")
    quantity = models.IntegerField(default=0, verbose_name="Quantity (Bags / Units)")
    quantity_unit = models.CharField(max_length=20, default="BAG", choices=[('BAG', 'BAG'), ('MAN', 'મણ')], verbose_name="Quantity Unit")
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Rate (₹)")
    rate_unit = models.CharField(max_length=50, default="BAG", choices=[('BAG', 'BAG'), ('MAN', 'મણ')], verbose_name="Rate Unit")
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True, verbose_name="Gross Deal Amount (₹)")

    # Status fields (Single Delivery/Payment status per client spec)
    delivery_payment_status = models.CharField(max_length=20, default="Pending", choices=[('Pending', 'Pending'), ('Done', 'Done')], verbose_name="Delivery / Payment Status")
    delivery_status = models.CharField(max_length=50, default="Pending", verbose_name="Delivery Status")
    payment_status = models.CharField(max_length=50, default="Pending", verbose_name="Payment Status")
    is_test = models.BooleanField(default=False, db_index=True, verbose_name="Is Test Deal")

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
        if self.company_contact:
            if not self.seller_name:
                self.seller_name = self.company_contact.name
        elif self.seller and not self.seller_name:
            self.seller_name = self.seller.company_name

        if self.buyer_contact:
            if not self.buyer_name:
                self.buyer_name = self.buyer_contact.name
            if not self.buyer_city and self.buyer_contact.city:
                self.buyer_city = self.buyer_contact.city
        elif self.buyer and not self.buyer_name:
            self.buyer_name = self.buyer.company_name
        if self.product and not self.product_name:
            self.product_name = self.product.name

        # Unit Check: Never multiply rate by quantity if units differ (BAG vs મણ)
        if self.rate_unit == self.quantity_unit:
            self.gross_amount = Decimal(self.quantity) * Decimal(self.rate)
        else:
            self.gross_amount = None

        if self.brokerage_total == Decimal('0.00') or self.brokerage_total is None:
            mult = 2 if self.brokerage_from == 'BOTH' else 1
            if self.brokerage_type == 'PER_UNIT' or self.gross_amount is None:
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

        # Trigger Module 3 side-effects automatically
        if self.company_contact and self.buyer_contact and self.product:
            sync_deal_side_effects(self)


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


class MillOrder(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Dispatched', 'Dispatched'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]

    deal = models.OneToOneField(Deal, on_delete=models.CASCADE, related_name='mill_order', verbose_name="Linked Deal")
    order_number = models.CharField(max_length=100, unique=True, verbose_name="Mill Order No")
    date = models.DateField(default=timezone.now, verbose_name="Order Date")
    company_contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='mill_orders', verbose_name="Company / Mill")
    buyer_contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='buyer_mill_orders', verbose_name="Buyer")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Product")
    quantity = models.IntegerField(default=0, verbose_name="Quantity")
    quantity_unit = models.CharField(max_length=20, default='BAG', verbose_name="Quantity Unit")
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Rate")
    rate_unit = models.CharField(max_length=20, default='BAG', verbose_name="Rate Unit")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending', verbose_name="Order Status")
    whatsapp_message_mill = models.TextField(blank=True, default='', verbose_name="WhatsApp Message for Mill")
    whatsapp_message_buyer = models.TextField(blank=True, default='', verbose_name="WhatsApp Message for Buyer")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-id']
        verbose_name = "Mill Order"
        verbose_name_plural = "Mill Orders"

    def __str__(self):
        return f"{self.order_number} ({self.company_contact.name})"


class PendingOrder(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Dispatch Due', 'Dispatch Due'),
        ('Completed', 'Completed'),
    ]

    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='pending_orders', verbose_name="Linked Deal")
    company_contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, null=True, blank=True, related_name='company_pending_orders', verbose_name="Company / Mill")
    company_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Company / Mill Name")

    buyer_contact = models.ForeignKey('contacts.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='buyer_pending_orders', verbose_name="Buyer")
    party_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Party Name (Raw)")
    city = models.CharField(max_length=150, blank=True, default='', verbose_name="City / Station")

    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Product")
    product_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Product Name")
    broker = models.CharField(max_length=150, blank=True, default='JALARAM', verbose_name="Broker")

    order_date = models.DateField(default=timezone.now, verbose_name="Order Date")
    rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Rate (₹)")
    rate_unit = models.CharField(max_length=20, default='BAG', verbose_name="Rate Unit")
    order_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Bags (Order Qty)")
    dispatch_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Dispatch Bags")
    pending_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Pending Bags")
    quantity_unit = models.CharField(max_length=20, default='BAG', verbose_name="Quantity Unit")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending', verbose_name="Order Status")

    statement = models.ForeignKey('statements.UploadedStatement', on_delete=models.SET_NULL, null=True, blank=True, related_name='pending_orders', verbose_name="Source Report")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date', '-id']
        verbose_name = "Pending Order"
        verbose_name_plural = "Pending Orders"

    def __str__(self):
        p_name = self.party_name or (self.buyer_contact.name if self.buyer_contact else 'Buyer')
        c_name = self.company_name or (self.company_contact.name if self.company_contact else 'Mill')
        return f"{c_name} -> {p_name} ({self.pending_quantity} {self.quantity_unit} Pending)"


class PartyProductMapping(models.Model):
    buyer_contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='product_mappings', verbose_name="Buyer Party")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='party_mappings', verbose_name="Product")
    first_deal_date = models.DateField(default=timezone.now)
    last_deal_date = models.DateField(default=timezone.now)
    last_rate = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    last_rate_unit = models.CharField(max_length=20, default='BAG')
    total_deals_count = models.IntegerField(default=1)
    total_quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('buyer_contact', 'product')
        verbose_name = "Party Product Mapping"
        verbose_name_plural = "Party Product Mappings"

    def __str__(self):
        return f"{self.buyer_contact.name} -> {self.product.name}"


class PartyProductTarget(models.Model):
    buyer_contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name='product_targets', verbose_name="Buyer Party")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='party_targets', verbose_name="Product")
    month_str = models.CharField(max_length=7, verbose_name="Month YYYY-MM")
    target_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Target Quantity (BAG)")
    actual_quantity = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'), verbose_name="Actual Quantity (BAG)")
    target_unit = models.CharField(max_length=20, default='BAG', verbose_name="Unit")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('buyer_contact', 'product', 'month_str', 'target_unit')
        verbose_name = "Party Product Target"
        verbose_name_plural = "Party Product Targets"

    def __str__(self):
        return f"{self.buyer_contact.name} - {self.product.name} ({self.month_str}): {self.actual_quantity}/{self.target_quantity}"


def sync_deal_side_effects(deal):
    """
    On saving ONE deal, automatically:
    a) Creates the Mill Order,
    b) Generates a ready WhatsApp message for the Mill Order and Buyer,
    c) Updates the Order Register (Deal itself),
    d) Links the order into Pending Order tracking,
    e) Applies Product Auto-Mapping + Target actual update (Module 6).
    """
    if not deal.company_contact or not deal.buyer_contact or not deal.product:
        return {}

    mill = deal.company_contact
    buyer = deal.buyer_contact
    product = deal.product

    d_date_str = deal.date.strftime('%d-%m-%Y') if hasattr(deal.date, 'strftime') else str(deal.date)

    msg_mill = (
        f"*JALARAM BROKERS - SAUDA ORDER CONFIRMATION*\n"
        f"Sauda No: {deal.deal_number}\n"
        f"Date: {d_date_str}\n"
        f"Buyer: {buyer.name}" + (f" ({buyer.city})" if buyer.city else "") + f"\n"
        f"Mill / Supplier: {mill.name}\n"
        f"Product: {product.name}\n"
        f"Quantity: {deal.quantity} {deal.quantity_unit}\n"
        f"Rate: Rs {deal.rate} / {deal.rate_unit}\n"
        f"Delivery / Payment: {deal.delivery_payment_status or deal.delivery_status or 'Pending'}\n"
        f"Please confirm dispatch date and transport details."
    )

    msg_buyer = (
        f"*JALARAM BROKERS - SAUDA CONFIRMATION*\n"
        f"Sauda No: {deal.deal_number}\n"
        f"Date: {d_date_str}\n"
        f"Supplier Mill: {mill.name}\n"
        f"Product: {product.name}\n"
        f"Quantity: {deal.quantity} {deal.quantity_unit}\n"
        f"Rate: Rs {deal.rate} / {deal.rate_unit}\n"
        f"Delivery / Payment: {deal.delivery_payment_status or deal.delivery_status or 'Pending'}\n"
        f"Thank you for your business."
    )

    # 1. Mill Order
    mo_num = f"MO-{deal.deal_number}"
    mill_order, _ = MillOrder.objects.update_or_create(
        deal=deal,
        defaults={
            'order_number': mo_num,
            'date': deal.date,
            'company_contact': mill,
            'buyer_contact': buyer,
            'product': product,
            'quantity': deal.quantity,
            'quantity_unit': deal.quantity_unit,
            'rate': deal.rate,
            'rate_unit': deal.rate_unit,
            'status': deal.delivery_status or 'Pending',
            'whatsapp_message_mill': msg_mill,
            'whatsapp_message_buyer': msg_buyer,
        }
    )

    # 2. Pending Order
    PendingOrder.objects.update_or_create(
        deal=deal,
        defaults={
            'company_contact': mill,
            'company_name': mill.name,
            'buyer_contact': buyer,
            'party_name': buyer.name,
            'city': buyer.city or '',
            'product': product,
            'product_name': product.name,
            'broker': 'JALARAM',
            'order_date': deal.date,
            'rate': deal.rate,
            'rate_unit': deal.rate_unit,
            'order_quantity': deal.quantity,
            'pending_quantity': deal.quantity,
            'quantity_unit': deal.quantity_unit,
            'status': deal.delivery_status or 'Pending',
        }
    )

    # 3. Product Auto-Mapping
    is_new_mapping = False
    mapping = PartyProductMapping.objects.filter(buyer_contact=buyer, product=product).first()
    if not mapping:
        PartyProductMapping.objects.create(
            buyer_contact=buyer,
            product=product,
            first_deal_date=deal.date,
            last_deal_date=deal.date,
            last_rate=deal.rate,
            last_rate_unit=deal.rate_unit,
            total_deals_count=1,
            total_quantity=deal.quantity,
        )
        is_new_mapping = True
    else:
        mapping.last_deal_date = deal.date
        mapping.last_rate = deal.rate
        mapping.last_rate_unit = deal.rate_unit
        mapping.total_deals_count += 1
        mapping.total_quantity += deal.quantity
        mapping.save()

    # 4. Target actual update (stored and shown in the exact unit used in the deal)
    month_key = deal.date.strftime('%Y-%m') if hasattr(deal.date, 'strftime') else str(deal.date)[:7]
    deal_unit = deal.quantity_unit or 'BAG'
    target, _ = PartyProductTarget.objects.get_or_create(
        buyer_contact=buyer,
        product=product,
        month_str=month_key,
        target_unit=deal_unit,
        defaults={
            'target_quantity': Decimal('0.00'),
            'actual_quantity': Decimal('0.00'),
        }
    )
    month_actual = Deal.objects.filter(
        buyer_contact=buyer,
        product=product,
        quantity_unit=deal_unit,
        date__year=deal.date.year,
        date__month=deal.date.month,
    ).aggregate(models.Sum('quantity'))['quantity__sum'] or 0
    target.actual_quantity = Decimal(str(month_actual))
    target.save()

    return {
        'mill_order_number': mill_order.order_number,
        'new_product_alert': is_new_mapping,
        'alert_message': f"New Product Alert: Buyer '{buyer.name}' purchased '{product.name}' for the FIRST time!" if is_new_mapping else "",
        'target_actual': float(target.actual_quantity),
        'target_goal': float(target.target_quantity),
        'target_unit': target.target_unit,
        'whatsapp_message_mill': msg_mill,
        'whatsapp_message_buyer': msg_buyer,
    }


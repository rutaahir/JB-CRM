from django.db import models
from django.utils import timezone
from decimal import Decimal
from sellers.models import Seller
from buyers.models import Buyer
from deals.models import Deal

class RecoveryRecord(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending / બાકી'),
        ('PARTIAL', 'Partial / અંશતઃ ચૂકવેલ'),
        ('PAID', 'Paid / ચૂકતે થયેલ'),
    ]

    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='recoveries', verbose_name="Linked Sauda Deal")
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE, related_name='recoveries', null=True, blank=True, verbose_name="Seller / Mill")
    seller_name = models.CharField(max_length=255, verbose_name="Seller Company Name")

    buyer = models.ForeignKey(Buyer, on_delete=models.SET_NULL, null=True, blank=True, related_name='recoveries', verbose_name="Buyer / Party")
    buyer_name = models.CharField(max_length=255, verbose_name="Buyer Party Name")
    buyer_city = models.CharField(max_length=150, blank=True, default='', verbose_name="Buyer City")
    buyer_phone = models.CharField(max_length=30, blank=True, default='', verbose_name="Buyer Phone")

    bill_number = models.CharField(max_length=100, verbose_name="Bill / Invoice Number")
    bill_date = models.DateField(default=timezone.now, verbose_name="Bill Date")
    due_days = models.IntegerField(default=15, verbose_name="Credit Due Days")
    due_date = models.DateField(null=True, blank=True, verbose_name="Payment Due Date")

    billed_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Original Billed Amount (₹)")
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Current Balance Outstanding (₹)")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="Recovery Status")
    assigned_staff = models.CharField(max_length=150, blank=True, default='', verbose_name="Assigned Staff")
    notes = models.TextField(blank=True, default='', verbose_name="Remarks / Item Details")

    statement = models.ForeignKey('statements.UploadedStatement', on_delete=models.SET_NULL, null=True, blank=True, related_name='recovery_records', verbose_name="Imported From Statement")
    last_reminder_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Last WhatsApp Reminder Sent At")
    reminder_count = models.IntegerField(default=0, verbose_name="Follow-up Reminder Count")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-bill_date', '-id']
        verbose_name = "Recovery Bill"
        verbose_name_plural = "Recovery Bills"

    def __str__(self):
        return f"{self.buyer_name} - {self.seller_name} ({self.bill_number})"

    @property
    def overdue_days(self):
        if not self.bill_date:
            return 0
        delta = (timezone.now().date() - self.bill_date).days
        return max(0, delta)

    @property
    def is_overdue(self):
        effective_due_days = self.due_days or (self.buyer.credit_days if self.buyer else 15)
        return self.overdue_days >= effective_due_days and self.balance_amount > Decimal('0.00')

    def save(self, *args, **kwargs):
        if self.seller and not self.seller_name:
            self.seller_name = self.seller.company_name
        if self.buyer:
            if not self.buyer_name:
                self.buyer_name = self.buyer.company_name
            if not self.buyer_phone:
                self.buyer_phone = self.buyer.whatsapp or self.buyer.phone
            if not self.due_days and self.buyer.credit_days:
                self.due_days = self.buyer.credit_days

        if self.balance_amount is None:
            self.balance_amount = self.billed_amount

        if self.balance_amount <= Decimal('0.00'):
            self.status = 'PAID'
            self.balance_amount = Decimal('0.00')
        elif self.balance_amount < self.billed_amount:
            self.status = 'PARTIAL'
        else:
            self.status = 'PENDING'

        super().save(*args, **kwargs)


class PaymentReceipt(models.Model):
    PAYMENT_MODE_CHOICES = [
        ('RTGS', 'RTGS / Bank Transfer'),
        ('NEFT', 'NEFT'),
        ('CHEQUE', 'Cheque'),
        ('UPI', 'UPI / Net Banking'),
        ('CASH', 'Cash'),
        ('ADJUSTMENT', 'Discount / Rate Difference / Claim'),
    ]

    recovery = models.ForeignKey(RecoveryRecord, on_delete=models.CASCADE, related_name='payments', verbose_name="Bill Reference")
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Amount Paid (₹)")
    deductions_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Deductions / Claim (₹)")
    deduction_reason = models.CharField(max_length=255, blank=True, default='', verbose_name="Deduction Reason")
    payment_date = models.DateField(default=timezone.now, verbose_name="Payment Date")
    payment_mode = models.CharField(max_length=30, choices=PAYMENT_MODE_CHOICES, default='RTGS', verbose_name="Payment Mode")
    reference_number = models.CharField(max_length=100, blank=True, default='', verbose_name="UTR / Cheque / Txn Number")
    collected_by = models.CharField(max_length=150, blank=True, default='', verbose_name="Collected By")
    notes = models.TextField(blank=True, default='', verbose_name="Remarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-id']
        verbose_name = "Payment Receipt"
        verbose_name_plural = "Payment Receipts"

    def __str__(self):
        return f"₹{self.amount} for {self.recovery.bill_number} on {self.payment_date}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalculate parent recovery balance = billed_amount - (total paid + total deductions)
        aggregates = self.recovery.payments.aggregate(
            total_amt=models.Sum('amount'),
            total_ded=models.Sum('deductions_amount')
        )
        total_settled = (aggregates['total_amt'] or Decimal('0.00')) + (aggregates['total_ded'] or Decimal('0.00'))
        new_balance = max(Decimal('0.00'), self.recovery.billed_amount - total_settled)
        self.recovery.balance_amount = new_balance
        self.recovery.save()

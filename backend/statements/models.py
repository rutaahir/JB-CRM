from django.db import models
from django.utils import timezone
from sellers.models import Seller
from buyers.models import Buyer

class UploadedStatement(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_EXTRACTED = 'EXTRACTED'
    STATUS_SAVED = 'SAVED'
    STATUS_FAILED = 'FAILED'
    STATUS_ROLLED_BACK = 'ROLLED_BACK'

    # Company / Mill relationship (Contact Master first, with legacy fallback)
    company_contact = models.ForeignKey('contacts.Contact', on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_statements', verbose_name="Company / Mill Contact")
    company_name = models.CharField(max_length=255, blank=True, default='', verbose_name="Company / Mill Name")
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_statements')
    seller_name = models.CharField(max_length=255, blank=True, default='')

    file = models.FileField(upload_to='statements/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    file_hash = models.CharField(max_length=64, blank=True, default='', db_index=True, verbose_name="SHA-256 Hash")
    statement_type = models.CharField(max_length=50, default='PENDING_ORDER', verbose_name="Statement Type")
    report_date = models.DateField(default=timezone.now, verbose_name="Report Date")

    raw_text = models.TextField(blank=True, default='')
    extracted_data = models.JSONField(default=list, blank=True, verbose_name="Extracted Rows")
    summary = models.JSONField(default=dict, blank=True, verbose_name="Summary Metrics")
    comparison_data = models.JSONField(default=dict, blank=True, verbose_name="Comparison with Previous Report")

    status = models.CharField(max_length=30, default=STATUS_PENDING)
    error_details = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        c_name = self.company_name or (self.company_contact.name if self.company_contact else self.seller_name or 'Mill')
        return f"{self.filename} ({c_name}) - {self.report_date.strftime('%Y-%m-%d')}"


class PartyAlias(models.Model):
    raw_name = models.CharField(max_length=255, unique=True, db_index=True, verbose_name="Raw Statement Party String")
    contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, null=True, blank=True, related_name='party_aliases', verbose_name="Mapped Contact")
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, null=True, blank=True, related_name='aliases', verbose_name="Mapped Buyer")
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE, null=True, blank=True, related_name='aliases', verbose_name="Mapped Seller")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Party Alias"
        verbose_name_plural = "Party Aliases"
        ordering = ['raw_name']

    def __str__(self):
        target = self.contact.name if self.contact else (self.buyer.company_name if self.buyer else (self.seller.company_name if self.seller else 'Unmapped'))
        return f"{self.raw_name} -> {target}"


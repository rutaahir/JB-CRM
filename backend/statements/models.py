from django.db import models
from sellers.models import Seller
from buyers.models import Buyer

class UploadedStatement(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_EXTRACTED = 'EXTRACTED'
    STATUS_SAVED = 'SAVED'
    STATUS_FAILED = 'FAILED'
    STATUS_ROLLED_BACK = 'ROLLED_BACK'

    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_statements')
    seller_name = models.CharField(max_length=255, blank=True, default='')
    file = models.FileField(upload_to='statements/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField(default=0)
    file_hash = models.CharField(max_length=64, blank=True, default='', db_index=True, verbose_name="SHA-256 Hash")
    statement_type = models.CharField(max_length=50, default='GENERAL')
    raw_text = models.TextField(blank=True, default='')
    extracted_data = models.JSONField(default=list, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, default=STATUS_PENDING)
    error_details = models.TextField(blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.filename} ({self.statement_type}) - {self.uploaded_at.strftime('%Y-%m-%d')}"


class PartyAlias(models.Model):
    raw_name = models.CharField(max_length=255, unique=True, db_index=True, verbose_name="Raw Statement Party String")
    buyer = models.ForeignKey(Buyer, on_delete=models.CASCADE, null=True, blank=True, related_name='aliases', verbose_name="Mapped Buyer")
    seller = models.ForeignKey(Seller, on_delete=models.CASCADE, null=True, blank=True, related_name='aliases', verbose_name="Mapped Seller")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Party Alias"
        verbose_name_plural = "Party Aliases"
        ordering = ['raw_name']

    def __str__(self):
        target = self.buyer.company_name if self.buyer else (self.seller.company_name if self.seller else 'Unmapped')
        return f"{self.raw_name} -> {target}"

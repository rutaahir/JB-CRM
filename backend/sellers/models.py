from django.db import models

class Seller(models.Model):
    company_name = models.CharField(max_length=255, verbose_name="Company Name")
    address = models.TextField(verbose_name="Company Address")
    phone = models.CharField(max_length=20, verbose_name="Phone Number")
    whatsapp = models.CharField(max_length=20, verbose_name="WhatsApp Number")
    email = models.EmailField(verbose_name="Email Address")
    gstin = models.CharField(max_length=15, blank=True, default="", verbose_name="GSTIN")
    pan = models.CharField(max_length=10, blank=True, default="", verbose_name="PAN")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Seller"
        verbose_name_plural = "Sellers"

    def __str__(self):
        return self.company_name

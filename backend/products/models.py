from django.db import models
from sellers.models import Seller

class Category(models.Model):
    name = models.CharField(max_length=150, unique=True, verbose_name="Category Name")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Product(models.Model):
    name = models.CharField(max_length=255, verbose_name="Product Name")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    brand = models.CharField(max_length=150, blank=True, verbose_name="Brand Name")
    description = models.TextField(blank=True, verbose_name="Description")
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="Product Image")
    price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True, verbose_name="Price (INR)")
    price_unit = models.CharField(max_length=50, blank=True, default="Per Quintal", verbose_name="Price Unit")
    packaging = models.CharField(max_length=100, blank=True, default="50 kg Bag", verbose_name="Packaging / Bag Weight")
    protein_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="Protein %")
    seller = models.ForeignKey(Seller, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    is_active = models.BooleanField(default=True, verbose_name="Status Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self):
        return self.name

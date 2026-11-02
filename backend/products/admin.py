from django.contrib import admin
from products.models import Category, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'brand', 'price', 'price_unit', 'packaging', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'brand', 'description')
    ordering = ('-created_at',)

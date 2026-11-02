from rest_framework import serializers
from products.models import Category, Product
from sellers.models import Seller

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'product_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Category name cannot be empty.")
        return val

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    seller_name = serializers.ReadOnlyField(source='seller.company_name')

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'brand',
            'description',
            'image',
            'price',
            'price_unit',
            'packaging',
            'protein_percent',
            'seller',
            'seller_name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_image(self, value):
        if value:
            # Check file size (max 2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Image file size must not exceed 2MB.")
            # Check content type if available
            if hasattr(value, 'content_type') and value.content_type not in ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']:
                raise serializers.ValidationError("Only JPG, PNG, and WEBP image formats are supported.")
        return value


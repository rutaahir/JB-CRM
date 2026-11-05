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
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


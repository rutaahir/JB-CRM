from rest_framework import serializers
from products.models import Category, Product

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
    deals_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'is_active',
            'deals_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'deals_count', 'created_at', 'updated_at']

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("પ્રોડક્ટનું નામ જરૂરી છે (Product name cannot be empty).")
        instance = self.instance
        qs = Product.objects.filter(name__iexact=val)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"પ્રોડક્ટ '{val}' પહેલેથી અસ્તિત્વમાં છે (A product with this name already exists).")
        return val

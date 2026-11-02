import re
from rest_framework import serializers
from sellers.models import Seller
from accounts.serializers import validate_indian_phone

class SellerSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(validators=[validate_indian_phone])
    whatsapp = serializers.CharField(validators=[validate_indian_phone])

    class Meta:
        model = Seller
        fields = ['id', 'company_name', 'address', 'phone', 'whatsapp', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_company_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Company name is required.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        return val


from rest_framework import serializers
from .models import Deal, BrokeragePayment

class BrokeragePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrokeragePayment
        fields = '__all__'
        read_only_fields = ('created_at',)

class DealSerializer(serializers.ModelSerializer):
    brokerage_payments = BrokeragePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ('deal_number', 'created_at', 'updated_at')

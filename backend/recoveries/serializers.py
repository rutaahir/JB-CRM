from rest_framework import serializers
from .models import RecoveryRecord, PaymentReceipt

class PaymentReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReceipt
        fields = '__all__'
        read_only_fields = ('created_at',)

class RecoveryRecordSerializer(serializers.ModelSerializer):
    payments = PaymentReceiptSerializer(many=True, read_only=True)
    overdue_days = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = RecoveryRecord
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

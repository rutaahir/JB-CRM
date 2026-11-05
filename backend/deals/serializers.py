from rest_framework import serializers
from .models import Deal, BrokeragePayment, MillOrder, PendingOrder, PartyProductMapping, PartyProductTarget, sync_deal_side_effects

class BrokeragePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrokeragePayment
        fields = '__all__'
        read_only_fields = ('created_at',)

class MillOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company_contact.name')
    buyer_name = serializers.ReadOnlyField(source='buyer_contact.name')
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = MillOrder
        fields = '__all__'

class PendingOrderSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()
    buyer_name = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    days_pending = serializers.SerializerMethodField()

    class Meta:
        model = PendingOrder
        fields = '__all__'

    def get_company_name(self, obj):
        return obj.company_name or (obj.company_contact.name if obj.company_contact else '')

    def get_buyer_name(self, obj):
        return obj.party_name or (obj.buyer_contact.name if obj.buyer_contact else '')

    def get_product_name(self, obj):
        return obj.product_name or (obj.product.name if obj.product else '')

    def get_days_pending(self, obj):
        if obj.order_date:
            from django.utils import timezone
            return max((timezone.now().date() - obj.order_date).days, 0)
        return 0

class PartyProductMappingSerializer(serializers.ModelSerializer):
    buyer_name = serializers.ReadOnlyField(source='buyer_contact.name')
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = PartyProductMapping
        fields = '__all__'

class PartyProductTargetSerializer(serializers.ModelSerializer):
    buyer_name = serializers.ReadOnlyField(source='buyer_contact.name')
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = PartyProductTarget
        fields = '__all__'

class DealSerializer(serializers.ModelSerializer):
    brokerage_payments = BrokeragePaymentSerializer(many=True, read_only=True)
    company_contact_name = serializers.ReadOnlyField(source='company_contact.name')
    buyer_contact_name = serializers.ReadOnlyField(source='buyer_contact.name')
    product_name_display = serializers.ReadOnlyField(source='product.name')
    mill_order_number = serializers.SerializerMethodField()
    whatsapp_message_mill = serializers.SerializerMethodField()
    whatsapp_message_buyer = serializers.SerializerMethodField()
    side_effects = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ('deal_number', 'created_at', 'updated_at')

    def get_mill_order_number(self, obj):
        if hasattr(obj, 'mill_order'):
            return obj.mill_order.order_number
        return f"MO-{obj.deal_number}" if obj.deal_number else ""

    def get_whatsapp_message_mill(self, obj):
        if hasattr(obj, 'mill_order'):
            return obj.mill_order.whatsapp_message_mill
        return ""

    def get_whatsapp_message_buyer(self, obj):
        if hasattr(obj, 'mill_order'):
            return obj.mill_order.whatsapp_message_buyer
        return ""

    def get_side_effects(self, obj):
        if obj.company_contact and obj.buyer_contact and obj.product:
            return sync_deal_side_effects(obj)
        return {}

from rest_framework import serializers
from .models import Contact

class ContactSerializer(serializers.ModelSerializer):
    code = serializers.CharField(required=False, allow_blank=True)
    has_deals = serializers.SerializerMethodField()
    duplicate_warning = serializers.SerializerMethodField()

    def to_representation(self, instance):
        if hasattr(instance, 'date') and instance.date and hasattr(instance.date, 'date'):
            instance.date = instance.date.date()
        return super().to_representation(instance)

    is_placeholder_mobile = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contact
        fields = [
            'id',
            'code',
            'date',
            'name',
            'party_type',
            'contact_person_1',
            'contact_person_2',
            'mobile_1',
            'mobile_2',
            'phone_office_1',
            'phone_office_2',
            'address',
            'area',
            'city',
            'pin_code',
            'gst_no',
            'pan_no',
            'aadhar_no',
            'email',
            'reference_by',
            'is_active',
            'is_test',
            'is_placeholder_mobile',
            'has_deals',
            'duplicate_warning',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_placeholder_mobile']

    def get_has_deals(self, obj):
        return obj.has_deals()

    def get_duplicate_warning(self, obj):
        # Check if another active contact shares mobile_1
        if not obj.mobile_1:
            return None
        dup = Contact.objects.filter(is_active=True, mobile_1=obj.mobile_1).exclude(id=obj.id).first()
        if dup:
            return {
                "message": f"Mobile {obj.mobile_1} is already registered to '{dup.name}' (Code: {dup.code}).",
                "existing_id": dup.id,
                "existing_name": dup.name,
                "existing_code": dup.code,
            }
        return None

    def validate_code(self, value):
        if not value or not str(value).strip():
            return Contact.get_next_code()
        value = str(value).strip()
        instance = getattr(self, 'instance', None)
        qs = Contact.objects.filter(code=value)
        if instance:
            qs = qs.exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError(f"Party Code '{value}' is already in use.")
        return value

    def create(self, validated_data):
        if not validated_data.get('code'):
            validated_data['code'] = Contact.get_next_code()
        return super().create(validated_data)

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Party / Company Name is required.")
        return value.strip()

    def validate_mobile_1(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Mobile No 1 is required.")
        return value.strip()

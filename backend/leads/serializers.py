from rest_framework import serializers
from .models import Lead, LeadCallHistory
from contacts.models import Contact

class LeadCallHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadCallHistory
        fields = [
            'id',
            'lead',
            'call_date',
            'call_result',
            'rate_discussed',
            'remarks',
            'next_followup_date',
            'staff_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class LeadSerializer(serializers.ModelSerializer):
    call_history = LeadCallHistorySerializer(many=True, read_only=True)
    duplicate_warning = serializers.SerializerMethodField()
    converted_contact_name = serializers.CharField(source='converted_contact.name', read_only=True)
    converted_contact_code = serializers.CharField(source='converted_contact.code', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id',
            'lead_id',
            'party_name',
            'mobile_number',
            'city_village',
            'interested_product',
            'lead_source',
            'assigned_staff_name',
            'status',
            'priority',
            'next_followup_date',
            'discussed_rate',
            'expected_quantity',
            'remarks',
            'converted_contact',
            'converted_contact_name',
            'converted_contact_code',
            'duplicate_warning',
            'call_history',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'lead_id', 'created_at', 'updated_at']

    def get_duplicate_warning(self, obj):
        if not obj.mobile_number:
            return None
        # Check against contacts
        contact_match = Contact.objects.filter(is_active=True, mobile_1=obj.mobile_number).first()
        if contact_match:
            return {
                "source": "contact",
                "message": f"Mobile already exists in Contact Master: '{contact_match.name}' (Code: {contact_match.code})",
                "contact_id": contact_match.id,
                "contact_name": contact_match.name,
                "contact_code": contact_match.code,
            }
        # Check against other leads
        other_lead = Lead.objects.filter(is_active=True, mobile_number=obj.mobile_number).exclude(id=obj.id).first()
        if other_lead:
            return {
                "source": "lead",
                "message": f"Mobile already registered in Lead: '{other_lead.party_name}' ({other_lead.lead_id})",
                "lead_id": other_lead.id,
                "lead_name": other_lead.party_name,
            }
        return None

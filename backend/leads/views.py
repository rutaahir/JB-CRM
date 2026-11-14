import csv
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from datetime import date

from .models import Lead, LeadCallHistory
from .serializers import LeadSerializer, LeadCallHistorySerializer
from contacts.models import Contact

class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = LeadSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['party_name', 'mobile_number', 'city_village', 'interested_product', 'lead_id', 'remarks']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        status_val = params.get('status')
        if status_val and status_val != 'ALL':
            qs = qs.filter(status=status_val)

        priority_val = params.get('priority')
        if priority_val and priority_val != 'ALL':
            qs = qs.filter(priority=priority_val)

        staff = params.get('assigned_staff')
        if staff and staff != 'ALL':
            qs = qs.filter(assigned_staff_name=staff)

        product = params.get('interested_product')
        if product and product != 'ALL':
            qs = qs.filter(interested_product=product)

        filter_type = params.get('filter_type')
        today = date.today()
        if filter_type == 'TODAY':
            qs = qs.filter(next_followup_date=today)
        elif filter_type == 'OVERDUE':
            qs = qs.filter(next_followup_date__lt=today).exclude(status__in=['Converted to Customer', 'Not Interested'])
        elif filter_type == 'UPCOMING':
            qs = qs.filter(next_followup_date__gt=today)

        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = date.today()
        total_leads = Lead.objects.filter(is_active=True).count()
        today_due = Lead.objects.filter(is_active=True, next_followup_date=today).exclude(status__in=['Converted to Customer', 'Not Interested']).count()
        overdue = Lead.objects.filter(is_active=True, next_followup_date__lt=today).exclude(status__in=['Converted to Customer', 'Not Interested']).count()
        converted = Lead.objects.filter(is_active=True, status='Converted to Customer').count()
        hot_leads = Lead.objects.filter(is_active=True, priority='HOT').exclude(status__in=['Converted to Customer', 'Not Interested']).count()

        return Response({
            'total_leads': total_leads,
            'today_due': today_due,
            'overdue': overdue,
            'converted': converted,
            'hot_leads': hot_leads,
        })

    @action(detail=True, methods=['post'], url_path='convert-to-customer')
    def convert_to_customer(self, request, pk=None):
        """
        Converts Lead to Customer Master with 1 click:
        - Creates a new Contact (Party Type: BUYER) using Lead details
        - Marks lead status as 'Converted to Customer'
        - Links lead.converted_contact to the created contact
        - Avoids re-typing name, mobile, city!
        """
        lead = self.get_object()

        # Check if already converted or if contact with this mobile already exists
        existing_contact = Contact.objects.filter(is_active=True, mobile_1=lead.mobile_number).first()
        if not existing_contact:
            # Create new Contact
            next_code = Contact.get_next_code('BUYER')
            contact = Contact.objects.create(
                code=next_code,
                name=lead.party_name,
                party_type=Contact.PartyType.BUYER,
                contact_person_1=lead.party_name,
                mobile_1=lead.mobile_number,
                city=lead.city_village,
                account_group="BALANCE SHEET",
                ac_type="Sundry Debtors",
                layout="Pioneer",
            )
        else:
            contact = existing_contact

        lead.converted_contact = contact
        lead.status = 'Converted to Customer'
        lead.save(update_fields=['converted_contact', 'status', 'updated_at'])

        # Also add a log entry
        LeadCallHistory.objects.create(
            lead=lead,
            call_result='Converted',
            remarks=f"Converted to Customer Master with Code {contact.code} ({contact.name}).",
            staff_name=request.user.name if hasattr(request.user, 'name') and request.user.name else 'Admin'
        )

        return Response({
            'success': True,
            'message': f"Lead successfully converted to Customer '{contact.name}' (Code: {contact.code})!",
            'contact_id': contact.id,
            'contact_code': contact.code,
            'contact_name': contact.name,
            'lead': LeadSerializer(lead).data,
        })

    @action(detail=True, methods=['post'], url_path='log-call')
    def log_call(self, request, pk=None):
        """
        Logs a call activity and updates lead status & next follow-up date.
        """
        lead = self.get_object()
        data = request.data

        call_result = data.get('call_result', 'Interested')
        rate_discussed = data.get('rate_discussed', '')
        remarks = data.get('remarks', '')
        next_followup = data.get('next_followup_date')
        staff = data.get('staff_name') or (request.user.name if hasattr(request.user, 'name') else 'Admin')

        entry = LeadCallHistory.objects.create(
            lead=lead,
            call_result=call_result,
            rate_discussed=rate_discussed,
            remarks=remarks,
            next_followup_date=next_followup if next_followup else None,
            staff_name=staff
        )

        # Update lead
        if next_followup:
            lead.next_followup_date = next_followup
        if call_result == 'Rate Given':
            lead.status = 'Rate Given'
        elif call_result == 'Not Interested':
            lead.status = 'Not Interested'
        elif call_result == 'Converted':
            lead.status = 'Converted to Customer'
        elif call_result == 'Interested':
            lead.status = 'Interested'
        elif call_result == 'Call Back':
            lead.status = 'Follow-up Pending'

        if rate_discussed:
            try:
                from decimal import Decimal
                clean_rate = ''.join(c for c in rate_discussed if c.isdigit() or c == '.')
                if clean_rate:
                    lead.discussed_rate = Decimal(clean_rate)
            except Exception:
                pass

        if remarks:
            lead.remarks = remarks

        lead.save()

        return Response({
            'success': True,
            'message': 'Call history recorded and lead status updated.',
            'lead': LeadSerializer(lead).data,
            'call_entry': LeadCallHistorySerializer(entry).data
        })

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        mobile = request.query_params.get('mobile', '').strip()
        exclude_id = request.query_params.get('exclude_id')
        if not mobile:
            return Response({'is_duplicate': False})

        # Check contact
        contact_match = Contact.objects.filter(is_active=True, mobile_1=mobile).first()
        if contact_match:
            return Response({
                'is_duplicate': True,
                'source': 'contact',
                'message': f"Mobile number already exists in Contact Master: '{contact_match.name}' (Code: {contact_match.code}).",
                'contact_id': contact_match.id,
            })

        # Check lead
        qs = Lead.objects.filter(is_active=True, mobile_number=mobile)
        if exclude_id and exclude_id.isdigit():
            qs = qs.exclude(id=int(exclude_id))
        lead_match = qs.first()
        if lead_match:
            return Response({
                'is_duplicate': True,
                'source': 'lead',
                'message': f"Mobile number already registered in Lead: '{lead_match.party_name}' ({lead_match.lead_id}).",
                'lead_id': lead_match.id,
            })

        return Response({'is_duplicate': False})

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        leads = self.get_queryset()

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="Leads_Report_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        response.write(b'\xef\xbb\xbf')

        writer = csv.writer(response)
        writer.writerow([
            'Lead ID',
            'Party Name',
            'Mobile',
            'City / Village',
            'Interested Product',
            'Lead Source',
            'Assigned Staff',
            'Status',
            'Priority',
            'Next Follow-up',
            'Discussed Rate',
            'Expected Qty',
            'Remarks',
            'Created Date'
        ])

        for l in leads:
            writer.writerow([
                l.lead_id,
                l.party_name,
                l.mobile_number,
                l.city_village,
                l.interested_product,
                l.lead_source,
                l.assigned_staff_name,
                l.status,
                l.priority,
                l.next_followup_date or '',
                l.discussed_rate or '',
                l.expected_quantity or '',
                l.remarks or '',
                l.created_at.strftime('%d-%m-%Y')
            ])

        return response

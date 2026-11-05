from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from rest_framework.pagination import PageNumberPagination
from .models import Contact
from .serializers import ContactSerializer
from buyers.models import Buyer
from sellers.models import Seller

class StandardPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.filter(is_active=True).order_by('code')
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['party_type', 'city']
    search_fields = ['code', 'name', 'mobile_1', 'mobile_2', 'city', 'contact_person_1']
    ordering_fields = ['code', 'name', 'date', 'city', 'created_at']
    ordering = ['code']

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        if instance.has_deals():
            raise ValidationError(
                "Cannot delete contact: Active Sauda Deals exist for this party in the Sauda Register."
            )
        # Real soft delete
        instance.is_active = False
        instance.save(update_fields=['is_active'])

    @action(detail=False, methods=['get'], url_path='next-code')
    def next_code(self, request):
        party_type = request.query_params.get('party_type', 'BUYER')
        code = Contact.get_next_code(party_type=party_type)
        return Response({'next_code': code})

    @action(detail=False, methods=['get'], url_path='check-mobile')
    def check_mobile(self, request):
        mobile = request.query_params.get('mobile', '').strip()
        exclude_id = request.query_params.get('exclude_id')
        if not mobile:
            return Response({'is_duplicate': False})

        qs = Contact.objects.filter(is_active=True, mobile_1=mobile)
        if exclude_id and exclude_id.isdigit():
            qs = qs.exclude(id=int(exclude_id))

        existing = qs.first()
        if existing:
            return Response({
                'is_duplicate': True,
                'message': f"Mobile {mobile} is already registered to '{existing.name}' (Code: {existing.code}).",
                'existing_id': existing.id,
                'existing_name': existing.name,
                'existing_code': existing.code,
            })
        return Response({'is_duplicate': False})

    @action(detail=False, methods=['get'], url_path='nav-records')
    def nav_records(self, request):
        current_code = request.query_params.get('code', '').strip()
        active_contacts = list(Contact.objects.filter(is_active=True).order_by('code').values('id', 'code'))
        if not active_contacts:
            return Response({'first_id': None, 'prev_id': None, 'next_id': None, 'last_id': None})

        first_id = active_contacts[0]['id']
        last_id = active_contacts[-1]['id']

        current_idx = -1
        for idx, item in enumerate(active_contacts):
            if str(item['code']) == current_code:
                current_idx = idx
                break

        prev_id = None
        next_id = None
        if current_idx != -1:
            if current_idx > 0:
                prev_id = active_contacts[current_idx - 1]['id']
            if current_idx < len(active_contacts) - 1:
                next_id = active_contacts[current_idx + 1]['id']
        else:
            prev_id = first_id
            next_id = last_id

        return Response({
            'first_id': first_id,
            'prev_id': prev_id,
            'next_id': next_id,
            'last_id': last_id,
        })

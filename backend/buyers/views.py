from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from buyers.models import Buyer
from buyers.serializers import BuyerSerializer
from accounts.permissions import IsAdminOrReadOnlyStaff

class BuyerViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Buyers.
    Admins have full write permissions, staff users have read-only access.
    """
    queryset = Buyer.objects.all().order_by('-created_at')
    serializer_class = BuyerSerializer
    permission_classes = [IsAdminOrReadOnlyStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'phone', 'whatsapp', 'email', 'address']
    ordering_fields = ['company_name', 'created_at', 'updated_at']
    ordering = ['-created_at']

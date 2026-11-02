from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from sellers.models import Seller
from sellers.serializers import SellerSerializer
from accounts.permissions import IsAdminOrReadOnlyStaff

class SellerViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Sellers.
    Admins have full write permissions, staff users have read-only access.
    """
    queryset = Seller.objects.all().order_by('-created_at')
    serializer_class = SellerSerializer
    permission_classes = [IsAdminOrReadOnlyStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'phone', 'whatsapp', 'email', 'address']
    ordering_fields = ['company_name', 'created_at', 'updated_at']
    ordering = ['-created_at']

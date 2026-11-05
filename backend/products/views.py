from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from products.models import Category, Product
from products.serializers import CategorySerializer, ProductSerializer
from accounts.permissions import IsAdminOrReadOnlyStaff

class CategoryViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Product Categories.
    Admins have full CRUD, staff users have read-only access.
    """
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnlyStaff]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    pagination_class = None  # Categories are typically a small list, can fetch all for dropdowns

class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Products.
    Admins have full CRUD, staff users have read-only access.
    """
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnlyStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    pagination_class = None

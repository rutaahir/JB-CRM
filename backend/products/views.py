from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django.db.models import Count
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
    CRUD API for Products (Commodities).
    Admins have full CRUD, staff users have read-only access.
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnlyStaff]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    pagination_class = None

    def get_queryset(self):
        return Product.objects.all().annotate(deals_count=Count('deals')).order_by('name')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        deals_count = instance.deals.count() if hasattr(instance, 'deals') else 0
        if deals_count > 0:
            return Response(
                {
                    "detail": f"Cannot delete product '{instance.name}' because {deals_count} deal(s) are associated with it. You can set it to Inactive instead."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

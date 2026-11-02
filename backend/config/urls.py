from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from accounts.views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    CurrentUserView,
    LogoutView,
    StaffViewSet,
)
from sellers.views import SellerViewSet
from buyers.views import BuyerViewSet
from products.views import CategoryViewSet, ProductViewSet
from dashboard.views import DashboardStatsView
from deals.views import DealViewSet
from recoveries.views import RecoveryRecordViewSet, PaymentReceiptViewSet
from statements.views import (
    UploadAndExtractStatementView,
    SaveVerifiedRecordsView,
    StatementListView,
    RollbackStatementView,
    PartyAliasView,
)

router = DefaultRouter()
router.register(r'sellers', SellerViewSet, basename='seller')
router.register(r'buyers', BuyerViewSet, basename='buyer')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'recoveries', RecoveryRecordViewSet, basename='recovery')
router.register(r'payments', PaymentReceiptViewSet, basename='payment')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth endpoints
    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),

    # Dashboard endpoint
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # Statements & PDF Extractor endpoints
    path('api/statements/upload/', UploadAndExtractStatementView.as_view(), name='statement_upload'),
    path('api/statements/save-verified/<int:pk>/', SaveVerifiedRecordsView.as_view(), name='statement_save_verified'),
    path('api/statements/<int:pk>/rollback/', RollbackStatementView.as_view(), name='statement_rollback'),
    path('api/statements/aliases/', PartyAliasView.as_view(), name='statement_aliases'),
    path('api/statements/', StatementListView.as_view(), name='statement_list'),

    # API resources
    path('api/', include(router.urls)),

    # Spectacular API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

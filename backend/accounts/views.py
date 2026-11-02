from rest_framework import status, viewsets, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from accounts.models import User
from accounts.serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    UserSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
)
from accounts.permissions import IsAdminRole

from drf_spectacular.utils import extend_schema

User = get_user_model()

class LoginThrottle(ScopedRateThrottle):
    scope = 'login'

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer
    permission_classes = [AllowAny]

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class LogoutSerializer(serializers.Serializer):
    detail = serializers.CharField(default="Successfully logged out.")

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={200: LogoutSerializer})
    def post(self, request):
        # JWT client will discard tokens.
        return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class StaffViewSet(viewsets.ModelViewSet):
    """
    Staff management viewset: only Admin can access.
    """
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.STAFF).order_by('-created_at')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'email', 'created_at', 'is_active']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StaffUpdateSerializer
        return UserSerializer

    @action(detail=True, methods=['patch'], url_path='toggle-access')
    def toggle_access(self, request, pk=None):
        staff_member = self.get_object()
        staff_member.is_active = not staff_member.is_active
        staff_member.save(update_fields=['is_active', 'updated_at'])
        return Response({
            "message": f"Login access for {staff_member.name} {'enabled' if staff_member.is_active else 'disabled'}.",
            "user": UserSerializer(staff_member).data
        }, status=status.HTTP_200_OK)

from rest_framework import status, viewsets, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, StaffLoginRequest
from accounts.serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    UserSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
    StaffLoginRequestSerializer,
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

class LoginApprovalCheckView(APIView):
    """
    Polling endpoint for staff waiting screen on login page.
    Anyone with a valid request_token can poll the status.
    When APPROVED, returns the JWT access & refresh tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('request_token', '').strip()
        if not token:
            return Response({'detail': 'request_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        login_req = StaffLoginRequest.objects.filter(request_token=token).select_related('user').first()
        if not login_req:
            return Response({'detail': 'Invalid or expired login request.'}, status=status.HTTP_404_NOT_FOUND)

        user = login_req.user
        if not user.is_active:
            return Response({
                'status': 'REJECTED',
                'message': 'Your account has been deactivated by the administrator.'
            }, status=status.HTTP_403_FORBIDDEN)

        if login_req.status == StaffLoginRequest.Status.PENDING:
            return Response({
                'status': 'PENDING',
                'message': 'Waiting for Admin approval...'
            }, status=status.HTTP_200_OK)

        elif login_req.status == StaffLoginRequest.Status.REJECTED:
            return Response({
                'status': 'REJECTED',
                'message': login_req.rejection_reason or 'Login request was rejected by Admin.'
            }, status=status.HTTP_200_OK)

        elif login_req.status == StaffLoginRequest.Status.APPROVED:
            refresh = RefreshToken.for_user(user)
            refresh['email'] = user.email
            refresh['role'] = user.role
            refresh['name'] = user.name

            login_req.is_consumed = True
            login_req.save(update_fields=['is_consumed', 'updated_at'])

            return Response({
                'status': 'APPROVED',
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'phone': user.phone,
                    'role': user.role,
                    'is_active': user.is_active,
                    'require_login_approval': getattr(user, 'require_login_approval', True),
                }
            }, status=status.HTTP_200_OK)

        return Response({'status': login_req.status}, status=status.HTTP_200_OK)

class StaffViewSet(viewsets.ModelViewSet):
    """
    Staff management viewset: only Admin can access.
    Admin can create, view, update, delete staff members,
    toggle login access, and toggle login approval requirement.
    """
    permission_classes = [IsAdminRole]
    queryset = User.objects.filter(role=User.Role.STAFF).order_by('-created_at')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'email', 'created_at', 'is_active', 'require_login_approval']
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

    @action(detail=True, methods=['patch'], url_path='toggle-approval')
    def toggle_approval(self, request, pk=None):
        staff_member = self.get_object()
        staff_member.require_login_approval = not staff_member.require_login_approval
        staff_member.save(update_fields=['require_login_approval', 'updated_at'])
        return Response({
            "message": f"Login approval requirement for {staff_member.name} {'enabled (Admin approval required)' if staff_member.require_login_approval else 'disabled (Direct login allowed)'}.",
            "user": UserSerializer(staff_member).data
        }, status=status.HTTP_200_OK)

class StaffLoginRequestViewSet(viewsets.ModelViewSet):
    """
    Admin management for Staff Login Approval Requests.
    Admin can view, approve, reject staff login requests.
    """
    permission_classes = [IsAdminRole]
    queryset = StaffLoginRequest.objects.all().select_related('user', 'reviewed_by').order_by('-created_at')
    serializer_class = StaffLoginRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['user__name', 'user__email', 'user__phone', 'ip_address']
    ordering_fields = ['created_at', 'status']

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        login_req = self.get_object()
        login_req.status = StaffLoginRequest.Status.APPROVED
        login_req.reviewed_by = request.user
        login_req.reviewed_at = timezone.now()
        login_req.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response({
            "message": f"Login approved for staff member {login_req.user.name}.",
            "request": StaffLoginRequestSerializer(login_req).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        login_req = self.get_object()
        reason = request.data.get('reason', 'Rejected by Admin')
        login_req.status = StaffLoginRequest.Status.REJECTED
        login_req.rejection_reason = reason
        login_req.reviewed_by = request.user
        login_req.reviewed_at = timezone.now()
        login_req.save(update_fields=['status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response({
            "message": f"Login rejected for staff member {login_req.user.name}.",
            "request": StaffLoginRequestSerializer(login_req).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pending-count')
    def pending_count(self, request):
        count = StaffLoginRequest.objects.filter(status=StaffLoginRequest.Status.PENDING).count()
        return Response({"pending_count": count}, status=status.HTTP_200_OK)

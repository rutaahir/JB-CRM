import re
import uuid
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from accounts.exceptions import AccountDisabledException
from accounts.models import StaffLoginRequest

User = get_user_model()

def validate_indian_phone(value):
    if not value:
        return value
    # Remove any spaces, dashes, or +91
    cleaned = re.sub(r'[\s\-\+]', '', str(value))
    if cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    if not re.match(r'^\d{10}$', cleaned):
        raise serializers.ValidationError("Must be a valid 10-digit mobile number.")
    return cleaned

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        if not email or not password:
            raise serializers.ValidationError({"detail": "Must include 'email' and 'password'."})

        user = User.objects.filter(email__iexact=email).first()

        if user:
            if user.check_password(password):
                if not user.is_active:
                    raise AccountDisabledException(
                        detail="Your access has been disabled by the administrator. Please contact admin.",
                        code="account_disabled"
                    )
            else:
                raise serializers.ValidationError({"detail": "Invalid credentials. Please verify your email and password."})
        else:
            raise serializers.ValidationError({"detail": "No account found with this email address."})

        # Check if staff requires Admin login approval
        if user.role == User.Role.STAFF and getattr(user, 'require_login_approval', True):
            request = self.context.get('request')
            ip = ''
            ua = ''
            if request:
                ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
                ua = request.META.get('HTTP_USER_AGENT', '')[:255]

            req_token = uuid.uuid4().hex
            login_req = StaffLoginRequest.objects.create(
                user=user,
                status=StaffLoginRequest.Status.PENDING,
                request_token=req_token,
                ip_address=ip[:50] if ip else '',
                user_agent=ua if ua else ''
            )

            return {
                'approval_required': True,
                'request_id': login_req.id,
                'request_token': req_token,
                'staff_name': user.name,
                'staff_email': user.email,
                'status': 'PENDING',
                'message': 'Login approval request sent to Admin. Please wait for Admin approval.'
            }

        # Generate tokens for Admin or exempt staff
        refresh = RefreshToken.for_user(user)
        refresh['email'] = user.email
        refresh['role'] = user.role
        refresh['name'] = user.name

        return {
            'approval_required': False,
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
        }

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Verify the user is still active in DB
        refresh = RefreshToken(attrs['refresh'])
        user_id = refresh.payload.get('user_id')
        user = User.objects.filter(id=user_id).first()
        if not user or not user.is_active:
            raise AccountDisabledException(
                detail="Your access has been disabled by the administrator. Please contact admin.",
                code="account_disabled"
            )
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'role', 'is_active', 'require_login_approval', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=True)
    phone = serializers.CharField(validators=[validate_indian_phone], required=True)
    require_login_approval = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'password', 'is_active', 'require_login_approval', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_email(self, value):
        val = value.strip().lower()
        if User.objects.filter(email__iexact=val).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return val

    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data['role'] = User.Role.STAFF
        user = User.objects.create_user(password=password, **validated_data)
        return user

class StaffUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, required=False, allow_blank=True)
    phone = serializers.CharField(validators=[validate_indian_phone], required=True)
    require_login_approval = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'password', 'is_active', 'require_login_approval', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_email(self, value):
        val = value.strip().lower()
        current_id = self.instance.id if self.instance else None
        if User.objects.filter(email__iexact=val).exclude(id=current_id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return val

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class StaffLoginRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    user_email = serializers.ReadOnlyField(source='user.email')
    user_phone = serializers.ReadOnlyField(source='user.phone')
    reviewed_by_name = serializers.ReadOnlyField(source='reviewed_by.name')

    class Meta:
        model = StaffLoginRequest
        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'user_phone',
            'status',
            'request_token',
            'ip_address',
            'user_agent',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'rejection_reason',
            'is_consumed',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'request_token', 'created_at', 'updated_at']


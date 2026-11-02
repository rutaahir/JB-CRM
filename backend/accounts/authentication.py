from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from accounts.exceptions import AccountDisabledException

User = get_user_model()

class ActiveJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that loads the user directly from the database
    on every authenticated request and strictly checks is_active.
    If the user has been deactivated (e.g. by an Admin toggle),
    immediately raises AccountDisabledException (which maps to HTTP 403).
    """
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            # Query the database directly to ensure fresh status
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found", code="user_not_found")

        if not user.is_active:
            raise AccountDisabledException()

        return user

class ActiveJWTOpenApiScheme(OpenApiAuthenticationExtension):
    target_class = 'accounts.authentication.ActiveJWTAuthentication'
    name = 'jwtAuth'

    def get_security_definition(self, auto_schema):
        return {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }

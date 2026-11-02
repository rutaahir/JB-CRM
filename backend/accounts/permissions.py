from rest_framework import permissions

class IsAdminRole(permissions.BasePermission):
    """
    Allows access only to authenticated users who have role ADMIN (or is_superuser)
    and are currently active.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            (request.user.role == 'ADMIN' or request.user.is_superuser)
        )

class IsAdminOrReadOnlyStaff(permissions.BasePermission):
    """
    Allows full CRUD access to ADMIN users, and safe read-only access (GET, HEAD, OPTIONS)
    to active STAFF users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return request.user.role == 'ADMIN' or request.user.is_superuser


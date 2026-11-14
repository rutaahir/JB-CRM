from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email).lower()
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, name=name, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, name, password, **extra_fields)

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        STAFF = 'STAFF', 'Staff'

    username = None
    email = models.EmailField(unique=True, verbose_name='Email Address')
    name = models.CharField(max_length=150, verbose_name='Full Name')
    phone = models.CharField(max_length=15, blank=True, verbose_name='Phone Number')
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STAFF,
        verbose_name='Role'
    )
    is_active = models.BooleanField(default=True, verbose_name='Login Access Active')
    require_login_approval = models.BooleanField(default=True, verbose_name='Require Login Approval')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.name} ({self.email}) - {self.role}"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser


class StaffLoginRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending Approval'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        EXPIRED = 'EXPIRED', 'Expired'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_requests', verbose_name='Staff Member')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING, db_index=True)
    request_token = models.CharField(max_length=64, unique=True, db_index=True)
    ip_address = models.CharField(max_length=50, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_login_requests', verbose_name='Reviewed By')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    is_consumed = models.BooleanField(default=False, help_text="True after staff gets authenticated token")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Staff Login Request'
        verbose_name_plural = 'Staff Login Requests'

    def __str__(self):
        return f"{self.user.name} ({self.status}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

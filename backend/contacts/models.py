from django.db import models
from django.utils import timezone

class Contact(models.Model):
    class PartyType(models.TextChoices):
        BUYER = 'BUYER', 'Buyer'
        COMPANY_MILL = 'COMPANY_MILL', 'Company-Mill'

    code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Party Code / ID")
    date = models.DateField(default=timezone.localdate, verbose_name="Date")
    name = models.CharField(max_length=255, verbose_name="Name")
    party_type = models.CharField(
        max_length=20,
        choices=PartyType.choices,
        default=PartyType.BUYER,
        verbose_name="Party Type"
    )
    contact_person_1 = models.CharField(max_length=150, blank=True, default="", verbose_name="Contact Person 1")
    contact_person_2 = models.CharField(max_length=150, blank=True, default="", verbose_name="Contact Person 2")
    mobile_1 = models.CharField(max_length=30, verbose_name="Mobile No 1")
    mobile_2 = models.CharField(max_length=30, blank=True, default="", verbose_name="Mobile No 2")
    phone_office_1 = models.CharField(max_length=30, blank=True, default="", verbose_name="Phone Office 1")
    phone_office_2 = models.CharField(max_length=30, blank=True, default="", verbose_name="Phone Office 2")
    address = models.TextField(blank=True, default="", verbose_name="Address")
    area = models.CharField(max_length=150, blank=True, default="", verbose_name="Area")
    city = models.CharField(max_length=150, blank=True, default="", verbose_name="City")
    pin_code = models.CharField(max_length=20, blank=True, default="", verbose_name="PIN Code")
    gst_no = models.CharField(max_length=30, blank=True, default="", verbose_name="GST No")
    pan_no = models.CharField(max_length=20, blank=True, default="", verbose_name="PAN No")
    aadhar_no = models.CharField(max_length=30, blank=True, default="", verbose_name="Aadhar No")
    email = models.EmailField(blank=True, default="", verbose_name="Email")
    reference_by = models.CharField(max_length=150, blank=True, default="", verbose_name="Reference By")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    is_test = models.BooleanField(default=False, db_index=True, verbose_name="Is Test Record")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name = "Contact Master"
        verbose_name_plural = "Contact Masters"

    def __str__(self):
        return f"{self.code} - {self.name} ({self.get_party_type_display()})"

    @classmethod
    def get_next_code(cls):
        """
        Auto-generates sequential numeric Code across all contacts (e.g. 7001, 7002...).
        All contacts share one unified continuous code scheme regardless of party type.
        """
        existing_codes = cls.objects.values_list('code', flat=True)
        numeric_codes = []
        for c in existing_codes:
            clean = ''.join(filter(str.isdigit, str(c)))
            if clean:
                try:
                    numeric_codes.append(int(clean))
                except ValueError:
                    pass
        if numeric_codes:
            next_num = max(numeric_codes) + 1
        else:
            next_num = 7001
        return str(next_num)

    PLACEHOLDER_MOBILES = {'9898000000', '1414141414', '9999999999', '0000000000', '1212121212'}

    @property
    def is_placeholder_mobile(self):
        m = (self.mobile_1 or '').strip()
        digits = ''.join(filter(str.isdigit, m))
        if digits.startswith('91') and len(digits) == 12:
            digits = digits[2:]
        if not digits or len(digits) < 10 or digits in self.PLACEHOLDER_MOBILES or digits.startswith('9876'):
            return True
        return False

    def has_deals(self):
        """
        Check if contact has deals as buyer or company/mill directly.
        """
        from deals.models import Deal
        from django.db.models import Q
        return Deal.objects.filter(
            Q(buyer_contact=self) | Q(company_contact=self)
        ).exists()

    def save(self, *args, **kwargs):
        if not self.code or not str(self.code).strip():
            self.code = self.get_next_code()
        super().save(*args, **kwargs)

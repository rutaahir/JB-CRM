from django.db import models
from django.utils import timezone
from decimal import Decimal
from contacts.models import Contact

class Lead(models.Model):
    STATUS_CHOICES = [
        ('New Lead', 'New Lead / નવી ઇન્ક્વાયરી'),
        ('Interested', 'Interested / રસ ધરાવે છે'),
        ('Rate Given', 'Rate Given / ભાવ આપ્યો'),
        ('Follow-up Pending', 'Follow-up Pending / ફોલો-અપ બાકી'),
        ('Converted to Customer', 'Converted to Customer / ગ્રાહક બની ગયા'),
        ('Not Interested', 'Not Interested / રસ નથી'),
    ]

    SOURCE_CHOICES = [
        ('Phone Call', 'Phone Call / ફોન'),
        ('WhatsApp', 'WhatsApp'),
        ('Reference', 'Reference / રેફરન્સ'),
        ('Field Visit', 'Field Visit / રૂબરૂ'),
        ('Other', 'Other / અન્ય'),
    ]

    PRIORITY_CHOICES = [
        ('HOT', 'Hot / અતિ મહત્વનું'),
        ('WARM', 'Warm / સામાન્ય'),
        ('COLD', 'Cold / ઓછું મહત્વનું'),
    ]

    lead_id = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Lead ID")
    party_name = models.CharField(max_length=255, verbose_name="Party / Trader Name")
    mobile_number = models.CharField(max_length=30, db_index=True, verbose_name="Mobile Number")
    city_village = models.CharField(max_length=150, blank=True, default="", verbose_name="City / Village")
    interested_product = models.CharField(max_length=150, blank=True, default="Kapas Khol", verbose_name="Interested Product")
    lead_source = models.CharField(max_length=50, choices=SOURCE_CHOICES, default='Phone Call', verbose_name="Lead Source")
    assigned_staff_name = models.CharField(max_length=150, blank=True, default="Admin", verbose_name="Assigned Staff")
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='New Lead', verbose_name="Lead Status")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='WARM', verbose_name="Priority")
    next_followup_date = models.DateField(null=True, blank=True, verbose_name="Next Follow-up Date")
    discussed_rate = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Discussed Rate (₹)")
    expected_quantity = models.CharField(max_length=100, blank=True, default="", verbose_name="Expected Quantity")
    remarks = models.TextField(blank=True, default="", verbose_name="Remarks / Last Discussion")
    
    # Linked contact once converted to party/customer
    converted_contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_leads', verbose_name="Converted Customer Contact")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Lead"
        verbose_name_plural = "Leads"

    def __str__(self):
        return f"{self.lead_id} - {self.party_name} ({self.status})"

    @classmethod
    def get_next_lead_id(cls):
        year = timezone.now().year
        prefix = f"LD-{year}-"
        last_lead = cls.objects.filter(lead_id__startswith=prefix).order_by('-id').first()
        if last_lead:
            try:
                seq = int(last_lead.lead_id.replace(prefix, '')) + 1
            except ValueError:
                seq = cls.objects.count() + 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"

    def save(self, *args, **kwargs):
        if not self.lead_id:
            self.lead_id = self.get_next_lead_id()
        super().save(*args, **kwargs)


class LeadCallHistory(models.Model):
    RESULT_CHOICES = [
        ('Interested', 'Interested / રસ ધરાવે છે'),
        ('Rate Given', 'Rate Given / ભાવ આપ્યો'),
        ('Call Back', 'Call Back / ફરી ફોન કરવો'),
        ('Not Interested', 'Not Interested / રસ નથી'),
        ('Converted', 'Converted to Deal / સોદો થયો'),
    ]

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='call_history', verbose_name="Lead")
    call_date = models.DateTimeField(default=timezone.now, verbose_name="Call Date & Time")
    call_result = models.CharField(max_length=50, choices=RESULT_CHOICES, default='Interested', verbose_name="Call Result")
    rate_discussed = models.CharField(max_length=100, blank=True, default="", verbose_name="Rate Discussed")
    remarks = models.TextField(blank=True, default="", verbose_name="Discussion / Notes")
    next_followup_date = models.DateField(null=True, blank=True, verbose_name="Next Follow-up Date")
    staff_name = models.CharField(max_length=150, blank=True, default="", verbose_name="Staff Name")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-call_date', '-id']
        verbose_name = "Lead Call History"
        verbose_name_plural = "Lead Call Histories"

    def __str__(self):
        return f"Call for {self.lead.party_name} on {self.call_date.strftime('%d-%m-%Y')} ({self.call_result})"

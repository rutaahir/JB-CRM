import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from sellers.models import Seller
from buyers.models import Buyer
from products.models import Category, Product
from contacts.models import Contact
from deals.models import Deal, PartyProductMapping, PartyProductTarget, sync_deal_side_effects
import datetime
from decimal import Decimal

User = get_user_model()

def create_sample_image(text, bg_color, accent_color):
    """Generate a clean product image placeholder with texture and label"""
    img = Image.new('RGB', (600, 400), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw some grid/speckle pattern to resemble grains/cakes/feed
    import random
    rng = random.Random(abs(hash(text)))
    for _ in range(80):
        x = rng.randint(10, 590)
        y = rng.randint(10, 390)
        r = rng.randint(4, 25)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=accent_color)

    # Draw card overlay
    draw.rectangle([40, 280, 560, 360], fill=(255, 255, 255, 220))
    # Simple outline
    draw.rectangle([40, 280, 560, 360], outline=(40, 40, 40), width=2)

    # Save to buffer
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=85)
    return ContentFile(buf.getvalue(), name=f"{text.lower().replace(' ', '_')[:20]}.jpg")

class Command(BaseCommand):
    help = "Seed database with initial Admin, Staff, Categories, Sellers, Buyers, and Products"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Beginning data seeding..."))

        # 1. Admin User
        admin_email = "admin@jalarambroker.com"
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "name": "Admin",
                "phone": "9876500000",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            }
        )
        try:
            from decouple import config
            admin_pwd = config("DJANGO_ADMIN_PASSWORD", default=os.environ.get("DJANGO_ADMIN_PASSWORD", None))
        except Exception:
            admin_pwd = os.environ.get("DJANGO_ADMIN_PASSWORD")
        if not admin_pwd:
            raise ValueError("DJANGO_ADMIN_PASSWORD environment variable is required and must not be empty.")
        admin.set_password(admin_pwd)
        admin.role = User.Role.ADMIN
        admin.is_active = True
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        self.stdout.write(self.style.SUCCESS(f"Admin user ready: {admin_email}"))

        # 2. Staff Users
        staff_data = [
            ("Rahul Patel", "9876543210", "rahul@gmail.com", True),
            ("Priya Shah", "9876123456", "priya@gmail.com", True),
            ("Amit Desai", "9876987654", "amit@gmail.com", False),
            ("Neha Joshi", "9876456789", "neha@gmail.com", True),
            ("Suresh Verma", "9876098765", "suresh@gmail.com", True),
            ("Kavita Dave", "9876112233", "kavita@gmail.com", True),
        ]
        for name, phone, email, is_act in staff_data:
            st, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "name": name,
                    "phone": phone,
                    "role": User.Role.STAFF,
                    "is_active": is_act
                }
            )
            st.set_password("Staff@123")
            st.is_active = is_act
            st.role = User.Role.STAFF
            st.save()
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(staff_data)} staff accounts."))

        # 3. Categories
        categories_data = [
            "Cotton Seed Oil Cake",
            "Maize Oil Cake",
            "Hominy Feed",
            "Mix Cattlefeed",
            "Pellet",
            "Wheat Bran (ઘઉંનું ભુસુ)",
        ]
        cat_map = {}
        for cat_name in categories_data:
            cat, _ = Category.objects.get_or_create(name=cat_name)
            cat_map[cat_name] = cat
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(cat_map)} categories."))

        # 4. Sellers
        sellers_data = [
            ("Shree Patel Cotton Industries", "Plot 12, GIDC Naroda, Ahmedabad, Gujarat", "9876543210", "9876543210", "patelcotton@gmail.com"),
            ("Kishan Agro Traders", "Near APMC Market, Rajkot, Gujarat", "9876123456", "9876123456", "kishanagro@gmail.com"),
            ("Aditya Oil Cake Suppliers", "Sector 28, GIDC Gandhinagar, Gujarat", "9876987654", "9876987654", "adityaaagro@gmail.com"),
            ("Jay Khodal Agro", "Ring Road, Surat, Gujarat", "9876456789", "9876456789", "jaykhodal@gmail.com"),
            ("Mahadev Feeds", "Highway Road, Mehsana, Gujarat", "9876098765", "9876098765", "mahadevfeeds@gmail.com"),
            ("Shree Ram Cattle Feed", "Bapunagar, Ahmedabad, Gujarat", "9876334455", "9876334455", "shreeramfeed@gmail.com"),
            ("Maruti Agro Industries", "Gondal Road, Rajkot, Gujarat", "9876445566", "9876445566", "marutiagro@gmail.com"),
        ]
        seller_objs = []
        for cname, addr, ph, wa, em in sellers_data:
            s, _ = Seller.objects.get_or_create(
                company_name=cname,
                defaults={"address": addr, "phone": ph, "whatsapp": wa, "email": em}
            )
            seller_objs.append(s)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(seller_objs)} sellers."))

        # 5. Buyers
        buyers_data = [
            ("Gujarat Dairy Farm", "Anand-Sojitra Road, Anand, Gujarat", "9898123456", "9898123456", "gujaratdairy@gmail.com"),
            ("Shree Krishna Foods", "Makarpura GIDC, Vadodara, Gujarat", "9898234567", "9898234567", "krishnafoods@gmail.com"),
            ("Patel Cattle Feed", "Chitra GIDC, Bhavnagar, Gujarat", "9898345678", "9898345678", "patelcattlefeed@gmail.com"),
            ("Om Agro Traders", "Deesa Highway, Palanpur, Gujarat", "9898456789", "9898456789", "omagrotraders@gmail.com"),
            ("Siddhi Vinayak Dairy", "Idar Road, Himmatnagar, Gujarat", "9898567890", "9898567890", "siddhivinayakdairy@gmail.com"),
            ("Radhe Krishna Cattle Feed", "Kalol Highway, Gandhinagar, Gujarat", "9898678901", "9898678901", "radhekrishna@gmail.com"),
            ("Balaji Dairy Products", "GIDC Kabilpore, Navsari, Gujarat", "9898789012", "9898789012", "balajidairy@gmail.com"),
        ]
        buyer_objs = []
        for cname, addr, ph, wa, em in buyers_data:
            b, _ = Buyer.objects.get_or_create(
                company_name=cname,
                defaults={"address": addr, "phone": ph, "whatsapp": wa, "email": em}
            )
            buyer_objs.append(b)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(buyer_objs)} buyers."))

        # 6. Products
        products_data = [
            {
                "name": "Shree Vijay Kapas Khol",
                "category": "Cotton Seed Oil Cake",
                "brand": "Shree Vijay",
                "description": "High quality cotton seed oil cake, rich in protein and suitable for dairy cattle feed.",
                "price": 2350.00,
                "price_unit": "Per Quintal",
                "packaging": "25 kg Bag",
                "protein_percent": 38.0,
                "seller": seller_objs[0],
                "bg_color": (120, 85, 50),
                "accent_color": (85, 55, 30),
            },
            {
                "name": "Shyam 8000 Pellet",
                "category": "Pellet",
                "brand": "Shyam",
                "description": "Premium processed pellet cattle feed formulated for high milk yield and healthy digestion.",
                "price": 2800.00,
                "price_unit": "Per Ton",
                "packaging": "50 kg Bag",
                "protein_percent": 22.0,
                "seller": seller_objs[1],
                "bg_color": (135, 110, 75),
                "accent_color": (100, 75, 45),
            },
            {
                "name": "Maize Oil Cake",
                "category": "Maize Oil Cake",
                "brand": "Royal Maize",
                "description": "Pure dried maize oil cake flakes offering high energy and balanced nutritive profile.",
                "price": None,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 20.0,
                "seller": seller_objs[2],
                "bg_color": (210, 165, 60),
                "accent_color": (170, 125, 30),
            },
            {
                "name": "Wheat Bran (ઘઉંનું ભુસુ)",
                "category": "Wheat Bran (ઘઉંનું ભુસુ)",
                "brand": "Annapurna",
                "description": "Fresh, clean and fine wheat bran (chokar / bhusu) ideal for daily livestock nourishment.",
                "price": 1450.00,
                "price_unit": "Per Quintal",
                "packaging": "25 kg Bag",
                "protein_percent": 14.5,
                "seller": seller_objs[3],
                "bg_color": (195, 170, 120),
                "accent_color": (160, 130, 80),
            },
            {
                "name": "Mix Cattle Feed",
                "category": "Mix Cattlefeed",
                "brand": "Kamdhenu",
                "description": "Scientifically balanced compound cattle feed containing vitamins, minerals, and grains.",
                "price": None,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 18.0,
                "seller": seller_objs[4],
                "bg_color": (110, 100, 80),
                "accent_color": (80, 70, 50),
            },
            {
                "name": "Tirupati Khol Gold",
                "category": "Cotton Seed Oil Cake",
                "brand": "Tirupati",
                "description": "Double filtered cotton seed oil cake with guaranteed minimum 40% crude protein.",
                "price": 2420.00,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 40.0,
                "seller": seller_objs[0],
                "bg_color": (105, 75, 40),
                "accent_color": (75, 50, 25),
            },
            {
                "name": "Shyam Super Pellet 10000",
                "category": "Pellet",
                "brand": "Shyam",
                "description": "Special high fat and protein formulation for superior fat percentage in buffalo milk.",
                "price": 2950.00,
                "price_unit": "Per Ton",
                "packaging": "50 kg Bag",
                "protein_percent": 24.0,
                "seller": seller_objs[1],
                "bg_color": (140, 115, 80),
                "accent_color": (110, 85, 50),
            },
            {
                "name": "Pure Hominy Feed Grade A",
                "category": "Hominy Feed",
                "brand": "Gujarat Agro",
                "description": "Coarse maize by-product feed providing quick metabolizable energy for milch cows.",
                "price": 1650.00,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 12.0,
                "seller": seller_objs[2],
                "bg_color": (220, 185, 90),
                "accent_color": (180, 140, 50),
            },
            {
                "name": "Panchamrut Mix Feed",
                "category": "Mix Cattlefeed",
                "brand": "Panchamrut",
                "description": "Enriched multigrain feed with bypass protein for lactating livestock and breeding cows.",
                "price": 1850.00,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 20.0,
                "seller": seller_objs[3],
                "bg_color": (125, 95, 60),
                "accent_color": (95, 65, 30),
            },
            {
                "name": "Gau Mata Premium Cotton Cake",
                "category": "Cotton Seed Oil Cake",
                "brand": "Gau Mata",
                "description": "Standard grade roasted cotton seed oil cake with high aroma and dairy preference.",
                "price": 2380.00,
                "price_unit": "Per Quintal",
                "packaging": "50 kg Bag",
                "protein_percent": 39.0,
                "seller": seller_objs[4],
                "bg_color": (115, 80, 45),
                "accent_color": (80, 50, 25),
            },
        ]

        commodity_names = [
            "Kapas Khol",
            "Makai Khol",
            "Hominy Feed",
            "Pellet",
            "Mix Cattlefeed",
            "Wheat Bran",
        ]
        for c_name in commodity_names:
            Product.objects.get_or_create(name=c_name, defaults={"is_active": True})

        for pdata in products_data:
            Product.objects.get_or_create(name=pdata["name"], defaults={"is_active": True})

        # 7. Seed Pioneer Desktop Contact Master screenshot party: SHREE DURGA CATTEL FEED (Code 7114)
        c_pioneer, _ = Contact.objects.get_or_create(
            code="7114",
            defaults={
                "name": "SHREE DURGA CATTEL FEED",
                "party_type": Contact.PartyType.BUYER,
                "date": datetime.date(2024, 10, 14),
                "account_group": "BALANCE SHEET",
                "ac_type": "Other",
                "contact_person_1": "LALA BHAI",
                "mobile_1": "7041604000",
                "gst_no": "24AJCPS5513M1Z1",
                "city": "SANDESAR",
                "layout": "Pioneer",
            }
        )

        # 8. Seed Sample Parties requested by Client: ABC Traders & Shree Vijay
        c_buyer, _ = Contact.objects.get_or_create(
            name="ABC Traders",
            defaults={
                "code": "7001",
                "party_type": Contact.PartyType.BUYER,
                "contact_person_1": "Ramesh Bhai",
                "mobile_1": "9825012345",
                "city": "Ahmedabad",
                "account_group": "BALANCE SHEET",
                "ac_type": "Sundry Debtors",
                "layout": "Pioneer",
            }
        )

        c_mill, _ = Contact.objects.get_or_create(
            name="Shree Vijay",
            defaults={
                "code": "7002",
                "party_type": Contact.PartyType.COMPANY_MILL,
                "contact_person_1": "Vijay Bhai",
                "mobile_1": "9825054321",
                "city": "Kadi",
                "account_group": "BALANCE SHEET",
                "ac_type": "Sundry Creditors",
                "layout": "Pioneer",
            }
        )

        # Sync existing buyers and sellers into Contact table if not already present
        for s in Seller.objects.all():
            Contact.objects.get_or_create(
                name=s.company_name,
                defaults={
                    "party_type": Contact.PartyType.COMPANY_MILL,
                    "address": s.address,
                    "mobile_1": s.phone or "9825000000",
                    "email": s.email,
                    "city": "Gujarat",
                }
            )

        for b in Buyer.objects.all():
            Contact.objects.get_or_create(
                name=b.company_name,
                defaults={
                    "party_type": Contact.PartyType.BUYER,
                    "address": b.address,
                    "mobile_1": b.phone or "9825111111",
                    "email": b.email,
                    "city": "Gujarat",
                }
            )

        # 9. Seed Sample Sauda Deal requested by user:
        # Deal Date: 18-10-2026, Buyer: ABC Traders, Company/Mill: Shree Vijay, Product: Kapas Khol
        # Rate: 1250 / BAG, Qty: 100 મણ, Delivery / Payment: Pending
        p_kapas, _ = Product.objects.get_or_create(name="Kapas Khol", defaults={"is_active": True})
        deal_num = "SD-20261018-0001"
        sample_deal, d_created = Deal.objects.get_or_create(
            deal_number=deal_num,
            defaults={
                "date": datetime.date(2026, 10, 18),
                "buyer_contact": c_buyer,
                "buyer_name": c_buyer.name,
                "buyer_city": c_buyer.city,
                "company_contact": c_mill,
                "seller_name": c_mill.name,
                "product": p_kapas,
                "product_name": p_kapas.name,
                "rate": Decimal("1250.00"),
                "rate_unit": "BAG",
                "quantity": 100,
                "quantity_unit": "MAN",
                "delivery_payment_status": "Pending",
                "delivery_status": "Pending",
                "payment_status": "Pending",
            }
        )
        if d_created:
            sync_deal_side_effects(sample_deal)

        # 10. Seed Monthly Target as specified by Client:
        # ABC Traders -> Kapas Khol Target: 500 BAG, Actual: 350 BAG, Remaining: 150 BAG (70%)
        month_current = "2026-10"
        PartyProductTarget.objects.update_or_create(
            buyer_contact=c_buyer,
            product=p_kapas,
            month_str=month_current,
            target_unit="BAG",
            defaults={
                "target_quantity": Decimal("500.00"),
                "actual_quantity": Decimal("350.00"),
            }
        )

        self.stdout.write(self.style.SUCCESS(f"Seeded Pioneer Contact Master (7114), Contacts, Sample Deal & Targets."))
        self.stdout.write(self.style.SUCCESS("All seed data created successfully!"))


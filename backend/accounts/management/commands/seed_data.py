import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from sellers.models import Seller
from buyers.models import Buyer
from products.models import Category, Product

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
        admin.set_password("Admin@123")
        admin.role = User.Role.ADMIN
        admin.is_active = True
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        self.stdout.write(self.style.SUCCESS(f"Admin ready: {admin_email} / Admin@123"))

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

        for pdata in products_data:
            cat = cat_map[pdata["category"]]
            prod, created = Product.objects.get_or_create(
                name=pdata["name"],
                defaults={
                    "category": cat,
                    "brand": pdata["brand"],
                    "description": pdata["description"],
                    "price": pdata["price"],
                    "price_unit": pdata["price_unit"],
                    "packaging": pdata["packaging"],
                    "protein_percent": pdata["protein_percent"],
                    "seller": pdata["seller"],
                    "is_active": True,
                }
            )
            if not prod.image:
                prod.image = create_sample_image(prod.name, pdata["bg_color"], pdata["accent_color"])
                prod.save()

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(products_data)} products."))
        self.stdout.write(self.style.SUCCESS("All seed data created successfully!"))


from django.core.management.base import BaseCommand
from django.db import transaction

from products.models import Category, Product
from users.models import User

DEMO_SELLER_EMAIL = "seller@example.com"

IMAGE_QUERY = "?auto=format&fit=crop&w=600&q=80"

HEADPHONES = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e" + IMAGE_QUERY
CLASSIC_WATCH = "https://images.unsplash.com/photo-1523275335684-37898b6baf30" + IMAGE_QUERY
BAG = "https://images.unsplash.com/photo-1548036328-c9fa89d128fa" + IMAGE_QUERY
SNEAKERS = "https://images.unsplash.com/photo-1542291026-7eec264c27ff" + IMAGE_QUERY
SPORT_WATCH = "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1" + IMAGE_QUERY
LUXURY_WATCH = "https://images.unsplash.com/photo-1523170335258-f5ed11844a49" + IMAGE_QUERY

CATEGORIES = [
    {
        "name": "Electronics",
        "slug": "electronics",
        "description": "Headphones, smart devices and everyday gadgets.",
        "image_url": HEADPHONES,
    },
    {
        "name": "Accessories",
        "slug": "accessories",
        "description": "Watches and small extras that finish an outfit.",
        "image_url": CLASSIC_WATCH,
    },
    {
        "name": "Lifestyle",
        "slug": "lifestyle",
        "description": "Bags and everyday essentials.",
        "image_url": BAG,
    },
    {
        "name": "Fashion",
        "slug": "fashion",
        "description": "Footwear and clothing for every day.",
        "image_url": SNEAKERS,
    },
]

PRODUCTS = [
    {
        "name": "Wireless Headphones",
        "category": "electronics",
        "price": "2490.00",
        "rating": "4.8",
        "stock": 25,
        "image_url": HEADPHONES,
        "description": "Comfortable over-ear wireless headphones with clear sound and long battery life.",
    },
    {
        "name": "Classic Watch",
        "category": "accessories",
        "price": "1850.00",
        "rating": "4.6",
        "stock": 40,
        "image_url": CLASSIC_WATCH,
        "description": "A timeless analog watch with a clean dial that suits both casual and formal wear.",
    },
    {
        "name": "Everyday Bag",
        "category": "lifestyle",
        "price": "1450.00",
        "rating": "4.7",
        "stock": 30,
        "image_url": BAG,
        "description": "A roomy, durable bag for work, study or travel, with plenty of pockets.",
    },
    {
        "name": "Casual Sneakers",
        "category": "fashion",
        "price": "2890.00",
        "rating": "4.9",
        "stock": 18,
        "image_url": SNEAKERS,
        "description": "Lightweight sneakers with a cushioned sole, made for all-day comfort.",
    },
    {
        "name": "Smart Watch",
        "category": "electronics",
        "price": "4590.00",
        "rating": "4.7",
        "stock": 12,
        "image_url": CLASSIC_WATCH,
        "description": "Track your steps, heart rate and notifications from your wrist.",
    },
    {
        "name": "Sport Watch",
        "category": "accessories",
        "price": "2250.00",
        "rating": "4.5",
        "stock": 35,
        "image_url": SPORT_WATCH,
        "description": "A tough, water-resistant watch built for workouts and outdoor days.",
    },
    {
        "name": "Luxury Watch",
        "category": "accessories",
        "price": "5990.00",
        "rating": "4.9",
        "stock": 8,
        "image_url": LUXURY_WATCH,
        "description": "A premium watch with a polished finish and a refined look.",
    },
]


class Command(BaseCommand):
    help = "Create demo categories, a demo seller and sample products. Safe to run again."

    @transaction.atomic
    def handle(self, *args, **options):
        seller, created = User.objects.get_or_create(
            email=DEMO_SELLER_EMAIL,
            defaults={"full_name": "Demo Seller", "role": User.Role.SELLER},
        )

        if created:
            seller.set_unusable_password()
            seller.save()
            self.stdout.write(f"Created demo seller {DEMO_SELLER_EMAIL}")

        categories = {}

        for data in CATEGORIES:
            category, _ = Category.objects.update_or_create(
                slug=data["slug"],
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "image_url": data["image_url"],
                    "is_active": True,
                },
            )
            categories[data["slug"]] = category

        for data in PRODUCTS:
            Product.objects.update_or_create(
                seller=seller,
                name=data["name"],
                defaults={
                    "category": categories[data["category"]],
                    "description": data["description"],
                    "price": data["price"],
                    "rating": data["rating"],
                    "stock": data["stock"],
                    "image_url": data["image_url"],
                    "is_active": True,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(CATEGORIES)} categories and {len(PRODUCTS)} products."
            )
        )
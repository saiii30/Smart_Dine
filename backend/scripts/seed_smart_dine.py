"""
Seed Smart Dine with a branch, admin user, categories, menu, tables, sample inventory.
Run from backend folder: python scripts/seed_smart_dine.py
"""
from __future__ import annotations

import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, engine, Base
from app import models
from app.auth import get_password_hash


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        try:
            db.query(models.User).limit(1).all()
        except Exception as e:  # noqa: BLE001
            print(
                "Database schema mismatch (e.g. legacy TMS tables on the same database).\n"
                "Create a new PostgreSQL database for Smart Dine, or use SQLite by unsetting DATABASE_URL.\n"
                f"Detail: {e}"
            )
            return
        if db.query(models.User).filter(models.User.email == "admin@smartdine.local").first():
            print("Seed already applied (admin exists).")
            return

        b = models.Branch(name="Flagship", address="1 Demo Street")
        db.add(b)
        db.flush()

        admin = models.User(
            email="admin@smartdine.local",
            full_name="Smart Dine Admin",
            hashed_password=get_password_hash("Admin@12345"),
            role=models.DineUserRole.ADMIN.value,
            branch_id=b.id,
        )
        db.add(admin)
        db.flush()

        cats = [
            ("Starters", "Small plates"),
            ("Main Course", "Hearty mains"),
            ("Desserts", "Sweet endings"),
            ("Drinks", "Beverages"),
        ]
        cat_objs = []
        for name, desc in cats:
            c = models.Category(name=name, description=desc)
            db.add(c)
            cat_objs.append(c)
        db.flush()

        menu_data = [
            ("Crispy Lotus Stem", "Starters", 220, True),
            ("Paneer Tikka", "Starters", 280, True),
            ("Chicken Wings", "Starters", 320, False),
            ("Dal Makhani Bowl", "Main Course", 260, True),
            ("Grilled Basa", "Main Course", 420, False),
            ("Chocolate Fondant", "Desserts", 240, True),
            ("Fresh Lime Soda", "Drinks", 90, True),
            ("Cold Coffee", "Drinks", 140, True),
        ]
        cat_by_name = {c.name: c for c in cat_objs}
        for name, cname, price, veg in menu_data:
            db.add(
                models.MenuItem(
                    name=name,
                    description=None,
                    price=float(price),
                    category_id=cat_by_name[cname].id,
                    is_available=True,
                    is_veg=veg,
                )
            )

        for i in range(1, 7):
            db.add(
                models.DiningTable(
                    table_number=f"T{i}",
                    capacity=4 if i % 2 == 0 else 2,
                    zone="Main Hall" if i <= 3 else "Patio",
                    status=models.TableStatus.AVAILABLE.value,
                    qr_token=str(uuid.uuid4()),
                    pos_x=60.0 + (i % 3) * 120,
                    pos_y=60.0 + (i // 3) * 100,
                    branch_id=b.id,
                )
            )

        db.add(
            models.InventoryItem(
                name="Basmati Rice", quantity=40, unit="kg", reorder_level=10, branch_id=b.id
            )
        )
        db.add(
            models.InventoryItem(
                name="Paneer", quantity=8, unit="kg", reorder_level=5, branch_id=b.id
            )
        )
        db.add(models.Supplier(name="Fresh Farms Co", contact_email="orders@freshfarms.example"))

        db.add(
            models.Employee(
                full_name="Alex Waiter",
                role="WAITER",
                email="alex@smartdine.local",
                branch_id=b.id,
            )
        )

        db.commit()
        print("Seed complete. Login: admin@smartdine.local / Admin@12345")
    finally:
        db.close()


if __name__ == "__main__":
    run()

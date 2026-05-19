from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base, engine

class MenuSlot(Base):
    __tablename__ = "menu_slots"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    time_window = Column(String, nullable=False)
    active_days = Column(String, nullable=False)
    
    items = relationship("MenuSlotItem", backref="slot", cascade="all, delete-orphan")

class MenuSlotItem(Base):
    __tablename__ = "menu_slot_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(String, ForeignKey("menu_slots.id", ondelete="CASCADE"))
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"))

# Automatically create tables for schedule if they don't exist
Base.metadata.create_all(bind=engine)
# app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from secrets import token_urlsafe

# Клиент (партнёр)
class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    telegram_token = Column(String, nullable=True)
    payment_provider = Column(String, default="robokassa")
    payment_provider_token = Column(String, nullable=True)
    # Новое поле для статуса
    bot_status = Column(String, default="stopped") 
    bot_secret = Column(String, nullable=True)

    # Отношения
    admin_users = relationship("AdminUser", back_populates="client")
    categories = relationship("Category", back_populates="client")
    products = relationship("Product", back_populates="client")
    payment_configs = relationship("PaymentConfig", back_populates="client")
    orders = relationship("Order", back_populates="client")

# Администратор, привязанный к клиенту
class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    telegram_id = Column(String, nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="admin_users")

# Категории (папки) товаров
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    client = relationship("Client", back_populates="categories")
    children = relationship("Category", backref="parent", remote_side=[id])
    products = relationship("Product", back_populates="category")

# Товары
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String, nullable=False)  # URL изображения/файла
    file_size = Column(Float, default=0)
    price = Column(Float, nullable=False, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    orders = relationship("Order", back_populates="product")
    category = relationship("Category", back_populates="products")
    client = relationship("Client", back_populates="products")

# Настройки платежного провайдера (расширяется позже)
class PaymentConfig(Base):
    __tablename__ = "payment_config"
    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String, unique=True, nullable=False)
    api_key = Column(String, nullable=False)
    extra_config = Column(Text, nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    client = relationship("Client", back_populates="payment_configs")

# Статистика (просмотры, покупки)
class Stat(Base):
    __tablename__ = "stats"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)  # Например, "view", "purchase"
    description = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    status = Column(String, default="pending")  # 🟡 pending, ✅ paid, ❌ failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    client = relationship("Client", back_populates="orders")
    product = relationship("Product", back_populates="orders")




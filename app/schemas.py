from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# Product schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    image_url: Optional[str] = None
    category_id: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None


class Product(ProductBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Cart schemas
class CartItemBase(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItem(CartItemBase):
    id: int
    user_id: int
    added_at: datetime

    class Config:
        from_attributes = True


class CartItemWithProduct(CartItem):
    product: Optional[Product] = None
    subtotal: Optional[float] = None


# Order schemas
class OrderBase(BaseModel):
    shipping_address: str


class OrderCreate(OrderBase):
    pass


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float


class Order(OrderBase):
    id: int
    user_id: int
    total_amount: float
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderWithItems(Order):
    items: List[OrderItemBase] = []


# Response schemas
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class CartSummary(BaseModel):
    items_count: int
    total_amount: float
    items: List[CartItemWithProduct]
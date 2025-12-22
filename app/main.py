import os

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List, Optional

from app import models, crud, schemas
from app.database import get_db, engine


# Создаем таблицы
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Marketplace API", version="1.0.0")
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Настройка статических файлов и шаблонов
static = os.path.join(BASE_DIR, 'static')
templates = os.path.join(BASE_DIR, 'templates')

# Для демонстрации используем фиксированного пользователя
CURRENT_USER_ID = 1


# Главная страница
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# Инициализация тестовых данных
@app.get("/api/init")
def init_data(db: Session = Depends(get_db)):
    # Создаем тестового пользователя
    user = crud.get_user(db, CURRENT_USER_ID)
    if not user:
        user_data = schemas.UserCreate(
            username="demo_user",
            email="demo@example.com",
            full_name="Demo User"
        )
        user = crud.create_user(db, user_data)

    # Создаем категории
    categories = crud.get_categories(db)
    if not categories:
        categories_data = [
            {"name": "Electronics", "description": "Gadgets and devices",
             "image_url": "/static/images/electronics.jpg"},
            {"name": "Clothing", "description": "Fashion and apparel", "image_url": "/static/images/clothing.jpg"},
            {"name": "Books", "description": "Books and magazines", "image_url": "/static/images/books.jpg"},
            {"name": "Home & Kitchen", "description": "Home essentials", "image_url": "/static/images/home.jpg"},
        ]
        for cat_data in categories_data:
            crud.create_category(db, schemas.CategoryCreate(**cat_data))

    # Создаем тестовые продукты
    products = crud.get_products(db, limit=1)
    if not products:
        products_data = [
            {"name": "Smartphone X", "description": "Latest smartphone with amazing features", "price": 799.99,
             "stock": 50, "category_id": 1, "image_url": "/static/images/phone.jpg"},
            {"name": "Laptop Pro", "description": "Powerful laptop for work and play", "price": 1299.99, "stock": 25,
             "category_id": 1, "image_url": "/static/images/laptop.jpg"},
            {"name": "Wireless Headphones", "description": "Noise cancelling headphones", "price": 199.99, "stock": 100,
             "category_id": 1, "image_url": "/static/images/headphones.jpg"},
            {"name": "T-Shirt", "description": "Comfortable cotton t-shirt", "price": 24.99, "stock": 200,
             "category_id": 2, "image_url": "/static/images/tshirt.jpg"},
            {"name": "Jeans", "description": "Classic blue jeans", "price": 59.99, "stock": 75, "category_id": 2,
             "image_url": "/static/images/jeans.jpg"},
            {"name": "Python Cookbook", "description": "Essential Python recipes", "price": 39.99, "stock": 30,
             "category_id": 3, "image_url": "/static/images/python_book.jpg"},
            {"name": "Coffee Maker", "description": "Automatic coffee machine", "price": 89.99, "stock": 40,
             "category_id": 4, "image_url": "/static/images/coffee.jpg"},
            {"name": "Blender", "description": "High-speed kitchen blender", "price": 49.99, "stock": 60,
             "category_id": 4, "image_url": "/static/images/blender.jpg"},
        ]
        for prod_data in products_data:
            crud.create_product(db, schemas.ProductCreate(**prod_data))

    return {"success": True, "message": "Data initialized"}


# User endpoints
@app.get("/api/users/me")
def read_current_user(db: Session = Depends(get_db)):
    user = crud.get_user(db, CURRENT_USER_ID)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# Category endpoints
@app.get("/api/categories/")
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return {"categories": categories}


@app.get("/api/categories/{category_id}")
def read_category(category_id: int, db: Session = Depends(get_db)):
    category = crud.get_category(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


# Product endpoints
@app.get("/api/products/")
def read_products(
        skip: int = 0,
        limit: int = 100,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        db: Session = Depends(get_db)
):
    products = crud.get_products(
        db,
        skip=skip,
        limit=limit,
        category_id=category_id,
        search=search,
        min_price=min_price,
        max_price=max_price
    )
    return {"products": products}


@app.get("/api/products/{product_id}")
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = crud.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# Cart endpoints
@app.get("/api/cart/")
def read_cart(db: Session = Depends(get_db)):
    cart_summary = crud.get_cart_summary(db, CURRENT_USER_ID)
    return cart_summary


@app.post("/api/cart/")
def add_item_to_cart(cart_item: schemas.CartItemCreate, db: Session = Depends(get_db)):
    # Check product stock
    product = crud.get_product(db, cart_item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.stock < cart_item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cart_item_db = crud.add_to_cart(db, CURRENT_USER_ID, cart_item)
    return {"success": True, "message": "Item added to cart", "data": cart_item_db}


@app.put("/api/cart/{cart_item_id}")
def update_cart_item(cart_item_id: int, quantity: int, db: Session = Depends(get_db)):
    cart_item = crud.get_cart_item(db, cart_item_id)
    if not cart_item or cart_item.user_id != CURRENT_USER_ID:
        raise HTTPException(status_code=404, detail="Cart item not found")

    # Check product stock
    product = crud.get_product(db, cart_item.product_id)
    if product and product.stock < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    updated = crud.update_cart_item(db, cart_item_id, quantity)
    if updated:
        return {"success": True, "message": "Cart updated", "data": updated}
    else:
        return {"success": True, "message": "Item removed from cart"}


@app.delete("/api/cart/{cart_item_id}")
def remove_cart_item(cart_item_id: int, db: Session = Depends(get_db)):
    cart_item = crud.get_cart_item(db, cart_item_id)
    if not cart_item or cart_item.user_id != CURRENT_USER_ID:
        raise HTTPException(status_code=404, detail="Cart item not found")

    crud.remove_from_cart(db, cart_item_id)
    return {"success": True, "message": "Item removed from cart"}


@app.delete("/api/cart/")
def clear_cart(db: Session = Depends(get_db)):
    crud.clear_cart(db, CURRENT_USER_ID)
    return {"success": True, "message": "Cart cleared"}


# Order endpoints
@app.post("/api/orders/")
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Check if cart is empty
    cart_summary = crud.get_cart_summary(db, CURRENT_USER_ID)
    if not cart_summary['items']:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Check stock for all items
    for item in cart_summary['items']:
        product = crud.get_product(db, item['product_id'])
        if product.stock < item['quantity']:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

    order_db = crud.create_order(db, CURRENT_USER_ID, order)
    if not order_db:
        raise HTTPException(status_code=400, detail="Failed to create order")

    return {"success": True, "message": "Order created", "data": order_db}


@app.get("/api/orders/")
def read_orders(db: Session = Depends(get_db)):
    orders = crud.get_orders(db, CURRENT_USER_ID)
    return {"orders": orders}


@app.get("/api/orders/{order_id}")
def read_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order or order.user_id != CURRENT_USER_ID:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get order items
    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
    order_dict = order.__dict__.copy()
    order_dict['items'] = [item.to_dict() for item in items]

    return order_dict


# Statistics
@app.get("/api/stats/")
def get_stats(db: Session = Depends(get_db)):
    stats = crud.get_stats(db)
    return stats


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
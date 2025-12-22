from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import User, Category, Product, CartItem, Order, OrderItem
from app import schemas


# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate):
    db_user = User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# Category CRUD
def get_category(db: Session, category_id: int):
    return db.query(Category).filter(Category.id == category_id).first()


def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Category).offset(skip).limit(limit).all()


def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


# Product CRUD
def get_product(db: Session, product_id: int):
    return db.query(Product).filter(Product.id == product_id).first()


def get_products(db: Session, skip: int = 0, limit: int = 100,
                 category_id: int = None, search: str = None,
                 min_price: float = None, max_price: float = None):
    query = db.query(Product).filter(Product.is_active == True)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)

    return query.order_by(Product.created_at.desc()).offset(skip).limit(limit).all()


def create_product(db: Session, product: schemas.ProductCreate):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None

    update_data = product_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return db_product


# Cart CRUD
def get_cart_item(db: Session, cart_item_id: int):
    return db.query(CartItem).filter(CartItem.id == cart_item_id).first()


def get_cart_items(db: Session, user_id: int):
    return db.query(CartItem).filter(CartItem.user_id == user_id).all()


def add_to_cart(db: Session, user_id: int, cart_item: schemas.CartItemCreate):
    # Check if product already in cart
    existing = db.query(CartItem).filter(
        CartItem.user_id == user_id,
        CartItem.product_id == cart_item.product_id
    ).first()

    if existing:
        existing.quantity += cart_item.quantity
        db.commit()
        db.refresh(existing)
        return existing

    # Add new item to cart
    db_cart_item = CartItem(**cart_item.dict(), user_id=user_id)
    db.add(db_cart_item)
    db.commit()
    db.refresh(db_cart_item)
    return db_cart_item


def update_cart_item(db: Session, cart_item_id: int, quantity: int):
    db_cart_item = get_cart_item(db, cart_item_id)
    if not db_cart_item:
        return None

    if quantity <= 0:
        db.delete(db_cart_item)
        db.commit()
        return None

    db_cart_item.quantity = quantity
    db.commit()
    db.refresh(db_cart_item)
    return db_cart_item


def remove_from_cart(db: Session, cart_item_id: int):
    db_cart_item = get_cart_item(db, cart_item_id)
    if db_cart_item:
        db.delete(db_cart_item)
        db.commit()
    return db_cart_item


def clear_cart(db: Session, user_id: int):
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    db.commit()
    return True


def get_cart_summary(db: Session, user_id: int):
    cart_items = get_cart_items(db, user_id)
    items_count = 0
    total_amount = 0.0
    items_with_products = []

    for item in cart_items:
        product = get_product(db, item.product_id)
        if product:
            subtotal = item.quantity * product.price
            items_count += item.quantity
            total_amount += subtotal

            item_dict = item.__dict__.copy()
            item_dict['product'] = product
            item_dict['subtotal'] = subtotal
            items_with_products.append(item_dict)

    return {
        'items_count': items_count,
        'total_amount': total_amount,
        'items': items_with_products
    }


# Order CRUD
def create_order(db: Session, user_id: int, order_data: schemas.OrderCreate):
    # Get cart items
    cart_summary = get_cart_summary(db, user_id)

    if not cart_summary['items']:
        return None

    # Create order
    db_order = Order(
        user_id=user_id,
        total_amount=cart_summary['total_amount'],
        shipping_address=order_data.shipping_address,
        status='pending'
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # Create order items
    for item in cart_summary['items']:
        product = get_product(db, item['product_id'])
        if product and product.stock >= item['quantity']:
            # Reduce stock
            product.stock -= item['quantity']

            # Create order item
            db_order_item = OrderItem(
                order_id=db_order.id,
                product_id=item['product_id'],
                quantity=item['quantity'],
                price=product.price
            )
            db.add(db_order_item)

    # Clear cart
    clear_cart(db, user_id)

    db.commit()
    return db_order


def get_orders(db: Session, user_id: int):
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()


def get_order(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()


def update_order_status(db: Session, order_id: int, status: str):
    db_order = get_order(db, order_id)
    if not db_order:
        return None

    db_order.status = status
    db.commit()
    db.refresh(db_order)
    return db_order


# Statistics
def get_stats(db: Session):
    from sqlalchemy import func, and_

    # Product stats
    total_products = db.query(func.count(Product.id)).scalar() or 0
    active_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    out_of_stock = db.query(func.count(Product.id)).filter(Product.stock == 0).scalar() or 0

    # Order stats
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0

    # Category stats
    category_stats = db.query(
        Category.name,
        func.count(Product.id).label('product_count')
    ).join(Product, Category.id == Product.category_id, isouter=True) \
        .group_by(Category.id).all()

    return {
        'products': {
            'total': total_products,
            'active': active_products,
            'out_of_stock': out_of_stock
        },
        'orders': {
            'total': total_orders,
            'revenue': total_revenue
        },
        'categories': [
            {'name': cat[0], 'count': cat[1]}
            for cat in category_stats
        ]
    }
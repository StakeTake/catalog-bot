# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import public_routes, auth_routes, categories, products, payment, stats, client_routes, orders

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Магазин API")

origins = [
    "http://localhost:3001",
    "http://168.119.97.26:3001",
    "https://tgsale.stake-take.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(public_routes.router, prefix="/api/public", tags=["public"])
app.include_router(client_routes.router, prefix="/api/client", tags=["client"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(payment.router, prefix="/api/payment", tags=["payment"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])


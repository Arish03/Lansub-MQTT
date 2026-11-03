from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.brokers import router as brokers_router
from app.api.topics import router as topics_router
from app.api.publish import router as publish_router
from app.api.history import router as history_router
from app.api.dashboards import router as dashboards_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(brokers_router)
api_router.include_router(topics_router)
api_router.include_router(publish_router)
api_router.include_router(history_router)
api_router.include_router(dashboards_router)

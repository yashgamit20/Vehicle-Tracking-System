from datetime import datetime
try:
    with open("e:\\Embedded Projects\\GPS_Project\\reload_debug.txt", "a") as f:
        f.write(f"Reloaded main.py at {datetime.now()}\n")
except Exception as e:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.logging_config import setup_logging
from app.exceptions import register_exception_handlers
from app.routers import (
    health_router,
    system_router,
    vehicle_router,
    location_router,
    event_router,
    device_config_router,
    device_command_router
)

# Setup application loggers
setup_logging()

# Initialize FastAPI instance
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for logging, tracking, and querying real-time vehicle GPS coordinates & telemetry",
    version="1.0.0",
    debug=settings.DEBUG
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom API exceptions & handlers
register_exception_handlers(app)

# Include sub-routers
app.include_router(health_router)
app.include_router(system_router)
app.include_router(vehicle_router)
app.include_router(location_router)
app.include_router(event_router)
app.include_router(device_config_router)
app.include_router(device_command_router)


@app.get("/")
async def root():
    """Welcome endpoint returning API service info."""
    return {
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "docs_url": "/docs",
        "health_check_url": "/health",
        "status": "online"
    }

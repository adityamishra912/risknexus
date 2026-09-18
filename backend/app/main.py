from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def prewarm_cache():
    import asyncio
    from app.services.risk_engine.engine import quantify_all_scenarios
    # Pre-warm risk engine cache asynchronously at startup
    asyncio.create_task(asyncio.to_thread(quantify_all_scenarios))

@app.get("/")
def root():
    return {
        "message": "RiskNexus Cyber Risk Quantification & Investment Optimization API",
        "version": settings.VERSION,
        "docs": "/docs",
    }

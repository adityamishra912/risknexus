from fastapi import APIRouter
from app.api.ingestion import router as ingestion_router
from app.api.assets import router as assets_router
from app.api.vulnerabilities import router as vulnerabilities_router
from app.api.attack_paths import router as attack_paths_router
from app.api.risk import router as risk_router
from app.api.simulation import router as simulation_router
from app.api.what_if import router as what_if_router
from app.api.optimization import router as optimization_router
from app.api.optimizer import router as optimizer_router
from app.api.ml import router as ml_router
from app.api.compliance import router as compliance_router
from app.api.copilot import router as copilot_router

api_router = APIRouter()
api_router.include_router(ingestion_router)
api_router.include_router(assets_router)
api_router.include_router(vulnerabilities_router)
api_router.include_router(attack_paths_router)
api_router.include_router(risk_router)
api_router.include_router(simulation_router)
api_router.include_router(what_if_router)
api_router.include_router(optimization_router)
api_router.include_router(optimizer_router)
api_router.include_router(ml_router)
api_router.include_router(compliance_router)
api_router.include_router(copilot_router)


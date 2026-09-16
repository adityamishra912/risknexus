# app/api/ml.py

"""
ML API Endpoints
----------------
GET  /ml/info           — Model status, feature order, paths
POST /ml/predict        — Direct prediction from a pre-built feature vector dict
POST /ml/predict/full   — Full pipeline: raw asset/vuln/threat data → feature_builder → predictor
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.services.ml.feature_builder import (
    FEATURE_ORDER,
    build_feature_vector,
    FeatureBuildError,
)
from app.services.ml.predictor import predictor_service

router = APIRouter(prefix="/ml", tags=["ml"])


# ──────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────

class FeatureVectorRequest(BaseModel):
    """Direct prediction from a fully-built feature dict.
    Missing features are filled with safe neutral defaults."""
    cvss_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    exploitability: Optional[float] = Field(None, ge=0.0, le=1.0)
    known_exploited: Optional[int] = Field(None, ge=0, le=1)
    vulnerability_age_days: Optional[int] = Field(None, ge=0)
    internet_exposed: Optional[int] = Field(None, ge=0, le=1)
    asset_criticality: Optional[int] = Field(None, ge=1, le=10)
    attack_path_reachable: Optional[int] = Field(None, ge=0, le=1)
    attack_path_length: Optional[int] = Field(None, ge=0)
    path_strength: Optional[float] = Field(None, ge=0.0, le=1.0)
    control_coverage: Optional[float] = Field(None, ge=0.0, le=1.0)
    control_maturity: Optional[float] = Field(None, ge=0.0, le=1.0)
    threat_activity: Optional[float] = Field(None, ge=0.0, le=1.0)


class FullPipelineRequest(BaseModel):
    """Full pipeline: raw structured data -> feature_builder -> predictor."""
    asset_data: Dict[str, Any] = Field(
        ...,
        example={
            "criticality": 8,
            "internet_exposed": True,
        },
    )
    vuln_data: Dict[str, Any] = Field(
        ...,
        example={
            "cvss_score": 9.1,
            "known_exploited": True,
            "exploitability": "High",
            "days_open": 45,
        },
    )
    threat_data: Optional[Dict[str, Any]] = Field(
        default=None,
        example={"activity_score": 0.8},
    )
    attack_path_info: Optional[Dict[str, Any]] = Field(
        default=None,
        example={"reachable": True, "length": 3, "path_strength": 0.7},
    )
    control_status_list: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        example=[
            {"status": "Implemented", "coverage": 0.9, "maturity": 4.0},
            {"status": "Not Implemented"},
        ],
    )


class PredictionResponse(BaseModel):
    probability: float = Field(..., description="Calibrated breach probability [0, 1]")
    confidence: float = Field(..., description="Model confidence: 0=uncertain, 1=decisive")
    risk_label: str = Field(..., description="Human-readable risk band")
    feature_vector: Dict[str, Any] = Field(..., description="The exact 12-feature vector used")


def _risk_label(probability: float) -> str:
    if probability >= 0.75:
        return "CRITICAL"
    elif probability >= 0.50:
        return "HIGH"
    elif probability >= 0.30:
        return "MEDIUM"
    elif probability >= 0.10:
        return "LOW"
    return "NEGLIGIBLE"


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────

@router.get("/info")
def get_ml_info():
    """Returns current model status, feature order, and file path."""
    return {
        "status": "loaded",
        "model_path": predictor_service._model_path,
        "feature_count": len(FEATURE_ORDER),
        "feature_order": FEATURE_ORDER,
        "model_type": "CalibratedClassifierCV(XGBoost, isotonic)",
    }


@router.post("/predict", response_model=PredictionResponse)
def predict_from_feature_vector(req: FeatureVectorRequest):
    """
    Predict likelihood from a pre-built feature vector.
    Any omitted features are filled with safe neutral defaults.
    """
    provided = {k: v for k, v in req.model_dump().items() if v is not None}
    try:
        result = predictor_service.predict(provided)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    full_vector = {**predictor_service._FEATURE_DEFAULTS, **provided}
    return PredictionResponse(
        probability=result["probability"],
        confidence=result["confidence"],
        risk_label=_risk_label(result["probability"]),
        feature_vector=full_vector,
    )


@router.post("/predict/full", response_model=PredictionResponse)
def predict_full_pipeline(req: FullPipelineRequest):
    """
    Full ML pipeline:
      1. Accepts raw asset / vuln / threat / control data
      2. Runs feature_builder to produce the 12-feature vector
      3. Runs the calibrated XGBoost predictor
      4. Returns probability, confidence, risk label, and the built feature vector
    """
    try:
        features = build_feature_vector(
            asset_data=req.asset_data,
            vuln_data=req.vuln_data,
            threat_data=req.threat_data,
            attack_path_info=req.attack_path_info,
            control_status_list=req.control_status_list,
        )
    except FeatureBuildError as e:
        raise HTTPException(status_code=422, detail=f"Feature build error: {e}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {e}")

    try:
        result = predictor_service.predict(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")

    return PredictionResponse(
        probability=result["probability"],
        confidence=result["confidence"],
        risk_label=_risk_label(result["probability"]),
        feature_vector=features,
    )

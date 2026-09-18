import asyncio
import logging
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.assets.service import get_top_risk_assets
from app.services.risk_engine.engine import quantify_all_scenarios
from app.services.vulnerabilities.service import get_vulnerabilities_list

router = APIRouter(prefix="/copilot", tags=["copilot"])
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)


def _format_inr(value: float) -> str:
    if value >= 10_000_000:
        return f"₹{value / 10_000_000:.2f}Cr"
    if value >= 100_000:
        return f"₹{value / 100_000:.1f}L"
    return f"₹{value:,.0f}"


def _build_risk_context() -> Dict[str, Any]:
    result = quantify_all_scenarios()
    scenarios = result.get("scenarios", [])
    top_scenarios = sorted(scenarios, key=lambda item: item.get("eal", 0), reverse=True)[:12]
    top_assets = get_top_risk_assets(limit=10)
    vulnerabilities = get_vulnerabilities_list()

    return {
        "risk_scenarios": [
            {
                "scenario_id": item.get("scenario_id"),
                "threat": item.get("threat"),
                "asset": item.get("asset"),
                "asset_id": item.get("asset_id"),
                "eal": _format_inr(item.get("eal", 0)),
                "probability": item.get("probability"),
                "p95": _format_inr(item.get("p95", 0)),
                "attack_path": item.get("attack_path"),
                "vulnerabilities": item.get("contributing_vulnerabilities", []),
            }
            for item in top_scenarios
        ],
        "top_assets": [
            {
                "id": asset.get("id"),
                "name": asset.get("name"),
                "service": asset.get("service_name"),
                "criticality": asset.get("criticality"),
                "internet_exposed": asset.get("internet_exposed"),
                "eal": _format_inr(asset.get("total_eal", 0)),
                "vulnerabilities_count": asset.get("vulnerabilities_count"),
            }
            for asset in top_assets
        ],
        "vulnerabilities": [
            {
                "cve": vulnerability.get("cve_id"),
                "severity": vulnerability.get("severity"),
                "cvss": vulnerability.get("cvss_score"),
                "known_exploited": vulnerability.get("known_exploited"),
                "days_open": vulnerability.get("days_open"),
                "priority_score": vulnerability.get("priority_score"),
                "financial_exposure": _format_inr(vulnerability.get("financial_exposure", 0)),
            }
            for vulnerability in vulnerabilities[:20]
        ],
    }


SYSTEM_PROMPT = """You are RiskNexus Copilot, an executive cyber-risk analyst.
Answer the user's question directly and conversationally. You can answer general questions, but for RiskNexus questions use the supplied live risk context as the source of truth. Explain what happens if a control, patch, or investment changes when the data supports it; do not invent precise values that are absent from the context. Clearly distinguish modeled values from assumptions, state when the data is insufficient, and suggest the next useful analysis. Use INR formatting where appropriate. Keep answers concise, practical, and readable. Never claim to have performed an action or accessed data outside the supplied context.

Live RiskNexus context (JSON):
"""

@router.get("/")
def get_copilot_data():
    return {"status": "ok", "module": "copilot"}


@router.post("/chat")
async def chat_with_copilot(request: ChatRequest):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env and restart the API.",
        )

    try:
        context = await asyncio.to_thread(_build_risk_context)
        contents = [
            {"role": "user" if item.role == "user" else "model", "parts": [{"text": item.content}]}
            for item in request.history[-12:]
        ]
        contents.append({"role": "user", "parts": [{"text": request.message}]})
        payload = {
            "system_instruction": {"parts": [{"text": f"{SYSTEM_PROMPT}\n{context}"}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1000},
        }
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.GEMINI_MODEL}:generateContent"
        )
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, params={"key": settings.GEMINI_API_KEY}, json=payload)
        if response.is_error:
            logger.error("Gemini API error %s: %s", response.status_code, response.text[:500])
            raise HTTPException(status_code=502, detail="Gemini could not answer this request.")

        data = response.json()
        answer = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
        if not answer:
            raise HTTPException(status_code=502, detail="Gemini returned an empty answer.")
        return {"status": "success", "answer": answer}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Copilot request failed")
        raise HTTPException(status_code=500, detail=f"Copilot request failed: {exc}") from exc

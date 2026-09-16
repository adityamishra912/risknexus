# app/services/optimizer/optimizer.py

import os
import csv
import logging
from typing import List, Dict, Any, Optional
from app.services.risk_engine.engine import quantify_all_scenarios

logger = logging.getLogger(__name__)

# Default Security Investment Initiatives (derived from backend controls)
DEFAULT_INITIATIVES = [
    {
        "id": "INIT-01",
        "name": "Enterprise Multi-Factor Authentication (MFA)",
        "category": "Identity & Access Management",
        "cost": 1500000.0,
        "reduction": 4800000.0,
        "implementation_weeks": 4,
        "status": "Recommended",
        "control_ids": ["CTRL-MFA-01", "CTRL-001"],
    },
    {
        "id": "INIT-02",
        "name": "Automated Vulnerability Patching Engine",
        "category": "Vulnerability Management",
        "cost": 2500000.0,
        "reduction": 6200000.0,
        "implementation_weeks": 6,
        "status": "Recommended",
        "control_ids": ["CTRL-PATCH-01", "CTRL-002"],
    },
    {
        "id": "INIT-03",
        "name": "EDR Agent Expansion on Legacy Endpoints",
        "category": "Endpoint Security",
        "cost": 3000000.0,
        "reduction": 5500000.0,
        "implementation_weeks": 8,
        "status": "Optional",
        "control_ids": ["CTRL-EDR-01", "CTRL-003"],
    },
    {
        "id": "INIT-04",
        "name": "Network Microsegmentation for Core DBs",
        "category": "Network Architecture",
        "cost": 4000000.0,
        "reduction": 7500000.0,
        "implementation_weeks": 12,
        "status": "Recommended",
        "control_ids": ["CTRL-SEG-01", "CTRL-004"],
    },
    {
        "id": "INIT-05",
        "name": "Immutable Offline Backup & Recovery Architecture",
        "category": "Resilience & Recovery",
        "cost": 2000000.0,
        "reduction": 4200000.0,
        "implementation_weeks": 5,
        "status": "Optional",
        "control_ids": ["CTRL-BAK-01", "CTRL-005"],
    },
]


def get_available_initiatives(data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns the list of security investment opportunities with backend ROSI calculations."""
    initiatives = []
    for init in DEFAULT_INITIATIVES:
        cost = init["cost"]
        reduction = init["reduction"]
        rosi = round(reduction / cost, 2) if cost > 0 else 0.0
        initiatives.append({
            **init,
            "rosi": rosi,
            "rosi_ratio": f"{rosi}x",
        })
    return initiatives


def evaluate_portfolio(
    selected_initiative_ids: List[str],
    budget: float = 10000000.0, # ₹1 Crore default
    objective: str = "max_reduction",
    data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Backend Portfolio Optimizer Service:
    Calculates total selected investment, expected risk reduction, portfolio ROSI,
    residual EAL, residual P95, and remaining budget strictly on the backend.
    """
    all_initiatives = get_available_initiatives(data_dir=data_dir)
    selected = [i for i in all_initiatives if i["id"] in selected_initiative_ids]

    total_investment = sum(i["cost"] for i in selected)
    total_reduction = sum(i["reduction"] for i in selected)

    # Get baseline overall risk from quantify_all_scenarios
    quant_res = quantify_all_scenarios(data_dir=data_dir)
    summary = quant_res.get("summary", {})
    current_eal = summary.get("total_eal", 0.0)
    current_p95 = summary.get("p95_loss", 0.0)

    residual_eal = max(0.0, current_eal - total_reduction)
    residual_p95 = max(0.0, current_p95 - (total_reduction * 1.4))

    budget_remaining = max(0.0, budget - total_investment)
    portfolio_rosi = round(total_reduction / total_investment, 2) if total_investment > 0 else 0.0

    return {
        "status": "success",
        "budget": budget,
        "selected_initiative_ids": selected_initiative_ids,
        "selected_initiatives": selected,
        "total_selected_investment": total_investment,
        "total_expected_risk_reduction": total_reduction,
        "current_eal": current_eal,
        "residual_eal": residual_eal,
        "current_p95": current_p95,
        "residual_p95": residual_p95,
        "budget_remaining": budget_remaining,
        "portfolio_rosi": portfolio_rosi,
        "objective": objective,
    }


def recommend_optimal_portfolio(
    budget: float = 10000000.0,
    objective: str = "max_reduction",
    data_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Solves the 0/1 Knapsack optimization problem to find the optimal set of security
    initiatives that maximizes total risk reduction within the specified budget.
    """
    initiatives = get_available_initiatives(data_dir=data_dir)
    
    # 0/1 Knapsack optimization
    best_selected = []
    best_reduction = -1.0

    # Test all combinations (2^5 = 32 combinations)
    n = len(initiatives)
    for i in range(1 << n):
        combo = []
        cost_sum = 0.0
        red_sum = 0.0
        for j in range(n):
            if (i >> j) & 1:
                combo.append(initiatives[j])
                cost_sum += initiatives[j]["cost"]
                red_sum += initiatives[j]["reduction"]
        
        if cost_sum <= budget:
            if red_sum > best_reduction:
                best_reduction = red_sum
                best_selected = [item["id"] for item in combo]

    if not best_selected:
        best_selected = [initiatives[0]["id"]]

    return evaluate_portfolio(
        selected_initiative_ids=best_selected,
        budget=budget,
        objective=objective,
        data_dir=data_dir,
    )

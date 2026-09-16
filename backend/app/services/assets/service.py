# app/services/assets/service.py

import os
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
from app.services.attack_graph.graph_builder import resolve_data_dir, build_attack_graph
from app.services.risk_engine.engine import quantify_all_scenarios

logger = logging.getLogger(__name__)


def get_all_assets_with_risk(data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """Loads all assets and aggregates risk scenarios and vulnerabilities per asset."""
    data_path = resolve_data_dir(data_dir)
    assets_file = os.path.join(data_path, "assets.csv")
    vuln_file = os.path.join(data_path, "vulnerabilities.csv")
    services_file = os.path.join(data_path, "business_services.csv")
    controls_file = os.path.join(data_path, "control_status.csv")

    if not os.path.exists(assets_file):
        raise FileNotFoundError(f"Assets CSV missing at: {assets_file}")

    assets_df = pd.read_csv(assets_file)
    quantified_res = quantify_all_scenarios(data_dir=data_dir)
    quantified_scenarios = quantified_res.get("scenarios", []) if isinstance(quantified_res, dict) else quantified_res

    # Group risk scenarios by asset_id
    scenarios_by_asset: Dict[str, List[Dict[str, Any]]] = {}
    for s in quantified_scenarios:
        a_id = s["asset_id"]
        if a_id not in scenarios_by_asset:
            scenarios_by_asset[a_id] = []
        scenarios_by_asset[a_id].append(s)

    # Business services lookup
    services_map = {}
    if os.path.exists(services_file):
        s_df = pd.read_csv(services_file)
        for _, r in s_df.iterrows():
            services_map[str(r["service_id"]).strip()] = r.to_dict()

    # Vulnerabilities lookup
    vulns_by_asset: Dict[str, List[Dict[str, Any]]] = {}
    if os.path.exists(vuln_file):
        v_df = pd.read_csv(vuln_file)
        for _, r in v_df.iterrows():
            a_id = str(r.get("asset_id", "")).strip()
            if a_id not in vulns_by_asset:
                vulns_by_asset[a_id] = []
            vulns_by_asset[a_id].append(r.to_dict())

    # Control status lookup
    controls_by_asset: Dict[str, List[Dict[str, Any]]] = {}
    if os.path.exists(controls_file):
        c_df = pd.read_csv(controls_file)
        for _, r in c_df.iterrows():
            a_id = str(r.get("asset_id", "")).strip()
            if a_id not in controls_by_asset:
                controls_by_asset[a_id] = []
            controls_by_asset[a_id].append(r.to_dict())

    result = []
    for _, row in assets_df.iterrows():
        a_id = str(row["asset_id"]).strip()
        a_name = str(row.get("asset_name", a_id)).strip()
        a_type = str(row.get("asset_type", "Unknown")).strip()
        s_id = str(row.get("service_id", "")).strip()

        svc_info = services_map.get(s_id, {})
        asset_scenarios = scenarios_by_asset.get(a_id, [])
        asset_vulns = vulns_by_asset.get(a_id, [])
        asset_controls = controls_by_asset.get(a_id, [])

        total_eal = sum(s["eal"] for s in asset_scenarios)
        max_p95 = max((s["p95"] for s in asset_scenarios), default=0.0)
        max_prob = max((s["probability"] for s in asset_scenarios), default=0.0)

        # Formatted EAL string (e.g. ₹42L or ₹1.2Cr)
        if total_eal >= 10000000:
            formatted_eal = f"₹{total_eal / 10000000:.2f}Cr"
        elif total_eal >= 100000:
            formatted_eal = f"₹{total_eal / 100000:.0f}L"
        else:
            formatted_eal = f"₹{total_eal:,.0f}"

        result.append({
            "id": a_id,
            "name": a_name,
            "type": a_type,
            "service_id": s_id,
            "service_name": svc_info.get("service_name", "Core Infrastructure"),
            "criticality": int(row.get("criticality", 5)),
            "internet_exposed": str(row.get("internet_exposed", "")).strip().lower() in ["yes", "true", "1"],
            "environment": str(row.get("environment", "Production")),
            "owner": str(row.get("owner", "IT Team")),
            "total_eal": round(total_eal, 2),
            "formatted_eal": formatted_eal,
            "max_p95": round(max_p95, 2),
            "max_probability": round(max_prob, 4),
            "vulnerabilities_count": len(asset_vulns),
            "controls_count": len(asset_controls),
            "scenarios_count": len(asset_scenarios),
        })

    # Sort descending by total EAL
    result.sort(key=lambda a: a["total_eal"], reverse=True)
    return result


def get_top_risk_assets(limit: int = 10, data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns top N highest-risk assets sorted by total financial EAL."""
    all_assets = get_all_assets_with_risk(data_dir=data_dir)
    return all_assets[:limit]


def get_asset_detail_profile(asset_id: str, data_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns comprehensive profile for an asset including metadata, business service,
    financial exposure, vulnerabilities, controls, attack paths, risk scenarios, and drivers.
    """
    data_path = resolve_data_dir(data_dir)
    all_assets = get_all_assets_with_risk(data_dir=data_dir)
    target = next((a for a in all_assets if a["id"].lower() == asset_id.lower()), None)
    
    if not target:
        raise FileNotFoundError(f"Asset '{asset_id}' not found.")

    # Load attack graph for attack paths passing through this asset
    graph = build_attack_graph(data_dir=data_dir)
    node_data = graph.nodes.get(target["id"], {})

    # Extract vulnerabilities for target asset
    vulnerabilities = node_data.get("vulnerabilities", [])

    # Extract risk scenarios for target asset
    all_scenarios = quantify_all_scenarios(data_dir=data_dir)
    asset_scenarios = [s for s in all_scenarios if s["asset_id"].lower() == target["id"].lower()]

    # Extract controls for target asset from control_status.csv
    controls_file = os.path.join(data_path, "control_status.csv")
    controls_df = pd.read_csv(controls_file) if os.path.exists(controls_file) else pd.DataFrame()
    asset_controls = []
    if not controls_df.empty:
        matching_c = controls_df[controls_df["asset_id"].str.strip().str.lower() == target["id"].lower()]
        for _, r in matching_c.iterrows():
            asset_controls.append({
                "control_id": str(r.get("control_id", "")).strip(),
                "status": str(r.get("status", "Not Implemented")).strip(),
                "coverage": float(r.get("coverage", 0.0)),
                "maturity": float(r.get("maturity", 0.0)),
                "last_assessed": str(r.get("last_assessed", "")).strip(),
            })

    # Attack path sequences involving target asset
    in_edges = list(graph.in_edges(target["id"], data=True))
    out_edges = list(graph.out_edges(target["id"], data=True))
    attack_paths_summary = []
    for u, v, d in in_edges:
        attack_paths_summary.append({
            "source": u,
            "source_name": graph.nodes[u].get("name", u),
            "destination": v,
            "destination_name": graph.nodes[v].get("name", v),
            "relationship": d.get("relationship", "connects_to"),
            "access_type": d.get("access_type", "Internal"),
        })

    return {
        "asset": target,
        "business_service": {
            "service_id": target["service_id"],
            "service_name": target["service_name"],
            "criticality": target["criticality"],
            "downtime_cost_per_hour": node_data.get("downtime_cost_per_hour", 0.0),
            "data_sensitivity": node_data.get("data_sensitivity", "Medium"),
        },
        "financial_exposure": {
            "total_eal": target["total_eal"],
            "formatted_eal": target["formatted_eal"],
            "max_p95": target["max_p95"],
            "max_probability": target["max_probability"],
        },
        "vulnerabilities": vulnerabilities,
        "controls": asset_controls,
        "attack_paths": attack_paths_summary,
        "risk_scenarios": asset_scenarios,
        "top_risk_drivers": [
            "Internet perimeter exposure without FIDO2 MFA enforcement",
            "Unpatched CVE with active CISA KEV exploit intelligence",
            "High downtime cost per hour on critical business service",
        ]
    }

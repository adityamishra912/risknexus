# app/services/risk_engine/scenarios.py

import os
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
from app.services.attack_graph.graph_builder import resolve_data_dir
from app.services.risk_engine.scenario_generator import generate_risk_scenarios
from app.services.risk_engine.exceptions import MissingLinkedRecordError
from app.utils.type_parsers import parse_float

logger = logging.getLogger(__name__)


def load_risk_scenarios_data(data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Loads all risk scenario records and joins them with asset, vulnerability,
    business service, and threat data for full Risk Engine quantification.
    Falls back to generate_risk_scenarios() if risk_scenarios.csv does not exist.
    """
    data_path = resolve_data_dir(data_dir)
    scenarios_file = os.path.join(data_path, "risk_scenarios.csv")

    if not os.path.exists(scenarios_file):
        logger.info("risk_scenarios.csv not found; falling back to dynamic generate_risk_scenarios()")
        gen_res = generate_risk_scenarios(data_dir=data_dir)
        return gen_res.get("scenarios", [])

    assets_file = os.path.join(data_path, "assets.csv")
    vuln_file = os.path.join(data_path, "vulnerabilities.csv")
    services_file = os.path.join(data_path, "business_services.csv")
    controls_file = os.path.join(data_path, "control_status.csv")
    threats_file = os.path.join(data_path, "threat_scenarios.csv")
    if not os.path.exists(threats_file):
        threats_file = os.path.join(data_path, "threat_scenarios_correct.csv")

    scenarios_df = pd.read_csv(scenarios_file)

    # 1. Assets Map
    assets_map: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(assets_file):
        assets_df = pd.read_csv(assets_file)
        for _, r in assets_df.iterrows():
            a_id = str(r["asset_id"]).strip()
            assets_map[a_id] = r.to_dict()

    # 2. Vulnerabilities Map (pick highest CVSS or matching asset vuln)
    vulns_map: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(vuln_file):
        vuln_df = pd.read_csv(vuln_file)
        for _, r in vuln_df.iterrows():
            a_id = str(r["asset_id"]).strip()
            cvss = parse_float(r.get("cvss_score", 0.0))
            if a_id not in vulns_map or cvss > parse_float(vulns_map[a_id].get("cvss_score", 0.0)):
                vulns_map[a_id] = r.to_dict()

    # 3. Services Map
    services_map: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(services_file):
        services_df = pd.read_csv(services_file)
        for _, r in services_df.iterrows():
            s_id = str(r["service_id"]).strip()
            services_map[s_id] = r.to_dict()

    # 4. Control Status Map (grouped by asset_id)
    controls_map: Dict[str, List[Dict[str, Any]]] = {}
    if os.path.exists(controls_file):
        controls_df = pd.read_csv(controls_file)
        for _, r in controls_df.iterrows():
            a_id = str(r["asset_id"]).strip()
            if a_id not in controls_map:
                controls_map[a_id] = []
            controls_map[a_id].append(r.to_dict())

    # 5. Threats Map
    threats_map: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(threats_file):
        threats_df = pd.read_csv(threats_file)
        for _, r in threats_df.iterrows():
            t_id = str(r["threat_id"]).strip()
            threats_map[t_id] = r.to_dict()

    items = []
    for _, row in scenarios_df.iterrows():
        scen_dict = row.to_dict()
        scen_id = str(scen_dict.get("scenario_id", "")).strip()
        a_id = str(scen_dict.get("asset_id", "")).strip()
        t_id = str(scen_dict.get("threat_id", "")).strip()

        asset_info = assets_map.get(a_id, {"asset_id": a_id, "asset_name": a_id, "criticality": 5})
        threat_info = threats_map.get(t_id, {"threat_id": t_id, "threat_name": "Threat"})
        vuln_info = vulns_map.get(a_id, {"vulnerability_id": "V0001", "cvss_score": 5.0})

        s_id = str(asset_info.get("service_id", "")).strip()
        service_info = services_map.get(s_id, {})
        asset_controls = controls_map.get(a_id, [])

        items.append({
            "scenario_row": scen_dict,
            "asset_data": asset_info,
            "vuln_data": vuln_info,
            "service_data": service_info,
            "threat_data": threat_info,
            "control_status_list": asset_controls,
        })

    return items

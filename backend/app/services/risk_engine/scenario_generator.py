# app/services/risk_engine/scenario_generator.py
"""
Risk Scenario Generator

Dynamically correlates assets, vulnerabilities, threat scenarios,
attack graph reachability, business services, and impact profiles to
produce candidate risk scenarios.

Pipeline:
  Step 1  -  Find per-asset vulnerabilities           (assets JOIN vulnerabilities)
  Step 2  -  Find applicable threats per asset/vuln   (threat compatibility filter)
  Step 3  -  Check attack-path reachability            (NetworkX DiGraph BFS)
  Step 4  -  Attach business service                   (asset.service_id lookup)
  Step 5  -  Attach impact profile                     (threat_asset_impacts lookup)
  Output  -  Candidate scenario dicts (no probability/EAL yet - that is the engine's job)
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Set

import pandas as pd
import networkx as nx

from app.services.attack_graph.graph_builder import resolve_data_dir, build_attack_graph
from app.utils.type_parsers import parse_criticality, parse_float, parse_int

logger = logging.getLogger(__name__)


# Threat <-> Asset-type compatibility matrix
# Defines which threat categories can plausibly target which asset types.

THREAT_ASSET_COMPAT: Dict[str, Set[str]] = {
    "T001": {"Database", "Server", "Cloud Workload", "Virtual Machine", "Container"},
    "T002": {"Identity Server", "Server", "Endpoint", "Cloud Workload", "Virtual Machine"},
    "T003": {"Endpoint", "Server", "Identity Server"},
    "T004": {"Server", "Web Application", "API Gateway", "Cloud Workload"},
    "T005": {"Database", "Server", "Cloud Workload"},
    "T006": {"Server", "Network Device", "Firewall"},
    "T007": {"IoT Device", "OT Device", "Network Device"},
    "T008": {"Cloud Workload", "Virtual Machine", "Container"},
    "T009": {"Server", "Web Application"},
    "T010": {"Network Device", "Firewall", "Server"},
    "T011": {"Endpoint", "Server", "Database"},
    "T012": {"Server", "Endpoint", "Cloud Workload"},
}

DEFAULT_COMPATIBLE_TYPES: Set[str] = {"Server", "Database", "Cloud Workload"}

# Minimum CVSS score to generate a scenario for a vulnerability
MIN_CVSS_FOR_SCENARIO = 4.0

# Maximum attack-path length to consider reachable
MAX_PATH_LENGTH = 8

# Normalize asset types from assets.csv to impact categories in threat_asset_impacts.csv

ASSET_TYPE_TO_IMPACT_TYPE: Dict[str, str] = {
    "database":           "Database",
    "db":                 "Database",
    "web server":         "Web Server",
    "web application":    "Web Server",
    "api gateway":        "Application Server",
    "api server":         "Application Server",
    "application server": "Application Server",
    "app server":         "Application Server",
    "identity server":    "Application Server",
    "server":             "Application Server",
    "virtual machine":    "Application Server",
    "container":          "Application Server",
    "endpoint":           "User Endpoint",
    "user endpoint":      "User Endpoint",
    "workstation":        "User Endpoint",
    "cloud workload":     "Cloud Resource",
    "cloud resource":     "Cloud Resource",
    "cloud":              "Cloud Resource",
    "network device":     "Application Server",
    "firewall":           "Application Server",
    "iot device":         "User Endpoint",
    "ot device":          "User Endpoint",
}


def _load_dataframes(data_dir: str) -> Dict[str, pd.DataFrame]:
    """Loads all required CSV files into DataFrames, returns empty DF on missing file."""
    threat_filename = "threat_scenarios.csv" if os.path.exists(os.path.join(data_dir, "threat_scenarios.csv")) else "threat_scenarios_correct.csv"
    files = {
        "assets":          "assets.csv",
        "vulnerabilities": "vulnerabilities.csv",
        "threats":         threat_filename,
        "services":        "business_services.csv",
        "controls":        "control_status.csv",
        "impacts":         "threat_asset_impacts.csv",
        "relationships":   "asset_relationships.csv",
    }
    frames: Dict[str, pd.DataFrame] = {}
    for key, filename in files.items():
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            frames[key] = pd.read_csv(path)
            logger.debug(f"Loaded {filename}: {len(frames[key])} rows")
        else:
            frames[key] = pd.DataFrame()
            logger.warning(f"Missing data file: {path}")
    return frames


def _build_reachability_map(graph: nx.DiGraph) -> Dict[str, List[str]]:
    """
    Pre-computes for each internet-exposed entry-point node which other nodes
    are reachable (BFS up to MAX_PATH_LENGTH hops). Returns:
        { target_asset_id: [shortest_path_as_list_of_node_ids] }
    """
    reachability: Dict[str, List[str]] = {}
    entry_nodes = [n for n, d in graph.nodes(data=True) if d.get("internet_exposed")]

    for entry in entry_nodes:
        try:
            paths = nx.single_source_shortest_path(graph, entry, cutoff=MAX_PATH_LENGTH)
            for target, path in paths.items():
                if target not in reachability or len(path) < len(reachability[target]):
                    reachability[target] = path
        except Exception as exc:
            logger.warning(f"Reachability BFS failed from {entry}: {exc}")

    # Internet-exposed nodes are always reachable from themselves
    for node_id, data in graph.nodes(data=True):
        if data.get("internet_exposed") and node_id not in reachability:
            reachability[node_id] = [node_id]

    return reachability


def _is_threat_compatible(threat_id: str, asset_type: str) -> bool:
    """Returns True if the threat can plausibly target the given asset type."""
    compatible_types = THREAT_ASSET_COMPAT.get(threat_id, DEFAULT_COMPATIBLE_TYPES)
    asset_type_lower = asset_type.strip().lower()
    for t in compatible_types:
        if t.lower() in asset_type_lower or asset_type_lower in t.lower():
            return True
    return False


def _get_impact_profile(
    impacts_df: pd.DataFrame,
    threat_id: str,
    asset_type: str,
) -> Dict[str, Any]:
    """
    Returns the impact distribution profile for a (threat_id, asset_type) pair
    from threat_asset_impacts. Falls back to empty dict if no match.
    Uses ASSET_TYPE_TO_IMPACT_TYPE normalization for fuzzy matching.
    """
    if impacts_df.empty:
        return {}

    # Normalize asset_type to the nearest impact category
    normalized = ASSET_TYPE_TO_IMPACT_TYPE.get(
        asset_type.strip().lower(), asset_type.strip()
    )

    # Try exact normalized match
    mask = (impacts_df["threat_id"] == threat_id) & (
        impacts_df["asset_type"].str.lower() == normalized.lower()
    )
    matched = impacts_df[mask]

    if matched.empty:
        # Partial match on first 6 chars of normalized type
        prefix = normalized.lower()[:6]
        mask2 = (impacts_df["threat_id"] == threat_id) & (
            impacts_df["asset_type"].str.lower().str.contains(prefix, na=False)
        )
        matched = impacts_df[mask2]

    if matched.empty:
        # Last resort: use Application Server profile as generic fallback
        mask3 = (impacts_df["threat_id"] == threat_id) & (
            impacts_df["asset_type"] == "Application Server"
        )
        matched = impacts_df[mask3]

    if matched.empty:
        return {}

    profile: Dict[str, Any] = {}
    for _, row in matched.iterrows():
        impact_type = str(row.get("impact_type", "")).lower()
        profile[impact_type] = {
            "min":    float(row.get("min_value", 0.0)),
            "likely": float(row.get("likely_value", 0.0)),
            "max":    float(row.get("max_value", 0.0)),
            "unit":   str(row.get("unit", "INR")),
        }
    return profile


def _path_as_names(path: List[str], graph: nx.DiGraph) -> List[str]:
    """Converts a list of asset_ids into readable asset names."""
    return [
        graph.nodes[node_id].get("name", node_id) if node_id in graph else node_id
        for node_id in path
    ]


def generate_risk_scenarios(
    data_dir: Optional[str] = None,
    scope_asset_ids: Optional[List[str]] = None,
    scope_service_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Main entry-point for the Risk Scenario Generator.

    Args:
        data_dir:          Override path to the /data directory.
        scope_asset_ids:   If provided, only generate scenarios for these assets.
        scope_service_ids: If provided, only generate scenarios for assets in these services.

    Returns:
        {
            "run_id": str,
            "generated_at": str (ISO),
            "status": "completed" | "error",
            "scenario_count": int,
            "scenarios": [ <candidate scenario dict>, ... ]
        }
    """
    run_id = f"SCENARIO-RUN-{uuid.uuid4().hex[:8].upper()}"
    generated_at = datetime.utcnow().isoformat() + "Z"

    try:
        data_path = resolve_data_dir(data_dir)
        frames = _load_dataframes(data_path)

        assets_df  = frames["assets"]
        vulns_df   = frames["vulnerabilities"]
        threats_df = frames["threats"]
        services_df = frames["services"]
        controls_df = frames["controls"]
        impacts_df  = frames["impacts"]

        if assets_df.empty:
            raise ValueError("assets.csv is required but missing or empty.")
        if threats_df.empty:
            raise ValueError("threat_scenarios_correct.csv is required but missing or empty.")

        # ------------------------------------------------------------------ #
        # Build attack graph and pre-compute reachability
        # ------------------------------------------------------------------ #
        graph = build_attack_graph(data_path)
        reachability_map = _build_reachability_map(graph)
        logger.info(
            f"[{run_id}] Reachability map: {len(reachability_map)} asset(s) "
            "reachable from internet entry points"
        )

        # ------------------------------------------------------------------ #
        # Build lookup maps
        # ------------------------------------------------------------------ #
        services_map: Dict[str, Dict] = {}
        if not services_df.empty:
            for _, r in services_df.iterrows():
                services_map[str(r["service_id"]).strip()] = r.to_dict()

        vulns_map: Dict[str, List[Dict]] = {}
        if not vulns_df.empty:
            for _, r in vulns_df.iterrows():
                a_id = str(r.get("asset_id", "")).strip()
                if a_id not in vulns_map:
                    vulns_map[a_id] = []
                vulns_map[a_id].append(r.to_dict())

        controls_map: Dict[str, List[Dict]] = {}
        if not controls_df.empty:
            for _, r in controls_df.iterrows():
                a_id = str(r.get("asset_id", "")).strip()
                if a_id not in controls_map:
                    controls_map[a_id] = []
                controls_map[a_id].append(r.to_dict())

        threats_list: List[Dict] = threats_df.to_dict("records") if not threats_df.empty else []

        # ------------------------------------------------------------------ #
        # Apply scope filter
        # ------------------------------------------------------------------ #
        assets_iter = assets_df.copy()

        if scope_asset_ids:
            assets_iter = assets_iter[assets_iter["asset_id"].isin(scope_asset_ids)]
            logger.info(f"[{run_id}] Scope: {len(assets_iter)} asset(s) by asset_ids")

        if scope_service_ids:
            assets_iter = assets_iter[assets_iter["service_id"].isin(scope_service_ids)]
            logger.info(f"[{run_id}] Scope: {len(assets_iter)} asset(s) by service_ids")

        # ------------------------------------------------------------------ #
        # Core 5-step correlation loop
        # Phase A: Group all qualifying (vuln, threat) pairs by (asset_id, threat_id)
        # Phase B: Emit ONE canonical scenario per (asset, threat) with aggregated signals
        # Impact is pulled exactly once per group — not once per vulnerability.
        # ------------------------------------------------------------------ #
        from collections import defaultdict
        from app.services.ml.feature_builder import extract_exploitability_score

        raw_scenarios: List[Dict[str, Any]] = []

        for _, asset_row in assets_iter.iterrows():
            asset_id         = str(asset_row["asset_id"]).strip()
            asset_name       = str(asset_row.get("asset_name", asset_id)).strip()
            asset_type       = str(asset_row.get("asset_type", "Server")).strip()
            service_id       = str(asset_row.get("service_id", "")).strip()
            criticality      = parse_criticality(asset_row.get("criticality", 5))
            internet_exposed = str(asset_row.get("internet_exposed", "No")).strip().lower() in [
                "yes", "true", "1"
            ]

            # Step 1 - Get vulnerabilities for this asset
            asset_vulns = vulns_map.get(asset_id, [])
            if not asset_vulns:
                continue

            # Step 4 - Resolve business service
            service_data = services_map.get(service_id, {})

            # Step 3 - Check attack-path reachability
            attack_path_ids   = reachability_map.get(asset_id, [])
            attack_path_names = _path_as_names(attack_path_ids, graph) if attack_path_ids else []

            if attack_path_names and "Internet" not in attack_path_names:
                attack_path_names = ["Internet"] + attack_path_names
            elif not attack_path_names and internet_exposed:
                attack_path_names = ["Internet", asset_name]

            attack_path_reachable = len(attack_path_ids) > 0

            # Collect active controls for this asset (once, shared across all threats)
            asset_controls = controls_map.get(asset_id, [])
            active_controls = [
                str(c.get("control_id", ""))
                for c in asset_controls
                if str(c.get("status", "")).lower() == "implemented"
            ]

            # -------------------------------------------------------------- #
            # Phase A: Group qualifying vulns by (asset_id, threat_id)
            # -------------------------------------------------------------- #
            # key = threat_id → list of qualifying vuln dicts for this asset
            threat_vuln_groups: Dict[str, List[Dict]] = defaultdict(list)

            for vuln in asset_vulns:
                cvss = parse_float(vuln.get("cvss_score", 0.0))
                if cvss < MIN_CVSS_FOR_SCENARIO:
                    continue  # Skip trivially low-risk vulnerabilities

                for threat in threats_list:
                    threat_id_t   = str(threat.get("threat_id", "")).strip()
                    attack_vector = str(threat.get("attack_vector", "")).strip()

                    # Step 2 - Threat compatibility filter
                    if not _is_threat_compatible(threat_id_t, asset_type):
                        continue

                    # Skip purely external threats for non-reachable, non-internet assets
                    is_external = "internet" in attack_vector.lower()
                    if is_external and not internet_exposed and not attack_path_reachable:
                        continue

                    threat_vuln_groups[threat_id_t].append({
                        "vuln":   vuln,
                        "threat": threat,
                    })

            # -------------------------------------------------------------- #
            # Phase B: Emit one canonical scenario per (asset, threat) group
            # -------------------------------------------------------------- #
            for threat_id, entries in threat_vuln_groups.items():
                if not entries:
                    continue

                threat_meta = entries[0]["threat"]
                threat_name = str(threat_meta.get("threat_name", "")).strip()

                # --- Aggregate vulnerability signals ---

                # 1. Worst-case CVSS drives the primary ML feature
                worst_entry = max(
                    entries,
                    key=lambda e: parse_float(e["vuln"].get("cvss_score", 0.0))
                )
                worst_vuln    = worst_entry["vuln"]
                primary_cvss  = parse_float(worst_vuln.get("cvss_score", 0.0))
                primary_vuln_id = str(worst_vuln.get("vulnerability_id", "")).strip()
                primary_cve_id  = str(worst_vuln.get("cve_id", "")).strip()

                # 2. Noisy-OR combined exploitability (ML feature only — not for financial aggregation)
                #    P(at_least_one_exploitable) = 1 - Π(1 - exploit_j)
                #    Reflects that the attacker picks whichever vuln is easiest.
                exploit_scores = [
                    extract_exploitability_score(e["vuln"].get("exploitability", "Medium"))
                    for e in entries
                ]
                prod_not_exploit = 1.0
                for es in exploit_scores:
                    prod_not_exploit *= (1.0 - es)
                combined_exploitability = round(min(0.95, 1.0 - prod_not_exploit), 3)

                # 3. Any known-exploited vuln → the group is known-exploited
                any_known_exploited = any(
                    str(e["vuln"].get("known_exploited", "No")).lower() in ["yes", "true", "1"]
                    for e in entries
                )

                # 4. Worst-case days open (oldest unpatched vuln)
                max_days_open = max(parse_int(e["vuln"].get("days_open", 0)) for e in entries)

                # 5. Any patch available across the group
                any_patch_available = any(
                    str(e["vuln"].get("patch_available", "No")).lower() in ["yes", "true", "1"]
                    for e in entries
                )

                # 6. Collect all contributing CVEs for audit and display
                all_cve_ids = list({
                    str(e["vuln"].get("cve_id", e["vuln"].get("vulnerability_id", ""))).strip()
                    for e in entries
                    if str(e["vuln"].get("cve_id", "")).strip()
                })
                if not all_cve_ids:
                    all_cve_ids = [
                        str(e["vuln"].get("vulnerability_id", "")).strip()
                        for e in entries
                        if str(e["vuln"].get("vulnerability_id", "")).strip()
                    ]

                # Step 5 - Impact is pulled ONCE per (asset_type, threat_id) pair
                impact_profile = _get_impact_profile(impacts_df, threat_id, asset_type)

                raw_scenarios.append({
                    # Identity
                    "asset_id":                     asset_id,
                    "asset_name":                   asset_name,
                    "asset_type":                   asset_type,
                    "vulnerability_id":             primary_vuln_id,
                    "cve_id":                       primary_cve_id,
                    "threat_id":                    threat_id,
                    "threat_name":                  threat_name,
                    "service_id":                   service_id,
                    "service_name":                 service_data.get("service_name", ""),
                    # Attack path
                    "attack_path":                  attack_path_names,
                    "attack_path_asset_ids":        attack_path_ids,
                    "attack_path_reachable":        attack_path_reachable,
                    "attack_path_length":           len(attack_path_ids),
                    # Asset context
                    "asset_criticality":            criticality,
                    "internet_exposed":             internet_exposed,
                    # Aggregated vulnerability signals (one canonical value per asset-threat)
                    "cvss_score":                   primary_cvss,           # worst-case CVSS
                    "exploitability":               combined_exploitability, # Noisy-OR (ML feature)
                    "known_exploited":              any_known_exploited,     # any CVE in KEV
                    "days_open":                    max_days_open,           # oldest unpatched
                    "patch_available":              any_patch_available,
                    # Audit trail: all contributing CVEs collapsed into this scenario
                    "contributing_vulnerabilities": all_cve_ids,
                    "contributing_vuln_count":      len(entries),
                    # Impact — pulled exactly once per (asset_type, threat_id)
                    "impact_profile":               impact_profile,
                    "downtime_cost_per_hour":       float(service_data.get("downtime_cost_per_hour", 0.0)),
                    "data_sensitivity":             str(service_data.get("data_sensitivity", "Medium")),
                    "active_controls":              active_controls,
                    "generated":                    True,
                })

        # No deduplication needed — generator guarantees at most one scenario per (asset, threat)
        deduped = raw_scenarios

        # Assign sequential scenario IDs
        for i, s in enumerate(deduped, start=1):
            s["scenario_id"] = f"GEN-{i:04d}"

        logger.info(
            f"[{run_id}] Generated {len(deduped)} canonical scenarios "
            f"(one per asset×threat) from {len(assets_iter)} assets × {len(threats_list)} threats. "
            f"Vulnerability signals aggregated per group."
        )

        return {
            "run_id":         run_id,
            "generated_at":   generated_at,
            "status":         "completed",
            "scenario_count": len(deduped),
            "scenarios":      deduped,
        }

    except Exception as exc:
        logger.exception(f"[{run_id}] Scenario generation failed: {exc}")
        return {
            "run_id":         run_id,
            "generated_at":   generated_at,
            "status":         "error",
            "scenario_count": 0,
            "scenarios":      [],
            "error":          str(exc),
        }

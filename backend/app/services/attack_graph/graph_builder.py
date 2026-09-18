# app/services/attack_graph/graph_builder.py

import os
import logging
from typing import Dict, Any, List, Optional
import pandas as pd
import networkx as nx
from app.utils.type_parsers import parse_criticality, parse_float, parse_int

logger = logging.getLogger(__name__)


def resolve_data_dir(data_dir: Optional[str] = None) -> str:
    """Helper to locate the backend data directory reliably."""
    if data_dir and os.path.exists(data_dir):
        return data_dir

    from app.services.data_sources.service import get_active_data_dir

    active_data_dir = get_active_data_dir()
    if active_data_dir:
        return active_data_dir

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

    # Check ACTIVE_DATASET from environment or settings config
    from app.core.config import settings
    active_ds = os.environ.get("ACTIVE_DATASET", getattr(settings, "ACTIVE_DATASET", "Dataset2")).strip()
    if active_ds:
        ds_path = os.path.join(base_dir, "data", active_ds)
        if os.path.exists(ds_path):
            return ds_path

    possible_paths = [
        os.path.join(base_dir, "data"),
        os.path.join(os.getcwd(), "data"),
        os.path.join(os.getcwd(), "backend", "data"),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"Backend data directory not found in candidate locations: {possible_paths}")


def build_attack_graph(data_dir: Optional[str] = None) -> nx.DiGraph:
    """
    Builds a NetworkX DiGraph representing the asset infrastructure, relationships,
    and attached vulnerabilities from actual CSV datasets.
    """
    data_path = resolve_data_dir(data_dir)
    assets_file = os.path.join(data_path, "assets.csv")
    rel_file = os.path.join(data_path, "asset_relationships.csv")
    vuln_file = os.path.join(data_path, "vulnerabilities.csv")
    services_file = os.path.join(data_path, "business_services.csv")

    if not os.path.exists(assets_file):
        raise FileNotFoundError(f"Assets CSV missing at: {assets_file}")

    graph = nx.DiGraph()


    # 1. Load Business Services lookup
    services_map: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(services_file):
        services_df = pd.read_csv(services_file)
        for _, row in services_df.iterrows():
            s_id = str(row["service_id"]).strip()
            services_map[s_id] = {
                "service_name": str(row.get("service_name", "")),
                "service_criticality": parse_criticality(row.get("criticality", 5)),
                "downtime_cost_per_hour": parse_float(row.get("downtime_cost_per_hour", 0.0)),
                "data_sensitivity": str(row.get("data_sensitivity", "Medium")),
            }

    # 2. Load Assets as Graph Nodes
    assets_df = pd.read_csv(assets_file)
    for _, row in assets_df.iterrows():
        asset_id = str(row["asset_id"]).strip()
        service_id = str(row.get("service_id", "")).strip()
        svc_info = services_map.get(service_id, {})

        is_internet = str(row.get("internet_exposed", "")).strip().lower() in ["yes", "true", "1"]
        criticality = parse_criticality(row.get("criticality", 5))

        graph.add_node(
            asset_id,
            id=asset_id,
            name=str(row.get("asset_name", asset_id)),
            type=str(row.get("asset_type", "Unknown")),
            service_id=service_id,
            criticality=criticality,
            internet_exposed=is_internet,
            environment=str(row.get("environment", "Production")),
            owner=str(row.get("owner", "")),
            service_name=svc_info.get("service_name", ""),
            downtime_cost_per_hour=svc_info.get("downtime_cost_per_hour", 0.0),
            data_sensitivity=svc_info.get("data_sensitivity", "Medium"),
            vulnerabilities=[],
            max_cvss=0.0,
            has_critical_vuln=False,
            has_known_exploited=False,
            vuln_count=0,
        )

    # 3. Load & Attach Vulnerabilities to Asset Nodes
    if os.path.exists(vuln_file):
        vuln_df = pd.read_csv(vuln_file)
        for _, row in vuln_df.iterrows():
            asset_id = str(row.get("asset_id", "")).strip()
            if asset_id in graph:
                cvss = parse_float(row.get("cvss_score", 0.0))
                severity = str(row.get("severity", "Low")).strip()
                known_exp = str(row.get("known_exploited", "")).strip().lower() in ["yes", "true", "1"]

                vuln_record = {
                    "vulnerability_id": str(row.get("vulnerability_id", "")),
                    "cve_id": str(row.get("cve_id", "")),
                    "cvss_score": cvss,
                    "severity": severity,
                    "exploitability": str(row.get("exploitability", "Medium")),
                    "known_exploited": known_exp,
                    "days_open": parse_int(row.get("days_open", 0)),
                    "patch_available": str(row.get("patch_available", "Yes")).strip().lower() in ["yes", "true", "1"],
                }

                node_attrs = graph.nodes[asset_id]
                node_attrs["vulnerabilities"].append(vuln_record)
                node_attrs["vuln_count"] += 1
                if cvss > node_attrs["max_cvss"]:
                    node_attrs["max_cvss"] = cvss
                if severity.lower() == "critical":
                    node_attrs["has_critical_vuln"] = True
                if known_exp:
                    node_attrs["has_known_exploited"] = True

    # 4. Load & Add Asset Relationships as Directed Edges
    if os.path.exists(rel_file):
        rel_df = pd.read_csv(rel_file)
        for _, row in rel_df.iterrows():
            src = str(row.get("source_asset", "")).strip()
            dst = str(row.get("destination_asset", "")).strip()

            # Validation: ensure both assets exist in graph to prevent ghost nodes
            if src in graph and dst in graph:
                graph.add_edge(
                    src,
                    dst,
                    source=src,
                    target=dst,
                    relationship=str(row.get("relationship", "connects_to")),
                    access_type=str(row.get("access_type", "Internal")),
                )
            else:
                logger.warning(f"Skipping edge {src} -> {dst}: one or both assets do not exist in assets dataset.")

    return graph


def get_entry_points(graph: nx.DiGraph) -> List[Dict[str, Any]]:
    """
    Returns list of asset nodes exposed to the internet (entry points).
    """
    entry_points = []
    for node_id, data in graph.nodes(data=True):
        if data.get("internet_exposed", False):
            entry_points.append({
                "asset_id": node_id,
                "asset_name": data.get("name", node_id),
                "asset_type": data.get("type", "Unknown"),
                "criticality": data.get("criticality", 5),
                "max_cvss": data.get("max_cvss", 0.0),
                "vuln_count": data.get("vuln_count", 0),
            })
    return entry_points


def get_critical_targets(graph: nx.DiGraph, min_criticality: int = 8) -> List[Dict[str, Any]]:
    """
    Returns list of target assets matching high criticality or sensitive data criteria.
    """
    targets = []
    for node_id, data in graph.nodes(data=True):
        if data.get("criticality", 0) >= min_criticality or data.get("data_sensitivity") == "High":
            targets.append({
                "asset_id": node_id,
                "asset_name": data.get("name", node_id),
                "asset_type": data.get("type", "Unknown"),
                "criticality": data.get("criticality", 5),
                "service_name": data.get("service_name", ""),
                "downtime_cost_per_hour": data.get("downtime_cost_per_hour", 0.0),
                "data_sensitivity": data.get("data_sensitivity", "Medium"),
            })
    return targets


class GraphBuilderService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir

    def execute(self, *args, **kwargs) -> Dict[str, Any]:
        graph = build_attack_graph(self.data_dir)
        entry_points = get_entry_points(graph)
        critical_targets = get_critical_targets(graph)
        return {
            "status": "success",
            "nodes_count": graph.number_of_nodes(),
            "edges_count": graph.number_of_edges(),
            "entry_points_count": len(entry_points),
            "critical_targets_count": len(critical_targets),
        }

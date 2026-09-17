# app/services/attack_graph/risk_paths.py

import logging
from typing import List, Dict, Any
import networkx as nx
from app.utils.type_parsers import parse_criticality, parse_float, parse_int

logger = logging.getLogger(__name__)


def rank_attack_paths(graph: nx.DiGraph, raw_paths: List[List[str]]) -> List[Dict[str, Any]]:
    """
    Ranks attack paths based on transparent, deterministic scoring using asset criticality,
    vulnerability severity, path hop count, and known exploitation signals.
    """
    ranked_paths: List[Dict[str, Any]] = []

    for idx, path in enumerate(raw_paths, start=1):
        if not path or len(path) < 2:
            continue

        src_id = path[0]
        tgt_id = path[-1]

        if src_id not in graph or tgt_id not in graph:
            continue

        src_data = graph.nodes[src_id]
        tgt_data = graph.nodes[tgt_id]

        path_length = len(path) - 1  # number of hops
        max_cvss = 0.0
        max_criticality = 0
        has_known_exploit = False
        total_vulns = 0
        asset_details = []


        for node_id in path:
            node_data = graph.nodes[node_id]
            node_cvss = parse_float(node_data.get("max_cvss", 0.0))
            node_crit = parse_criticality(node_data.get("criticality", 5))
            node_exploit = bool(node_data.get("has_known_exploited", False))
            node_vuln_count = parse_int(node_data.get("vuln_count", 0))

            if node_cvss > max_cvss:
                max_cvss = node_cvss
            if node_crit > max_criticality:
                max_criticality = node_crit
            if node_exploit:
                has_known_exploit = True

            total_vulns += node_vuln_count

            asset_details.append({
                "asset_id": node_id,
                "asset_name": str(node_data.get("name", node_id)),
                "asset_type": str(node_data.get("type", "Unknown")),
                "criticality": node_crit,
                "max_cvss": node_cvss,
                "has_known_exploited": node_exploit,
                "vuln_count": node_vuln_count,
            })

        # Deterministic transparent path scoring formula (0.00 to 1.00)
        cvss_component = (max_cvss / 10.0) * 0.40
        crit_component = (max_criticality / 10.0) * 0.35
        length_factor = (1.0 / max(1, path_length)) * 0.15
        exploit_bonus = 0.10 if has_known_exploit else 0.00

        raw_score = cvss_component + crit_component + length_factor + exploit_bonus
        score = round(min(1.00, raw_score), 2)

        ranked_paths.append({
            "path_id": f"PATH-E{src_id}-T{tgt_id}-{idx:03d}",
            "source_asset": {
                "id": src_id,
                "name": str(src_data.get("name", src_id)),
                "type": str(src_data.get("type", "Unknown")),
            },
            "target_asset": {
                "id": tgt_id,
                "name": str(tgt_data.get("name", tgt_id)),
                "type": str(tgt_data.get("type", "Unknown")),
            },
            "asset_path": asset_details,
            "path_length": path_length,
            "score": score,
            "max_cvss": max_cvss,
            "vulnerabilities_encountered": total_vulns,
            "has_known_exploit": has_known_exploit,
        })

    # Sort paths descending by score, then ascending by path length
    ranked_paths.sort(key=lambda p: (-p["score"], p["path_length"]))
    return ranked_paths


class RiskPathsService:
    def execute(self, graph: nx.DiGraph, raw_paths: List[List[str]], *args, **kwargs) -> List[Dict[str, Any]]:
        return rank_attack_paths(graph, raw_paths)

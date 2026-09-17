# app/api/attack_paths.py

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Depends

from app.services.attack_graph.graph_builder import (
    build_attack_graph,
    get_entry_points,
    get_critical_targets,
)
from app.services.attack_graph.path_finder import find_attack_paths
from app.services.attack_graph.risk_paths import rank_attack_paths
from app.schemas.attack_path import AttackGraphResponseSchema, AttackGraphSummarySchema
from app.utils.type_parsers import parse_criticality, parse_float, parse_int

router = APIRouter(prefix="/attack-paths", tags=["attack_paths"])


@router.get("", response_model=AttackGraphResponseSchema)
@router.get("/", response_model=AttackGraphResponseSchema)
def get_attack_paths_analysis(
    max_path_length: int = Query(5, ge=1, le=10, description="Maximum hops per attack path"),
    min_criticality: int = Query(8, ge=1, le=10, description="Minimum criticality score for target assets"),
    data_dir: Optional[str] = Query(None, description="Custom data directory path"),
):
    """
    Builds the infrastructure DiGraph, discovers attack paths from internet-exposed
    entry points to high-value target assets, ranks paths, and returns structured graph & path metrics.
    """
    try:
        graph = build_attack_graph(data_dir=data_dir)
        entry_points = get_entry_points(graph)
        critical_targets = get_critical_targets(graph, min_criticality=min_criticality)

        ep_ids = [ep["asset_id"] for ep in entry_points]
        target_ids = [ct["asset_id"] for ct in critical_targets]

        raw_paths = find_attack_paths(
            graph,
            entry_point_ids=ep_ids,
            target_asset_ids=target_ids,
            max_path_length=max_path_length,
        )

        critical_paths = rank_attack_paths(graph, raw_paths)


        # Format node list for Pydantic schema
        nodes_list = []
        for n_id, d in graph.nodes(data=True):
            nodes_list.append({
                "id": n_id,
                "name": str(d.get("name", n_id)),
                "type": str(d.get("type", "Unknown")),
                "criticality": parse_criticality(d.get("criticality", 5)),
                "internet_exposed": bool(d.get("internet_exposed", False)),
                "environment": str(d.get("environment", "Production")),
                "owner": d.get("owner"),
                "service_id": d.get("service_id"),
                "service_name": d.get("service_name"),
                "max_cvss": parse_float(d.get("max_cvss", 0.0)),
                "vuln_count": parse_int(d.get("vuln_count", 0)),
            })

        # Format edge list for Pydantic schema
        edges_list = []
        for u, v, d in graph.edges(data=True):
            edges_list.append({
                "source": u,
                "target": v,
                "relationship": str(d.get("relationship", "connects_to")),
                "access_type": str(d.get("access_type", "Internal")),
            })

        summary = AttackGraphSummarySchema(
            total_nodes=graph.number_of_nodes(),
            total_edges=graph.number_of_edges(),
            entry_points_count=len(entry_points),
            target_assets_count=len(critical_targets),
            critical_paths_count=len(critical_paths),
        )

        return AttackGraphResponseSchema(
            summary=summary,
            nodes=nodes_list,
            edges=edges_list,
            entry_points=entry_points,
            target_assets=critical_targets,
            critical_paths=critical_paths,
        )
    except FileNotFoundError as fnfe:
        raise HTTPException(status_code=404, detail=str(fnfe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Attack graph processing error: {str(e)}")


@router.get("/graph")
def get_attack_graph_topology(data_dir: Optional[str] = Query(None)):
    """
    Returns bare graph topology (nodes and edges) for visual graph components.
    """
    try:
        graph = build_attack_graph(data_dir=data_dir)
        nodes = [{"id": n, **d} for n, d in graph.nodes(data=True)]
        edges = [{"source": u, "target": v, **d} for u, v, d in graph.edges(data=True)]
        return {
            "status": "success",
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "nodes": nodes,
            "edges": edges,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

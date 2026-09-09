# app/services/risk_engine/impact.py

import os
import logging
from typing import Dict, Any, Optional
import pandas as pd
from app.services.attack_graph.graph_builder import resolve_data_dir

logger = logging.getLogger(__name__)


class MissingImpactDataError(Exception):
    """
    Raised when a risk scenario has no way to derive a real financial impact.
    This must propagate — it should never be swallowed into a fabricated number.
    """
    def __init__(self, scenario_id: Optional[str] = None, reason: str = ""):
        self.scenario_id = scenario_id
        self.reason = reason
        super().__init__(
            f"Cannot resolve financial impact for scenario '{scenario_id}': {reason}"
        )


ASSET_TYPE_MAP = {
    "database": "Database",
    "web server": "Web Server",
    "identity server": "Identity Server",
    "application server": "Application Server",
    "cloud workload": "Cloud Workload",
    "endpoint": "Endpoint",
    "network device": "Network Device",
}


def _load_impacts_df(data_dir: str) -> pd.DataFrame:
    impact_file = os.path.join(data_dir, "threat_asset_impacts.csv")
    if not os.path.exists(impact_file):
        return pd.DataFrame()
    df = pd.read_csv(impact_file)
    # Coerce numeric columns explicitly so malformed cells become NaN we can
    # detect and skip, instead of silently poisoning downstream sums.
    for col in ("min_value", "likely_value", "max_value"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def _match_impact_rows(df: pd.DataFrame, threat_id: str, asset_type: str) -> pd.DataFrame:
    """
    Looks up (threat_id, asset_type) rows. Only exact or explicitly-mapped
    asset-type matches are allowed — deliberately NO threat-id-only fallback,
    since that can silently sum costs from unrelated asset types into one total.
    """
    clean_threat = str(threat_id).strip().upper()
    clean_asset_type = str(asset_type).strip()

    mask = (df["threat_id"].str.strip().str.upper() == clean_threat) & (
        df["asset_type"].str.strip().str.lower() == clean_asset_type.lower()
    )
    matched = df[mask]

    if matched.empty:
        mapped = ASSET_TYPE_MAP.get(clean_asset_type.lower())
        if mapped:
            mask2 = (df["threat_id"].str.strip().str.upper() == clean_threat) & (
                df["asset_type"].str.strip().str.lower() == mapped.lower()
            )
            matched = df[mask2]

    return matched


def resolve_triangular_financial_impact(
    threat_id: str,
    asset_type: str,
    service_data: Optional[Dict[str, Any]] = None,
    scenario_row: Optional[Dict[str, Any]] = None,
    data_dir: Optional[str] = None,
    scenario_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Resolves component-level and total triangular financial impact (min, likely, max).

    Resolution order (first valid source wins):
    1. threat_asset_impacts.csv — exact or explicitly-mapped asset-type match
    2. Direct financial_impact on the scenario row
    3. Business service downtime_cost_per_hour x estimated_downtime_hours

    Raises MissingImpactDataError if none of the above produce real data.
    There is no synthetic default — an unquantifiable scenario must be
    surfaced as missing data, never assigned an invented number.
    """
    svc = service_data or {}
    scen = scenario_row or {}
    data_path = resolve_data_dir(data_dir)
    scenario_id = scenario_id or scen.get("scenario_id")

    components: Dict[str, Dict[str, float]] = {}
    total_min = 0.0
    total_likely = 0.0
    total_max = 0.0
    source: Optional[str] = None

    # ---- 1. threat_asset_impacts.csv lookup -------------------------------
    impacts_df = _load_impacts_df(data_path)
    if not impacts_df.empty:
        matched_rows = _match_impact_rows(impacts_df, threat_id, asset_type)

        if not matched_rows.empty:
            downtime_cost_per_hour = float(svc.get("downtime_cost_per_hour", 0.0))

            for _, row in matched_rows.iterrows():
                imp_type = str(row.get("impact_type", "other")).strip().lower()
                unit = str(row.get("unit", "INR")).strip().upper()

                min_val, likely_val, max_val = row.get("min_value"), row.get("likely_value"), row.get("max_value")

                if pd.isna(min_val) or pd.isna(likely_val) or pd.isna(max_val):
                    logger.warning(
                        "Skipping malformed impact row for threat=%s asset_type=%s "
                        "impact_type=%s — non-numeric min/likely/max value.",
                        threat_id, asset_type, imp_type,
                    )
                    continue

                min_val, likely_val, max_val = float(min_val), float(likely_val), float(max_val)

                if unit == "HOURS" or imp_type == "downtime":
                    if downtime_cost_per_hour <= 0:
                        logger.warning(
                            "Downtime impact row for threat=%s asset_type=%s requires "
                            "downtime_cost_per_hour but none is set on the business "
                            "service — skipping this component rather than guessing.",
                            threat_id, asset_type,
                        )
                        continue
                    min_val *= downtime_cost_per_hour
                    likely_val *= downtime_cost_per_hour
                    max_val *= downtime_cost_per_hour

                # Sum duplicate impact_type rows into the existing component
                # instead of overwriting — keeps the displayed breakdown
                # consistent with the reported total.
                if imp_type in components:
                    logger.warning(
                        "Duplicate impact_type '%s' for threat=%s asset_type=%s — "
                        "summing into the existing component.",
                        imp_type, threat_id, asset_type,
                    )
                    components[imp_type]["min"] += round(min_val, 2)
                    components[imp_type]["likely"] += round(likely_val, 2)
                    components[imp_type]["max"] += round(max_val, 2)
                else:
                    components[imp_type] = {
                        "min": round(min_val, 2),
                        "likely": round(likely_val, 2),
                        "max": round(max_val, 2),
                    }

                total_min += min_val
                total_likely += likely_val
                total_max += max_val

            if total_likely > 0:
                source = "threat_asset_impacts_csv"

    # ---- 2. Direct financial_impact on the scenario row -------------------
    if source is None:
        direct = scen.get("financial_impact")
        try:
            direct = float(direct) if direct is not None else 0.0
        except (TypeError, ValueError):
            direct = 0.0

        if direct > 0:
            # No invented multiplier ratios. If min/max weren't explicitly
            # supplied, report a degenerate (min=likely=max) range rather
            # than guessing a spread — that's honest about what we know.
            scen_min = scen.get("financial_impact_min")
            scen_max = scen.get("financial_impact_max")
            total_min = float(scen_min) if scen_min is not None else direct
            total_likely = direct
            total_max = float(scen_max) if scen_max is not None else direct
            source = "scenario_direct_financial_impact"

    # ---- 3. Business service downtime derivation ---------------------------
    if source is None:
        downtime_cost_per_hour = float(svc.get("downtime_cost_per_hour", 0.0))
        estimated_downtime_hours = svc.get("estimated_downtime_hours")
        if downtime_cost_per_hour > 0 and estimated_downtime_hours:
            hours = float(estimated_downtime_hours)
            total_likely = downtime_cost_per_hour * hours
            total_min = total_likely
            total_max = total_likely
            source = "business_service_downtime"
            logger.info(
                "Impact for scenario '%s' derived from downtime cost only "
                "(no real min/max range) — reporting a degenerate "
                "min=likely=max triangular distribution instead of a fabricated spread.",
                scenario_id,
            )

    # ---- No real data anywhere — do not fabricate a number ------------------
    if source is None:
        logger.warning(
            "Missing financial impact data for scenario '%s' (threat=%s, asset_type=%s) — "
            "no threat_asset_impacts.csv match, no direct scenario impact, and no "
            "usable business-service downtime data.",
            scenario_id, threat_id, asset_type,
        )
        raise MissingImpactDataError(
            scenario_id=scenario_id,
            reason=(
                "no threat_asset_impacts match, scenario-level financial_impact, "
                "or business-service downtime data available"
            ),
        )

    return {
        "min": round(total_min, 2),
        "likely": round(total_likely, 2),
        "max": round(max(total_max, total_likely), 2),
        "components": components,
        "source": source,
    }


def resolve_financial_impact(
    service_data: Optional[Dict[str, Any]] = None,
    threat_data: Optional[Dict[str, Any]] = None,
    scenario_row: Optional[Dict[str, Any]] = None,
) -> float:
    """Returns the point-estimate (likely) impact. Raises MissingImpactDataError if unresolvable."""
    scen = scenario_row or {}
    threat_id = scen.get("threat_id") or (threat_data or {}).get("threat_id")
    asset_type = scen.get("asset_type") or "Server"

    if not threat_id:
        raise MissingImpactDataError(
            scenario_id=scen.get("scenario_id"),
            reason="no threat_id available to look up impact data",
        )

    triangular = resolve_triangular_financial_impact(
        threat_id=threat_id,
        asset_type=asset_type,
        service_data=service_data,
        scenario_row=scenario_row,
    )
    return triangular["likely"]


class ImpactService:
    def execute(
        self,
        threat_id: str,
        asset_type: str,
        service_data: Optional[Dict[str, Any]] = None,
        scenario_row: Optional[Dict[str, Any]] = None,
        *args,
        **kwargs,
    ) -> Dict[str, Any]:
        return resolve_triangular_financial_impact(
            threat_id=threat_id,
            asset_type=asset_type,
            service_data=service_data,
            scenario_row=scenario_row,
        )
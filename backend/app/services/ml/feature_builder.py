# app/services/ml/feature_builder.py

from dataclasses import dataclass
from datetime import date, datetime
from typing import Dict, Any, List, Optional, Union
from app.utils.type_parsers import parse_criticality, parse_float, parse_int

# Exact input contract array
FEATURE_ORDER = [
    "cvss_score",
    "exploitability",
    "known_exploited",
    "vulnerability_age_days",
    "internet_exposed",
    "asset_criticality",
    "attack_path_reachable",
    "attack_path_length",
    "path_strength",
    "control_coverage",
    "control_maturity",
    "threat_activity",
]

EXPLOITABILITY_MAP = {"low": 0.2, "medium": 0.5, "high": 0.9}


class FeatureBuildError(Exception):
    """Raised when a required field can't be resolved from joined records."""
    pass


def _require(value: Any, field_name: str) -> Any:
    if value is None:
        raise FeatureBuildError(f"Cannot resolve required field: {field_name}")
    return value


@dataclass
class RawRecords:
    """Shape of the raw joined input expected by the model pipeline."""
    vulnerability: dict
    asset: dict
    attack_path: dict
    controls: list
    threat: dict


def extract_exploitability_score(exploitability_val: Any) -> float:
    """Converts exploitability string or float into numerical rating."""
    if isinstance(exploitability_val, (int, float)):
        return float(exploitability_val)
    label_key = str(exploitability_val).strip().lower()
    if label_key in EXPLOITABILITY_MAP:
        return EXPLOITABILITY_MAP[label_key]
    if label_key in ["critical", "1.0", "1"]:
        return 0.9
    if label_key in ["med", "0.5"]:
        return 0.5
    if label_key in ["low", "0.2"]:
        return 0.2
    return 0.5


def build_feature_vector(
    records: Optional[RawRecords] = None,
    asset_data: Optional[Dict[str, Any]] = None,
    vuln_data: Optional[Dict[str, Any]] = None,
    control_status_list: Optional[List[Dict[str, Any]]] = None,
    threat_data: Optional[Dict[str, Any]] = None,
    attack_path_info: Optional[Dict[str, Any]] = None,
    attack_path_length: int = 2,
    as_of: Optional[date] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Returns a dict of {feature_name: value} adhering strictly to FEATURE_ORDER.
    Supports both RawRecords dataclass input and structured dictionary keyword arguments.
    """
    as_of_date = as_of or date.today()

    if records is not None:
        vuln = records.vulnerability or {}
        asset = records.asset or {}
        path = records.attack_path or {}
        threat = records.threat or {}
        controls = records.controls or []
    else:
        vuln = vuln_data or {}
        asset = asset_data or {}
        path = attack_path_info or {}
        threat = threat_data or {}
        controls = control_status_list or []

    # --- vulnerability fields ---
    cvss_raw = vuln.get("cvss_score", 5.0)
    cvss_score = float(_require(cvss_raw, "cvss_score"))

    exploit_raw = vuln.get("exploitability_label", vuln.get("exploitability", "Medium"))
    exploitability = extract_exploitability_score(exploit_raw)

    ke_raw = vuln.get("known_exploited", False)
    if isinstance(ke_raw, str):
        known_exploited = 1 if ke_raw.strip().lower() in ["yes", "true", "1"] else 0
    else:
        known_exploited = 1 if bool(ke_raw) else 0

    if "disclosure_date" in vuln and vuln["disclosure_date"] is not None:
        disc_date = vuln["disclosure_date"]
        if isinstance(disc_date, str):
            disc_date = datetime.strptime(disc_date, "%Y-%m-%d").date()
        vulnerability_age_days = (as_of_date - disc_date).days
        if vulnerability_age_days < 0:
            raise FeatureBuildError("vulnerability_age_days computed as negative")
    else:
        vulnerability_age_days = parse_int(vuln.get("days_open", vuln.get("vulnerability_age_days", 30)))

    # --- asset fields ---
    ie_raw = asset.get("internet_exposed", False)
    if isinstance(ie_raw, str):
        internet_exposed = 1 if ie_raw.strip().lower() in ["yes", "true", "1"] else 0
    else:
        internet_exposed = 1 if bool(ie_raw) else 0

    crit_raw = asset.get("criticality", asset.get("asset_criticality", 5))
    asset_criticality = parse_criticality(crit_raw)
    if not (1 <= asset_criticality <= 10):
        raise FeatureBuildError("asset_criticality out of range 1-10")

    # --- attack path fields ---
    reachable_raw = path.get("reachable", path.get("attack_path_reachable", True))
    attack_path_reachable = 1 if bool(reachable_raw) else 0

    length_raw = path.get("length", path.get("attack_path_length", attack_path_length))
    attack_path_length_val = parse_int(length_raw, default=2)

    default_strength = round(min(1.0, (cvss_score / 10.0) * 0.6 + (asset_criticality / 10.0) * 0.4), 2)
    strength_raw = path.get("path_strength", path.get("strength", default_strength))
    path_strength = float(strength_raw)

    # --- control fields ---
    if controls:
        implemented_count = 0
        maturities = []
        coverages = []

        for c in controls:
            if isinstance(c, dict):
                is_impl = c.get("implemented", False)
                status_str = str(c.get("status", "")).strip().lower()
                if is_impl or status_str == "implemented":
                    implemented_count += 1
                    cov = parse_float(c.get("coverage", 0.85))
                    mat = parse_float(c.get("maturity", 4.0))
                    coverages.append(cov)
                    maturities.append(mat)
                elif status_str == "partially implemented":
                    coverages.append(parse_float(c.get("coverage", 0.45)))
                    maturities.append(parse_float(c.get("maturity", 2.0)))

        control_coverage = float(len(coverages) / len(controls)) if len(controls) > 0 else 0.0
        if maturities:
            avg_mat = sum(maturities) / len(maturities)
            control_maturity = float(round(avg_mat / 5.0, 2) if avg_mat > 1.0 else round(avg_mat, 2))
        else:
            control_maturity = 0.0
    else:
        control_coverage = 0.5
        control_maturity = 0.5

    # --- threat fields ---
    act_raw = threat.get("activity_score", threat.get("activity_level", 0.5))
    if isinstance(act_raw, (int, float)):
        threat_activity = float(act_raw)
    else:
        act_str = str(act_raw).strip().lower()
        if act_str in ["high", "critical", "1.0", "1"]:
            threat_activity = 0.85
        elif act_str in ["medium", "med", "0.5"]:
            threat_activity = 0.50
        elif act_str in ["low", "0.2"]:
            threat_activity = 0.20
        else:
            threat_activity = 0.50

    vector = {
        "cvss_score": float(cvss_score),
        "exploitability": float(exploitability),
        "known_exploited": known_exploited,
        "vulnerability_age_days": int(vulnerability_age_days),
        "internet_exposed": internet_exposed,
        "asset_criticality": int(asset_criticality),
        "attack_path_reachable": attack_path_reachable,
        "attack_path_length": int(attack_path_length_val),
        "path_strength": float(path_strength),
        "control_coverage": float(control_coverage),
        "control_maturity": float(control_maturity),
        "threat_activity": float(threat_activity),
    }

    assert set(vector.keys()) == set(FEATURE_ORDER)
    return vector


def vector_to_ordered_list(vector: dict) -> list:
    """Model input must be a plain ordered list, not a dict."""
    return [vector[name] for name in FEATURE_ORDER]

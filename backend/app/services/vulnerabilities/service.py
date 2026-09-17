# app/services/vulnerabilities/service.py

import os
import csv
import logging
from typing import List, Dict, Any, Optional

from app.utils.type_parsers import parse_float, parse_int

logger = logging.getLogger(__name__)

def get_vulnerabilities_list(data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Parses vulnerabilities.csv and computes financial exposure, risk priority scores,
    and asset impact links for all vulnerabilities.
    """
    base_dir = data_dir or os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")
    vuln_path = os.path.join(base_dir, "vulnerabilities.csv")
    rules_path = os.path.join(base_dir, "vulnerability_threat_rules.csv")
    assets_path = os.path.join(base_dir, "assets.csv")

    if not os.path.exists(vuln_path):
        return []

    # Map threat rules to vulnerabilities
    threat_rules: Dict[str, List[str]] = {}
    if os.path.exists(rules_path):
        with open(rules_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                vid = row.get("vulnerability_id", "").strip()
                tid = row.get("threat_id", "").strip()
                if vid and tid:
                    threat_rules.setdefault(vid, []).append(tid)

    # Asset lookup
    assets_count = 0
    if os.path.exists(assets_path):
        with open(assets_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            assets_count = len(list(reader))

    vulnerabilities = []
    with open(vuln_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cvss = parse_float(row.get("cvss_score", 5.0), default=5.0)
            known_exp = str(row.get("known_exploited", "0")).strip().lower() in ("1", "true", "yes")
            days_open = parse_int(row.get("days_open", 30), default=30)
            
            # Severity text
            if cvss >= 9.0:
                severity = "Critical"
            elif cvss >= 7.0:
                severity = "High"
            elif cvss >= 4.0:
                severity = "Medium"
            else:
                severity = "Low"

            # Compute backend Priority Score (0-100)
            exploit_multiplier = 1.4 if known_exp else 1.0
            age_factor = min(1.3, 1.0 + (days_open / 365.0))
            priority_score = round(min(100.0, cvss * 10.0 * exploit_multiplier * age_factor), 1)

            # Estimate financial exposure per CVE
            base_exposure = cvss * 150000.0 * (2.0 if known_exp else 1.0)

            vid = row.get("vulnerability_id", "").strip()
            cve_id = row.get("cve_id", vid)

            vulnerabilities.append({
                "vulnerability_id": vid,
                "cve": cve_id,
                "cve_id": cve_id,
                "title": f"{cve_id} - {row.get('vulnerability_type', 'Vulnerability')}",
                "description": f"Security flaw in {row.get('vulnerability_type', 'System')} with CVSS {cvss}.",
                "cvss_score": cvss,
                "cvss": cvss,
                "severity": severity,
                "known_exploited": known_exp,
                "days_open": days_open,
                "patch_available": True,
                "affected_assets_count": max(1, min(assets_count, parse_int(cvss, default=1))),
                "priority_score": priority_score,
                "financial_exposure": base_exposure,
                "threat_scenarios_linked": threat_rules.get(vid, []),
                "remediation_effort": "Low" if days_open < 30 else ("Medium" if days_open < 90 else "High"),
            })

    # Sort descending by priority_score
    vulnerabilities.sort(key=lambda v: v["priority_score"], reverse=True)
    return vulnerabilities

class VulnerabilityService:
    def get_all(self, data_dir: Optional[str] = None) -> List[Dict[str, Any]]:
        return get_vulnerabilities_list(data_dir=data_dir)

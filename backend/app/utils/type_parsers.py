# app/utils/type_parsers.py

import re
from typing import Any
import pandas as pd


def parse_criticality(val: Any, default: int = 5) -> int:
    """
    Safely converts criticality input (which may be int, float, or string like
    'High', 'Medium', 'Low', 'Critical', '8/10', '10/10') into an integer between 1 and 10.
    """
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    if isinstance(val, (int, float)):
        return max(1, min(10, int(round(float(val)))))

    s = str(val).strip()
    if not s:
        return default

    s_lower = s.lower()
    mapping = {
        "critical": 10,
        "crit": 10,
        "high": 8,
        "medium": 5,
        "med": 5,
        "low": 3,
        "info": 1,
        "none": 1,
    }
    if s_lower in mapping:
        return mapping[s_lower]

    if "/" in s:
        parts = s.split("/")
        try:
            num = float(parts[0].strip())
            den = float(parts[1].strip())
            if den > 0:
                if den == 5.0:
                    return max(1, min(10, int(round(num * 2))))
                return max(1, min(10, int(round(num))))
        except Exception:
            pass

    match = re.search(r"[-+]?\d*\.\d+|\d+", s)
    if match:
        try:
            num = float(match.group())
            return max(1, min(10, int(round(num))))
        except Exception:
            pass

    return default


def parse_float(val: Any, default: float = 0.0) -> float:
    """
    Safely parses floats from numbers or strings (e.g. '62%', '3.2 / 5', '₹15L', '1.5 Cr', 'High').
    """
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return default
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s:
        return default

    # If it's a known text rating
    s_lower = s.lower()
    text_ratings = {
        "critical": 10.0,
        "high": 8.0,
        "medium": 5.0,
        "low": 3.0,
        "info": 1.0,
        "none": 0.0,
    }
    if s_lower in text_ratings:
        return text_ratings[s_lower]

    s_clean = s.replace(",", "").replace("%", "")

    multiplier = 1.0
    if "cr" in s_clean.lower():
        multiplier = 10000000.0
        s_clean = re.sub(r"[^\d\.]", "", s_clean)
    elif "l" in s_clean.lower() or "lakh" in s_clean.lower():
        multiplier = 100000.0
        s_clean = re.sub(r"[^\d\.]", "", s_clean)

    if "/" in s_clean:
        parts = s_clean.split("/")
        try:
            num = float(parts[0].strip())
            den = float(parts[1].strip())
            if den > 0:
                return (num / den) * 100.0 if den <= 5.0 else num
        except Exception:
            pass

    match = re.search(r"[-+]?\d*\.\d+|\d+", s_clean)
    if match:
        try:
            return float(match.group()) * multiplier
        except Exception:
            pass

    return default


def parse_int(val: Any, default: int = 0) -> int:
    """
    Safely converts any value to int.
    """
    try:
        f = parse_float(val, default=float(default))
        return int(round(f))
    except Exception:
        return default


def sanitize_numeric_column(series: pd.Series, default: float = 0.0) -> pd.Series:
    """
    Safely converts a pandas Series with text/string dtypes into numeric float values.
    """
    if series is None or series.empty:
        return pd.Series(dtype=float)
    return series.apply(lambda x: parse_float(x, default=default))

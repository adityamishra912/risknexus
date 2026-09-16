# app/services/monte_carlo/metrics.py

from typing import Dict, Any, List, Optional
import numpy as np


def summarize_losses(losses: np.ndarray, include_raw: bool = False) -> Dict[str, Any]:
    """Turns a raw simulated-loss array into the standard reporting metrics.

    Args:
        losses:      Array of simulated annual loss values.
        include_raw: If True, include the full raw_losses list in output
                     (used by the /risk/loss-distribution endpoint to build
                     the empirical exceedance curve). Defaults to False to
                     avoid serializing 10,000 floats on every API call.
    """
    result: Dict[str, Any] = {
        "mean_eal": round(float(np.mean(losses)), 2),
        "std_eal":  round(float(np.std(losses)), 2),
        "p50":      round(float(np.percentile(losses, 50)), 2),
        "p90":      round(float(np.percentile(losses, 90)), 2),
        "p95":      round(float(np.percentile(losses, 95)), 2),
        "p99":      round(float(np.percentile(losses, 99)), 2),
        "max_loss": round(float(np.max(losses)), 2),
    }
    if include_raw:
        result["raw_losses"] = [round(float(x), 2) for x in losses]
    return result
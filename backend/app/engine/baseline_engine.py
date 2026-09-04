"""
Baseline vs Proposed Process Comparison Engine
================================================
Implements synthetic comparison metrics for the COE project evaluation.

Baseline  : Manual / reactive process — delays identified only after they
            become substantial or someone notices them.
Proposed  : Early-warning rule engine (this system) — alerts before delays
            become critical.

All figures are computed from synthetic data.
Clearly labelled as PROTOTYPE / SYNTHETIC EXPERIMENT RESULTS.
"""

import statistics
from datetime import datetime, timezone

from app.engine.delay_engine import calculate_test_delay, estimate_los_bottleneck


# ── Baseline simulation parameters ────────────────────────────────────────────
# In the manual process, detection happens on average N hours later.
BASELINE_DETECTION_LAG_HOURS = 6.0     # avg extra time before a delay is noticed manually
BASELINE_ESCALATION_LAG_HOURS = 4.0    # avg extra time before escalation in manual process
PROPOSED_DETECTION_LAG_HOURS = 0.5     # automated alert fires within ~30 min


def compute_baseline_metrics(patients: list, tests: list) -> dict:
    """
    Simulate baseline (manual) process metrics from the provided dataset.
    Returns a dict describing average LOS bottleneck, delays, etc.
    """
    assessments = []
    for test in tests:
        a = calculate_test_delay(test)
        a["patient_id"] = test.get("patient_id")
        a["test_id"] = test.get("_id") or test.get("test_id")
        assessments.append(a)

    blocker_delays = [
        a["delay_hours"] + BASELINE_DETECTION_LAG_HOURS
        for a in assessments
        if a.get("is_discharge_blocker") and a.get("delay_hours", 0) > 0
    ]

    all_delays = [
        a["delay_hours"] + BASELINE_DETECTION_LAG_HOURS
        for a in assessments
        if a.get("delay_hours", 0) > 0
    ]

    return {
        "process_label": "Baseline (Manual/Reactive)",
        "detection_lag_hours": BASELINE_DETECTION_LAG_HOURS,
        "total_tests_assessed": len(assessments),
        "total_delayed_tests": len([a for a in assessments if a.get("delay_hours", 0) > 0]),
        "avg_diagnostic_delay_hours": round(statistics.mean(all_delays), 2) if all_delays else 0.0,
        "median_diagnostic_delay_hours": round(statistics.median(all_delays), 2) if all_delays else 0.0,
        "total_los_bottleneck_hours": round(sum(blocker_delays), 2),
        "avg_los_bottleneck_hours_per_patient": round(
            sum(blocker_delays) / max(len(set(a["patient_id"] for a in assessments if a.get("patient_id"))), 1), 2
        ),
        "high_risk_count": len([a for a in assessments if a.get("risk_level") == "HIGH"]),
        "discharge_blockers": len([a for a in assessments if a.get("is_discharge_blocker")]),
        "note": "SYNTHETIC EXPERIMENT — not real hospital data.",
    }


def compute_proposed_metrics(patients: list, tests: list) -> dict:
    """
    Compute proposed (early-warning) process metrics.
    """
    assessments = []
    for test in tests:
        a = calculate_test_delay(test)
        a["patient_id"] = test.get("patient_id")
        a["test_id"] = test.get("_id") or test.get("test_id")
        assessments.append(a)

    blocker_delays = [
        a["delay_hours"] + PROPOSED_DETECTION_LAG_HOURS
        for a in assessments
        if a.get("is_discharge_blocker") and a.get("delay_hours", 0) > 0
    ]

    all_delays = [
        a["delay_hours"] + PROPOSED_DETECTION_LAG_HOURS
        for a in assessments
        if a.get("delay_hours", 0) > 0
    ]

    return {
        "process_label": "Proposed (Early-Warning Rule Engine)",
        "detection_lag_hours": PROPOSED_DETECTION_LAG_HOURS,
        "total_tests_assessed": len(assessments),
        "total_delayed_tests": len([a for a in assessments if a.get("delay_hours", 0) > 0]),
        "avg_diagnostic_delay_hours": round(statistics.mean(all_delays), 2) if all_delays else 0.0,
        "median_diagnostic_delay_hours": round(statistics.median(all_delays), 2) if all_delays else 0.0,
        "total_los_bottleneck_hours": round(sum(blocker_delays), 2),
        "avg_los_bottleneck_hours_per_patient": round(
            sum(blocker_delays) / max(len(set(a["patient_id"] for a in assessments if a.get("patient_id"))), 1), 2
        ),
        "high_risk_count": len([a for a in assessments if a.get("risk_level") == "HIGH"]),
        "discharge_blockers": len([a for a in assessments if a.get("is_discharge_blocker")]),
        "note": "SYNTHETIC EXPERIMENT — not real hospital data.",
    }


def compute_comparison(patients: list, tests: list) -> dict:
    """Full baseline vs proposed comparison dict."""
    baseline = compute_baseline_metrics(patients, tests)
    proposed = compute_proposed_metrics(patients, tests)

    def _pct_improvement(base_val, prop_val):
        if base_val == 0:
            return 0.0
        return round((base_val - prop_val) / base_val * 100, 1)

    metrics = [
        {
            "metric": "Avg Diagnostic Delay (hours)",
            "baseline": baseline["avg_diagnostic_delay_hours"],
            "proposed": proposed["avg_diagnostic_delay_hours"],
            "improvement_pct": _pct_improvement(
                baseline["avg_diagnostic_delay_hours"],
                proposed["avg_diagnostic_delay_hours"]
            ),
            "unit": "hours",
        },
        {
            "metric": "Total LOS Bottleneck Hours",
            "baseline": baseline["total_los_bottleneck_hours"],
            "proposed": proposed["total_los_bottleneck_hours"],
            "improvement_pct": _pct_improvement(
                baseline["total_los_bottleneck_hours"],
                proposed["total_los_bottleneck_hours"]
            ),
            "unit": "hours",
        },
        {
            "metric": "Avg LOS Bottleneck per Patient (hours)",
            "baseline": baseline["avg_los_bottleneck_hours_per_patient"],
            "proposed": proposed["avg_los_bottleneck_hours_per_patient"],
            "improvement_pct": _pct_improvement(
                baseline["avg_los_bottleneck_hours_per_patient"],
                proposed["avg_los_bottleneck_hours_per_patient"]
            ),
            "unit": "hours/patient",
        },
        {
            "metric": "Detection Lag (hours)",
            "baseline": baseline["detection_lag_hours"],
            "proposed": proposed["detection_lag_hours"],
            "improvement_pct": _pct_improvement(
                baseline["detection_lag_hours"],
                proposed["detection_lag_hours"]
            ),
            "unit": "hours",
        },
    ]

    return {
        "baseline": baseline,
        "proposed": proposed,
        "comparison_table": metrics,
        "summary": {
            "los_hours_saved": round(
                baseline["total_los_bottleneck_hours"] - proposed["total_los_bottleneck_hours"], 2
            ),
            "improvement_pct": _pct_improvement(
                baseline["total_los_bottleneck_hours"],
                proposed["total_los_bottleneck_hours"]
            ),
        },
        "disclaimer": (
            "All results are from a SYNTHETIC prototype experiment using generated data. "
            "They do not represent real clinical or operational outcomes."
        ),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Error / Prediction Analysis
# ─────────────────────────────────────────────────────────────────────────────
def compute_error_analysis(tests: list) -> dict:
    """
    Compare the engine's predicted risk level against the stored
    'actual_risk_level' (ground truth from synthetic data) to generate
    precision, recall, F1 and a breakdown by failure reason.
    """
    tp = fp = fn = tn = 0
    false_positives = []
    false_negatives = []
    missing_data_cases = []
    conflict_cases = []
    correct = []
    missed = []

    for test in tests:
        assessed = calculate_test_delay(test)
        predicted_risk = assessed["risk_level"]
        actual_risk = test.get("actual_risk_level", "LOW")
        patient_id = test.get("patient_id", "N/A")
        test_id = test.get("_id") or test.get("test_id", "N/A")

        # Data quality flags
        if assessed["data_issues"]:
            for issue in assessed["data_issues"]:
                if "Missing" in issue:
                    missing_data_cases.append({
                        "test_id": test_id,
                        "patient_id": patient_id,
                        "issue": issue,
                    })
                if "Data quality" in issue:
                    conflict_cases.append({
                        "test_id": test_id,
                        "patient_id": patient_id,
                        "issue": issue,
                    })

        # Binary: HIGH = positive, other = negative
        pred_pos = predicted_risk == "HIGH"
        actual_pos = actual_risk == "HIGH"

        if pred_pos and actual_pos:
            tp += 1
            correct.append({"test_id": test_id, "patient_id": patient_id, "outcome": "True Positive"})
        elif pred_pos and not actual_pos:
            fp += 1
            false_positives.append({
                "test_id": test_id,
                "patient_id": patient_id,
                "predicted": predicted_risk,
                "actual": actual_risk,
                "reason": f"Engine flagged HIGH; actual was {actual_risk}. Possible over-sensitive threshold.",
                "marked_false_positive": test.get("marked_false_positive", False),
            })
        elif not pred_pos and actual_pos:
            fn += 1
            false_negatives.append({
                "test_id": test_id,
                "patient_id": patient_id,
                "predicted": predicted_risk,
                "actual": actual_risk,
                "reason": _fn_reason(assessed, test),
            })
            missed.append({"test_id": test_id, "patient_id": patient_id, "outcome": "False Negative"})
        else:
            tn += 1
            correct.append({"test_id": test_id, "patient_id": patient_id, "outcome": "True Negative"})

    precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
    recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
    accuracy = round((tp + tn) / (tp + tn + fp + fn), 4) if (tp + tn + fp + fn) > 0 else 0.0
    f1 = round(2 * precision * recall / (precision + recall), 4) if (precision + recall) > 0 else 0.0

    return {
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
        "true_negatives": tn,
        "precision": precision,
        "recall": recall,
        "accuracy": accuracy,
        "f1_score": f1,
        "total_assessed": len(tests),
        "false_positive_details": false_positives[:20],
        "false_negative_details": false_negatives[:20],
        "missing_data_cases": missing_data_cases[:20],
        "conflicting_timestamp_cases": conflict_cases[:20],
        "note": "Metrics calculated on SYNTHETIC validation dataset only.",
    }


def _fn_reason(assessed: dict, test: dict) -> str:
    parts = []
    if not test.get("specialist_available"):
        parts.append("specialist availability data may be missing")
    if assessed["data_issues"]:
        parts.append(f"data issues: {'; '.join(assessed['data_issues'])}")
    if assessed["delay_hours"] < 4:
        parts.append(f"delay ({assessed['delay_hours']}h) below HIGH threshold, but ground truth says HIGH")
    return "Prediction missed HIGH risk — " + "; ".join(parts) if parts else "Delay below HIGH threshold in proposed engine."

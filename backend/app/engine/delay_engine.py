"""
Diagnostic Delay & Risk Engine
================================
Transparent rule-based algorithm. No black-box ML.

Rules are intentionally readable so the system can explain every decision.
"""

from datetime import datetime, timezone
from typing import Optional

# ─── Configurable thresholds (hours) ─────────────────────────────────────────
THRESHOLDS = {
    "low_medium": 4.0,          # delay < 4 h  → LOW
    "medium_high": 8.0,         # delay >= 8 h → HIGH
    "specimen_urgent": 1.0,     # urgent test: flag specimen delay after 1 h
    "specimen_normal": 2.0,     # normal test: flag specimen delay after 2 h
    "scan_delay": 2.0,
    "report_delay": 4.0,
    "doctor_review_delay": 2.0,
    "specialist_delay": 3.0,
}


def _now():
    return datetime.now(timezone.utc)


def _safe_parse(ts):
    """Parse ISO timestamp string → aware datetime, or None on failure."""
    if ts is None:
        return None
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts
    try:
        from dateutil import parser as dp
        dt = dp.parse(str(ts))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _hours(start, end=None) -> Optional[float]:
    """Return elapsed hours between two timestamps (or start→now)."""
    s = _safe_parse(start)
    if s is None:
        return None
    e = _safe_parse(end) if end else _now()
    if e is None:
        return None
    delta = (e - s).total_seconds() / 3600
    if delta < 0:
        return None          # conflicting timestamps
    return round(delta, 2)


def _ts_conflict(ts_a, ts_b) -> bool:
    """Return True if ts_b is strictly before ts_a (data quality issue)."""
    a = _safe_parse(ts_a)
    b = _safe_parse(ts_b)
    if a and b:
        return b < a
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Core delay calculation for a single test record
# ─────────────────────────────────────────────────────────────────────────────
def calculate_test_delay(test: dict) -> dict:
    """
    Analyse one test/scan record and return a structured delay assessment.

    Input fields (all optional/nullable):
        test_order_time, specimen_time, scan_start_time,
        report_time, doctor_review_time,
        specialist_required, specialist_available,
        urgency, test_type, status, discharge_blocker

    Output:
        delay_type        – human-readable label
        delay_hours       – float (hours of delay)
        is_discharge_blocker – bool
        risk_level        – LOW / MEDIUM / HIGH
        confidence        – 0-100
        confidence_reason – plain English explanation
        data_issues       – list of data-quality messages
        stage             – current pipeline stage
        explanation       – full plain-English summary
    """
    result = {
        "delay_type": "No Delay",
        "delay_hours": 0.0,
        "is_discharge_blocker": bool(test.get("discharge_blocker", False)),
        "risk_level": "LOW",
        "confidence": 90,
        "confidence_reason": "All timestamps available.",
        "data_issues": [],
        "stage": "Unknown",
        "explanation": "",
    }

    urgency = str(test.get("urgency", "normal")).lower()
    is_urgent = urgency in ("urgent", "critical", "high", "stat")
    specialist_required = bool(test.get("specialist_required", False))
    specialist_available = bool(test.get("specialist_available", True))
    test_type = test.get("test_type", "Lab Test")
    is_scan = test_type.lower() in ("ct scan", "mri", "x-ray", "ultrasound", "scan", "echo")

    # ── timestamps ──────────────────────────────────────────────
    t_order = _safe_parse(test.get("test_order_time"))
    t_specimen = _safe_parse(test.get("specimen_time"))
    t_scan = _safe_parse(test.get("scan_start_time"))
    t_report = _safe_parse(test.get("report_time"))
    t_review = _safe_parse(test.get("doctor_review_time"))
    now = _now()

    # ── data-quality checks ──────────────────────────────────────
    missing_fields = []
    if t_order is None:
        missing_fields.append("test_order_time")
    if is_scan and t_scan is None and t_report is None:
        missing_fields.append("scan_start_time")
    if not is_scan and t_specimen is None and t_report is None:
        missing_fields.append("specimen_time")

    if missing_fields:
        result["data_issues"].append(f"Missing timestamps: {', '.join(missing_fields)}")
        result["confidence"] = max(30, result["confidence"] - 20 * len(missing_fields))
        result["confidence_reason"] = f"Confidence reduced because {', '.join(missing_fields)} timestamp(s) are missing."

    # Conflicting timestamps
    conflicts = []
    if _ts_conflict(t_order, t_specimen):
        conflicts.append("specimen_time is before test_order_time")
    if _ts_conflict(t_specimen, t_report):
        conflicts.append("report_time is before specimen_time")
    if _ts_conflict(t_scan, t_report):
        conflicts.append("report_time is before scan_start_time")
    if _ts_conflict(t_report, t_review):
        conflicts.append("doctor_review_time is before report_time")

    if conflicts:
        result["data_issues"].extend([f"Data quality issue: {c}" for c in conflicts])
        result["confidence"] = max(20, result["confidence"] - 15)
        result["confidence_reason"] = "Confidence reduced due to conflicting timestamps."

    # Cannot calculate without order time
    if t_order is None:
        result["delay_type"] = "Insufficient Data"
        result["stage"] = "Unknown"
        result["explanation"] = "Insufficient data: test_order_time is missing."
        result["risk_level"] = "LOW"
        result["confidence"] = 20
        return result

    # ── Stage determination & delay calculation ──────────────────
    delay_hours = 0.0
    delay_type = "In Progress"
    stage = "Ordered"

    if is_scan:
        # --- Scan pathway ---
        if t_scan is None and t_report is None:
            # Scan not started
            delay_hours = _hours(t_order) or 0.0
            threshold = THRESHOLDS["specimen_urgent"] if is_urgent else THRESHOLDS["scan_delay"]
            if delay_hours >= threshold:
                delay_type = "Scan Delay"
                stage = "Scan Pending"
            else:
                delay_type = "Scan Scheduled"
                stage = "Scan Pending"
        elif t_scan is not None and t_report is None:
            # Scan started but no report
            delay_hours = _hours(t_scan) or 0.0
            threshold = THRESHOLDS["report_delay"]
            if delay_hours >= threshold:
                delay_type = "Report Pending"
                stage = "Processing"
            else:
                delay_type = "Processing"
                stage = "Processing"
        elif t_report is not None and t_review is None:
            # Report ready but doctor hasn't reviewed
            delay_hours = _hours(t_report) or 0.0
            threshold = THRESHOLDS["doctor_review_delay"]
            if delay_hours >= threshold:
                delay_type = "Doctor Review Pending"
                stage = "Report Generated"
            else:
                delay_type = "Awaiting Doctor Review"
                stage = "Report Generated"
        elif t_review is not None:
            if specialist_required and not specialist_available:
                delay_hours = _hours(t_review) or 0.0
                delay_type = "Specialist Availability Delay"
                stage = "Specialist Review"
            elif specialist_required and specialist_available:
                delay_type = "Specialist Review Pending"
                stage = "Specialist Review"
                delay_hours = _hours(t_review) or 0.0
            else:
                delay_type = "Completed"
                stage = "Completed"
                delay_hours = 0.0
    else:
        # --- Lab / other test pathway ---
        if t_specimen is None and t_report is None:
            # Specimen not collected
            delay_hours = _hours(t_order) or 0.0
            threshold = THRESHOLDS["specimen_urgent"] if is_urgent else THRESHOLDS["specimen_normal"]
            if delay_hours >= threshold:
                delay_type = "Specimen Collection Delay"
                stage = "Specimen Pending"
            else:
                delay_type = "Awaiting Specimen"
                stage = "Specimen Pending"
        elif t_specimen is not None and t_report is None:
            # Specimen collected but no report
            delay_hours = _hours(t_specimen) or 0.0
            threshold = THRESHOLDS["report_delay"]
            if delay_hours >= threshold:
                delay_type = "Report Pending"
                stage = "Processing"
            else:
                delay_type = "Processing"
                stage = "Processing"
        elif t_report is not None and t_review is None:
            delay_hours = _hours(t_report) or 0.0
            threshold = THRESHOLDS["doctor_review_delay"]
            if delay_hours >= threshold:
                delay_type = "Doctor Review Pending"
                stage = "Report Generated"
            else:
                delay_type = "Awaiting Doctor Review"
                stage = "Report Generated"
        elif t_review is not None:
            if specialist_required and not specialist_available:
                delay_hours = _hours(t_review) or 0.0
                delay_type = "Specialist Availability Delay"
                stage = "Specialist Review"
            elif specialist_required and specialist_available:
                delay_type = "Specialist Review Pending"
                stage = "Specialist Review"
                delay_hours = _hours(t_review) or 0.0
            else:
                delay_type = "Completed"
                stage = "Completed"
                delay_hours = 0.0

    result["delay_type"] = delay_type
    result["delay_hours"] = round(max(delay_hours, 0.0), 2)
    result["stage"] = stage

    # ── Risk classification ──────────────────────────────────────
    risk, confidence = _classify_risk(
        delay_hours=result["delay_hours"],
        delay_type=delay_type,
        is_discharge_blocker=result["is_discharge_blocker"],
        is_urgent=is_urgent,
        specialist_required=specialist_required,
        specialist_available=specialist_available,
        data_issues=result["data_issues"],
        confidence_base=result["confidence"],
    )
    result["risk_level"] = risk
    result["confidence"] = confidence

    # ── Explanation ──────────────────────────────────────────────
    result["explanation"] = _build_explanation(result, test_type, is_urgent)

    return result


def _classify_risk(
    delay_hours, delay_type, is_discharge_blocker,
    is_urgent, specialist_required, specialist_available,
    data_issues, confidence_base
) -> tuple:
    """Return (risk_level, confidence_pct)."""

    # Base risk from delay duration
    if delay_hours < THRESHOLDS["low_medium"]:
        risk = "LOW"
        conf = 90
    elif delay_hours < THRESHOLDS["medium_high"]:
        risk = "MEDIUM"
        conf = 85
    else:
        risk = "HIGH"
        conf = 88

    # Escalation factors
    if is_discharge_blocker:
        if risk == "LOW":
            risk = "MEDIUM"
        elif risk == "MEDIUM":
            risk = "HIGH"
        conf = min(conf + 5, 97)

    if is_urgent:
        if risk == "LOW":
            risk = "MEDIUM"
        elif risk == "MEDIUM" and delay_hours >= THRESHOLDS["low_medium"]:
            risk = "HIGH"
        conf = min(conf + 3, 97)

    if specialist_required and not specialist_available:
        if risk != "HIGH":
            risk = "HIGH"
        conf = min(conf + 4, 97)

    # De-escalate for data issues (less certain)
    if data_issues:
        conf = max(conf - 10, 20)

    # Normalise confidence to [20, 97]
    conf = max(20, min(97, int(confidence_base * 0.3 + conf * 0.7)))

    return risk, conf


def _build_explanation(result: dict, test_type: str, is_urgent: bool) -> str:
    parts = []
    dt = result["delay_type"]
    dh = result["delay_hours"]
    risk = result["risk_level"]
    blocker = result["is_discharge_blocker"]
    issues = result["data_issues"]

    if dt == "Completed":
        return "Diagnostic test completed. No active delay."
    if dt == "Insufficient Data":
        return "Insufficient data to calculate delay. Please check timestamps."

    if dh > 0:
        parts.append(f"{test_type} has a current delay of {dh:.1f} hours (stage: {result['stage']}).")
    if blocker:
        parts.append("This test is blocking patient discharge.")
    if is_urgent:
        parts.append("Test is marked URGENT.")
    if dt == "Specialist Availability Delay":
        parts.append("Specialist is required but currently unavailable.")
    if issues:
        parts.append("Data quality notes: " + "; ".join(issues) + ".")

    parts.append(f"Risk assessed as {risk} with {result['confidence']}% model confidence (PROTOTYPE — not clinically validated).")
    return " ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Patient-level risk aggregation
# ─────────────────────────────────────────────────────────────────────────────
def aggregate_patient_risk(tests: list) -> dict:
    """
    Given a list of test delay-assessment dicts, return the patient-level
    summary: worst risk, total delay hours, discharge blocked, etc.
    """
    if not tests:
        return {
            "risk_level": "LOW",
            "confidence": 50,
            "total_delay_hours": 0.0,
            "is_discharge_blocked": False,
            "active_delay_count": 0,
            "explanation": "No active diagnostics.",
        }

    risk_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    worst_risk = "LOW"
    worst_conf = 50
    total_delay = 0.0
    blocked = False
    active = 0
    reasons = []

    for t in tests:
        r = t.get("risk_level", "LOW")
        if risk_order.get(r, 0) > risk_order.get(worst_risk, 0):
            worst_risk = r
            worst_conf = t.get("confidence", 50)
        if t.get("is_discharge_blocker"):
            blocked = True
        dh = t.get("delay_hours", 0.0) or 0.0
        total_delay += dh
        if dh > 0:
            active += 1
        if t.get("delay_type") not in ("Completed", "No Delay", "In Progress", "Insufficient Data"):
            reasons.append(t.get("delay_type", ""))

    return {
        "risk_level": worst_risk,
        "confidence": worst_conf,
        "total_delay_hours": round(total_delay, 2),
        "is_discharge_blocked": blocked,
        "active_delay_count": active,
        "explanation": "; ".join(set(reasons)) if reasons else "No significant delays.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# LOS bottleneck metric (used in baseline vs proposed comparison)
# ─────────────────────────────────────────────────────────────────────────────
def estimate_los_bottleneck(tests: list) -> float:
    """
    Estimate the LOS hours attributable to unresolved diagnostic bottlenecks
    for a given set of test assessments.
    """
    total = 0.0
    for t in tests:
        if t.get("is_discharge_blocker") and t.get("delay_type") not in ("Completed", "No Delay"):
            total += t.get("delay_hours", 0.0) or 0.0
    return round(total, 2)

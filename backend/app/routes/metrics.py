"""Dashboard metrics, baseline comparison and error analysis routes."""
import statistics
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt

from app.database import get_db
from app.engine.delay_engine import calculate_test_delay, aggregate_patient_risk
from app.engine.baseline_engine import compute_comparison, compute_error_analysis

metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    db = get_db()

    patients = db.patients.find({})
    active_patients = [p for p in patients if p.get("status") == "admitted"]
    total_patients = db.patients.count_documents({})

    beds = db.beds.find({})
    total_beds = len(beds)
    occupied_beds = sum(1 for b in beds if b.get("status") == "occupied")
    available_beds = total_beds - occupied_beds
    occupancy_pct = round(occupied_beds / total_beds * 100, 1) if total_beds > 0 else 0

    all_tests = db.tests.find({})
    pending_tests = [t for t in all_tests if t.get("status") not in ("completed",)]

    # Re-compute test assessments
    all_tests_raw = db.tests.find({})
    assessments = [calculate_test_delay(t) for t in all_tests_raw]
    delayed_tests = [a for a in assessments if a.get("delay_hours", 0) > 0 and a.get("delay_type") not in ("Completed", "No Delay", "In Progress")]
    discharge_blockers = [a for a in assessments if a.get("is_discharge_blocker")]
    high_risk = [p for p in db.patients.find({}) if p.get("risk_level") == "HIGH" and p.get("status") == "admitted"]

    avg_delay = round(statistics.mean([a["delay_hours"] for a in delayed_tests]), 2) if delayed_tests else 0.0
    los_bottleneck = round(sum(a["delay_hours"] for a in discharge_blockers), 2)

    # LOS calculation for active patients
    los_values = []
    for p in db.patients.find({"status": "admitted"}):
        try:
            from dateutil import parser as dp
            admit = dp.parse(p["admission_time"])
            now = datetime.now(timezone.utc)
            if admit.tzinfo is None:
                admit = admit.replace(tzinfo=timezone.utc)
            los_values.append((now - admit).total_seconds() / 3600)
        except Exception:
            pass
    avg_los = round(statistics.mean(los_values), 1) if los_values else 0.0

    # Delay by test type
    from collections import defaultdict
    delay_by_type = defaultdict(list)
    for t in db.tests.find({}):
        a = calculate_test_delay(t)
        if a.get("delay_hours", 0) > 0:
            delay_by_type[t.get("test_type", "Unknown")].append(a["delay_hours"])
    delay_by_type_summary = [
        {"test_type": k, "avg_delay_hours": round(statistics.mean(v), 2), "count": len(v)}
        for k, v in delay_by_type.items()
    ]
    delay_by_type_summary.sort(key=lambda x: -x["avg_delay_hours"])

    # Risk distribution
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for p in db.patients.find({"status": "admitted"}):
        risk_dist[p.get("risk_level", "LOW")] = risk_dist.get(p.get("risk_level", "LOW"), 0) + 1

    # Discharge blockers by reason
    blocker_reasons = defaultdict(int)
    for p in db.patients.find({"is_discharge_blocked": True}):
        reason = p.get("discharge_blocker_reason", "Unknown")
        blocker_reasons[reason] += 1

    # Alert counts
    active_alerts = db.alerts.count_documents({"status": {"$in": ["active", "escalated", "acknowledged"]}})

    return jsonify({
        "summary": {
            "total_patients": total_patients,
            "active_admissions": len(active_patients),
            "occupied_beds": occupied_beds,
            "available_beds": available_beds,
            "bed_occupancy_pct": occupancy_pct,
            "pending_tests": len(pending_tests),
            "delayed_diagnostics": len(delayed_tests),
            "high_risk_patients": len(high_risk),
            "discharge_blockers": len(discharge_blockers),
            "avg_diagnostic_delay_hours": avg_delay,
            "los_bottleneck_hours": los_bottleneck,
            "avg_los_hours": avg_los,
            "active_alerts": active_alerts,
        },
        "charts": {
            "delay_by_test_type": delay_by_type_summary[:10],
            "risk_distribution": [
                {"name": k, "value": v} for k, v in risk_dist.items()
            ],
            "discharge_blocker_reasons": [
                {"reason": k, "count": v} for k, v in blocker_reasons.items()
            ],
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }), 200


@metrics_bp.route("/metrics", methods=["GET"])
@jwt_required()
def metrics():
    db = get_db()
    all_tests = db.tests.find({})
    assessments = [calculate_test_delay(t) for t in all_tests]

    delay_vals = [a["delay_hours"] for a in assessments if a.get("delay_hours", 0) > 0]
    avg_delay = round(statistics.mean(delay_vals), 2) if delay_vals else 0.0
    med_delay = round(statistics.median(delay_vals), 2) if delay_vals else 0.0
    blocker_delays = [a["delay_hours"] for a in assessments if a.get("is_discharge_blocker") and a.get("delay_hours", 0) > 0]
    los_bottleneck = round(sum(blocker_delays), 2)

    # Baseline comparison for LOS
    all_patients_raw = db.patients.find({})
    all_tests_raw2 = db.tests.find({})
    comparison = compute_comparison(list(all_patients_raw), list(all_tests_raw2))
    error_data = compute_error_analysis(list(db.tests.find({})))

    # LOS for admitted patients
    los_values = []
    for p in db.patients.find({"status": "admitted"}):
        try:
            from dateutil import parser as dp
            admit = dp.parse(p["admission_time"])
            now_dt = datetime.now(timezone.utc)
            if admit.tzinfo is None:
                admit = admit.replace(tzinfo=timezone.utc)
            los_values.append((now_dt - admit).total_seconds() / 3600)
        except Exception:
            pass
    avg_los = round(statistics.mean(los_values), 1) if los_values else 0.0

    return jsonify({
        "total_patients": db.patients.count_documents({}),
        "active_patients": db.patients.count_documents({"status": "admitted"}),
        "avg_diagnostic_delay_hours": avg_delay,
        "median_diagnostic_delay_hours": med_delay,
        "high_risk_cases": db.patients.count_documents({"risk_level": "HIGH", "status": "admitted"}),
        "discharge_blockers": db.patients.count_documents({"is_discharge_blocked": True}),
        "avg_los_hours": avg_los,
        "los_bottleneck_hours": los_bottleneck,
        "baseline_los_bottleneck_hours": comparison["baseline"]["total_los_bottleneck_hours"],
        "proposed_los_bottleneck_hours": comparison["proposed"]["total_los_bottleneck_hours"],
        "hours_saved": comparison["summary"]["los_hours_saved"],
        "improvement_pct": comparison["summary"]["improvement_pct"],
        "precision": error_data["precision"],
        "recall": error_data["recall"],
        "f1_score": error_data["f1_score"],
        "accuracy": error_data["accuracy"],
        "false_positive_count": error_data["false_positives"],
        "false_negative_count": error_data["false_negatives"],
        "note": "All metrics are from SYNTHETIC data. Not real clinical outcomes.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }), 200


@metrics_bp.route("/baseline", methods=["GET"])
@jwt_required()
def baseline():
    db = get_db()
    all_patients = list(db.patients.find({}))
    all_tests = list(db.tests.find({}))
    result = compute_comparison(all_patients, all_tests)
    return jsonify(result), 200


@metrics_bp.route("/error-analysis", methods=["GET"])
@jwt_required()
def error_analysis():
    db = get_db()
    all_tests = list(db.tests.find({}))
    result = compute_error_analysis(all_tests)
    return jsonify(result), 200


@metrics_bp.route("/beds", methods=["GET"])
@jwt_required()
def beds():
    db = get_db()
    all_beds = db.beds.find({})
    ward_summary = {}
    for b in all_beds:
        ward = b.get("ward", "Unknown")
        if ward not in ward_summary:
            ward_summary[ward] = {"ward": ward, "total": 0, "occupied": 0, "available": 0}
        ward_summary[ward]["total"] += 1
        if b.get("status") == "occupied":
            ward_summary[ward]["occupied"] += 1
        else:
            ward_summary[ward]["available"] += 1

    beds_list = db.beds.find({})
    return jsonify({
        "beds": list(beds_list),
        "ward_summary": list(ward_summary.values()),
    }), 200

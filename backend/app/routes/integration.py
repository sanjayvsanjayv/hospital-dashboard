"""
Integration stubs — simulate a hospital information system (HIS).
These endpoints return synthetic data and are clearly labelled as stubs.
They are NOT connected to any real hospital system.
"""
import random
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt

integration_bp = Blueprint("integration", __name__)

_STUB_BANNER = "INTEGRATION STUB — Synthetic data only. Not connected to any real hospital system."

NOW = datetime.now(timezone.utc)


def _require_admin():
    """Return a 403 response if the caller is not an admin, else None."""
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Access restricted to admin role."}), 403
    return None


def _dt(h_ago=0):
    return (NOW - timedelta(hours=h_ago)).isoformat()


@integration_bp.route("/test-orders", methods=["GET"])
@jwt_required()
def test_orders():
    err = _require_admin()
    if err: return err
    orders = []
    for i in range(1, 11):
        test_type = random.choice(["Full Blood Count", "CT Scan", "MRI", "Liver Function Test", "Renal Profile"])
        orders.append({
            "order_id": f"HIS-ORD-{i:04d}",
            "patient_id": f"PAT-{random.randint(1, 25):05d}",
            "test_type": test_type,
            "urgency": random.choice(["routine", "urgent"]),
            "ordered_by": "Dr. Priya Sharma",
            "ordered_at": _dt(random.uniform(0.5, 12)),
            "status": random.choice(["pending", "in_progress", "completed"]),
            "source_system": "HIS (Stub)",
        })
    return jsonify({"stub": True, "banner": _STUB_BANNER, "test_orders": orders}), 200


@integration_bp.route("/lab-results", methods=["GET"])
@jwt_required()
def lab_results():
    err = _require_admin()
    if err: return err
    results = []
    for i in range(1, 11):
        results.append({
            "result_id": f"HIS-RES-{i:04d}",
            "order_id": f"HIS-ORD-{i:04d}",
            "patient_id": f"PAT-{random.randint(1, 25):05d}",
            "test_type": random.choice(["Full Blood Count", "Liver Function Test", "Renal Profile", "Blood Culture"]),
            "result_summary": "Within normal limits" if random.random() > 0.3 else "Abnormal — review required",
            "reported_at": _dt(random.uniform(0, 6)),
            "reported_by": "Lab Tech Ravi",
            "status": "reported",
            "source_system": "LIS (Stub)",
        })
    return jsonify({"stub": True, "banner": _STUB_BANNER, "lab_results": results}), 200


@integration_bp.route("/scan-status", methods=["GET"])
@jwt_required()
def scan_status():
    err = _require_admin()
    if err: return err
    scans = []
    for i in range(1, 8):
        status = random.choice(["scheduled", "in_progress", "completed", "delayed"])
        scans.append({
            "scan_id": f"HIS-SCN-{i:04d}",
            "patient_id": f"PAT-{random.randint(1, 25):05d}",
            "scan_type": random.choice(["CT Scan", "MRI", "X-Ray", "Ultrasound"]),
            "scheduled_at": _dt(random.uniform(1, 8)),
            "started_at": _dt(random.uniform(0, 4)) if status != "scheduled" else None,
            "completed_at": _dt(random.uniform(0, 2)) if status == "completed" else None,
            "radiologist": "Dr. Mohan Das",
            "report_available": status == "completed",
            "status": status,
            "source_system": "RIS (Stub)",
        })
    return jsonify({"stub": True, "banner": _STUB_BANNER, "scans": scans}), 200


@integration_bp.route("/specialist-availability", methods=["GET"])
@jwt_required()
def specialist_availability():
    err = _require_admin()
    if err: return err
    specialists = [
        {"name": "Dr. Kavitha Iyer",  "specialty": "Cardiology",       "available": True,  "next_available": None},
        {"name": "Dr. Sanjay Bose",   "specialty": "Neurology",        "available": False, "next_available": _dt(-4)},
        {"name": "Dr. Leela Rao",     "specialty": "Gastroenterology", "available": True,  "next_available": None},
        {"name": "Dr. Mohan Das",     "specialty": "Nephrology",       "available": False, "next_available": _dt(-8)},
        {"name": "Dr. Sunita Verma",  "specialty": "Haematology",      "available": True,  "next_available": None},
    ]
    return jsonify({
        "stub": True,
        "banner": _STUB_BANNER,
        "specialists": specialists,
        "generated_at": NOW.isoformat(),
    }), 200

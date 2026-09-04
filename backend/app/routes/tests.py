"""Diagnostic test routes."""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.database import get_db
from app.engine.delay_engine import calculate_test_delay

tests_bp = Blueprint("tests", __name__)


@tests_bp.route("", methods=["GET"])
@jwt_required()
def list_tests():
    claims = get_jwt()
    role = claims.get("role", "nurse")
    db = get_db()

    filt = {}
    patient_id = request.args.get("patient_id")
    status = request.args.get("status")
    urgency = request.args.get("urgency")
    delay_type = request.args.get("delay_type")

    if patient_id:
        filt["patient_id"] = patient_id
    if status:
        filt["status"] = status
    if urgency:
        filt["urgency"] = urgency

    raw = db.tests.find(filt)

    enriched = []
    for t in raw:
        a = calculate_test_delay(t)
        t.update({
            "delay_type": a["delay_type"],
            "delay_hours": a["delay_hours"],
            "risk_level": a["risk_level"],
            "confidence": a["confidence"],
            "stage": a["stage"],
            "explanation": a["explanation"],
            "data_issues": a["data_issues"],
        })
        if delay_type and t.get("delay_type") != delay_type:
            continue
        # Role-based field restriction for lab staff
        if role == "lab":
            t = {k: t[k] for k in ["_id", "test_id", "patient_id", "test_type", "urgency",
                                     "status", "stage", "delay_type", "delay_hours",
                                     "specimen_time", "scan_start_time", "report_time",
                                     "lab_department", "explanation"] if k in t}
        enriched.append(t)

    return jsonify({"tests": enriched, "total": len(enriched)}), 200


@tests_bp.route("/<test_id>", methods=["GET"])
@jwt_required()
def get_test(test_id):
    db = get_db()
    t = db.tests.find_one({"test_id": test_id})
    if not t:
        t = db.tests.find_one({"_id": test_id})
    if not t:
        return jsonify({"error": "Test not found."}), 404
    a = calculate_test_delay(t)
    t.update(a)
    return jsonify({"test": t}), 200


@tests_bp.route("", methods=["POST"])
@jwt_required()
def create_test():
    claims = get_jwt()
    role = claims.get("role", "nurse")
    if role not in ("admin", "doctor", "nurse"):
        return jsonify({"error": "Insufficient permissions."}), 403

    data = request.get_json(silent=True) or {}
    db = get_db()

    count = db.tests.count_documents({})
    test_id = f"TST-{(count + 1):05d}"
    now = datetime.now(timezone.utc).isoformat()

    test = {
        "_id": test_id,
        "test_id": test_id,
        "patient_id": data.get("patient_id"),
        "test_type": data.get("test_type", "Lab Test"),
        "urgency": data.get("urgency", "routine"),
        "test_order_time": data.get("test_order_time", now),
        "specimen_time": data.get("specimen_time"),
        "scan_start_time": data.get("scan_start_time"),
        "report_time": data.get("report_time"),
        "doctor_review_time": data.get("doctor_review_time"),
        "specialist_required": data.get("specialist_required", False),
        "specialist_available": data.get("specialist_available", True),
        "discharge_blocker": data.get("discharge_blocker", False),
        "status": "pending",
        "actual_risk_level": "LOW",
        "assigned_to": data.get("assigned_to"),
        "lab_department": data.get("lab_department", "Laboratory"),
        "marked_false_positive": False,
        "created_at": now,
        "updated_at": now,
    }

    a = calculate_test_delay(test)
    test.update({
        "predicted_delay_hours": a["delay_hours"],
        "predicted_risk_level": a["risk_level"],
        "prediction_confidence": a["confidence"],
        "delay_type": a["delay_type"],
        "stage": a["stage"],
    })

    db.tests.insert_one(test)

    # Add test to patient
    patient_id = test.get("patient_id")
    if patient_id:
        db.patients.update_one(
            {"patient_id": patient_id},
            {"$push": {"test_ids": test_id}}
        )

    return jsonify({"test": test, "message": "Test order created."}), 201


@tests_bp.route("/<test_id>/status", methods=["PUT"])
@jwt_required()
def update_test_status(test_id):
    claims = get_jwt()
    role = claims.get("role", "nurse")
    if role not in ("admin", "doctor", "nurse", "lab", "specialist"):
        return jsonify({"error": "Insufficient permissions."}), 403

    data = request.get_json(silent=True) or {}
    db = get_db()

    t = db.tests.find_one({"test_id": test_id})
    if not t:
        t = db.tests.find_one({"_id": test_id})
    if not t:
        return jsonify({"error": "Test not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    updates = {"updated_at": now}

    allowed_updates = ["status", "specimen_time", "scan_start_time", "report_time",
                       "doctor_review_time", "specialist_required", "specialist_available",
                       "discharge_blocker", "actual_risk_level", "marked_false_positive"]

    for k in allowed_updates:
        if k in data:
            updates[k] = data[k]

    # Auto-set timestamps based on status transitions
    new_status = data.get("status", t.get("status"))
    if new_status == "specimen_collected" and not t.get("specimen_time"):
        updates["specimen_time"] = now
    if new_status == "scan_started" and not t.get("scan_start_time"):
        updates["scan_start_time"] = now
    if new_status == "report_ready" and not t.get("report_time"):
        updates["report_time"] = now
    if new_status == "doctor_reviewed" and not t.get("doctor_review_time"):
        updates["doctor_review_time"] = now
    if new_status == "completed":
        updates["discharge_blocker"] = False

    db.tests.update_one({"_id": t["_id"]}, {"$set": updates})

    updated_test = db.tests.find_one({"_id": t["_id"]})
    assessment = calculate_test_delay(updated_test)
    db.tests.update_one({"_id": t["_id"]}, {"$set": {
        "delay_type": assessment["delay_type"],
        "stage": assessment["stage"],
        "predicted_delay_hours": assessment["delay_hours"],
        "predicted_risk_level": assessment["risk_level"],
        "prediction_confidence": assessment["confidence"],
        "explanation": assessment["explanation"],
    }})

    # Re-aggregate patient risk
    patient_id = updated_test.get("patient_id")
    if patient_id:
        from app.engine.delay_engine import aggregate_patient_risk
        all_tests = db.tests.find({"patient_id": patient_id})
        assessments = [calculate_test_delay(tt) for tt in all_tests]
        agg = aggregate_patient_risk(assessments)
        db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "risk_level": agg["risk_level"],
                "risk_confidence": agg["confidence"],
                "risk_explanation": agg["explanation"],
                "total_delay_hours": agg["total_delay_hours"],
                "is_discharge_blocked": agg["is_discharge_blocked"],
                "updated_at": now,
            }}
        )

    final = db.tests.find_one({"_id": t["_id"]})
    a2 = calculate_test_delay(final)
    final.update(a2)
    return jsonify({"test": final, "message": "Test status updated."}), 200

"""Alert and escalation routes."""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.database import get_db

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("", methods=["GET"])
@jwt_required()
def list_alerts():
    claims = get_jwt()
    role = claims.get("role", "nurse")
    db = get_db()

    filt = {}
    status = request.args.get("status")
    severity = request.args.get("severity")
    alert_type = request.args.get("alert_type")
    patient_id = request.args.get("patient_id")

    if status:
        filt["status"] = status
    if severity:
        filt["severity"] = severity
    if alert_type:
        filt["alert_type"] = alert_type
    if patient_id:
        filt["patient_id"] = patient_id

    # Role-based filtering: lab staff only see test-related alerts
    if role == "lab":
        filt["alert_type"] = {"$in": ["SPECIMEN_COLLECTION_DELAY", "SCAN_DELAY",
                                       "REPORT_DELAY", "REPORT_PENDING"]}

    alerts = db.alerts.find(filt)
    return jsonify({"alerts": alerts, "total": len(alerts)}), 200


@alerts_bp.route("/<alert_id>", methods=["GET"])
@jwt_required()
def get_alert(alert_id):
    db = get_db()
    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404
    return jsonify({"alert": alert}), 200


@alerts_bp.route("/<alert_id>/acknowledge", methods=["POST"])
@jwt_required()
def acknowledge_alert(alert_id):
    claims = get_jwt()
    db = get_db()

    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    data = request.get_json(silent=True) or {}

    db.alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "status": "acknowledged",
            "acknowledged_by": claims.get("name") or claims.get("sub"),
            "acknowledged_at": now,
        }}
    )
    if data.get("note"):
        db.alerts.update_one(
            {"_id": alert["_id"]},
            {"$push": {"notes": {
                "text": data["note"],
                "by": claims.get("name") or claims.get("sub"),
                "at": now,
            }}}
        )

    return jsonify({"message": "Alert acknowledged."}), 200


@alerts_bp.route("/<alert_id>/escalate", methods=["POST"])
@jwt_required()
def escalate_alert(alert_id):
    claims = get_jwt()
    db = get_db()

    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "Escalated due to unresolved delay.")
    to_role = data.get("to_role", "doctor")

    count = db.escalations.count_documents({})
    esc_id = f"ESC-{(count + 1):05d}"

    escalation = {
        "_id": esc_id,
        "escalation_id": esc_id,
        "alert_id": alert_id,
        "patient_id": alert.get("patient_id"),
        "from_role": claims.get("role"),
        "from_name": claims.get("name") or claims.get("sub"),
        "to_role": to_role,
        "reason": reason,
        "status": "open",
        "timestamp": now,
        "resolved_by": None,
        "resolved_at": None,
        "comments": [],
    }
    db.escalations.insert_one(escalation)

    db.alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "escalated": True,
            "status": "escalated",
            "assigned_to": to_role,
        },
         "$push": {"notes": {
             "text": f"Escalated to {to_role}: {reason}",
             "by": claims.get("name") or claims.get("sub"),
             "at": now,
         }}}
    )

    return jsonify({"escalation": escalation, "message": "Alert escalated."}), 201


@alerts_bp.route("/<alert_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_alert(alert_id):
    claims = get_jwt()
    db = get_db()

    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    data = request.get_json(silent=True) or {}
    note = data.get("note", "Resolved.")

    db.alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "status": "resolved",
            "resolved": True,
            "resolved_by": claims.get("name") or claims.get("sub"),
            "resolved_at": now,
        },
         "$push": {"notes": {
             "text": note,
             "by": claims.get("name") or claims.get("sub"),
             "at": now,
         }}}
    )

    # Resolve associated escalations
    db.escalations.update_many(
        {"alert_id": alert_id, "status": "open"},
        {"$set": {
            "status": "resolved",
            "resolved_by": claims.get("name") or claims.get("sub"),
            "resolved_at": now,
        }}
    )

    return jsonify({"message": "Alert resolved."}), 200


@alerts_bp.route("/<alert_id>/false-positive", methods=["POST"])
@jwt_required()
def mark_false_positive(alert_id):
    claims = get_jwt()
    db = get_db()

    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    data = request.get_json(silent=True) or {}

    db.alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "is_false_positive": True,
            "status": "false_positive",
        },
         "$push": {"notes": {
             "text": data.get("reason", "Marked as false positive."),
             "by": claims.get("name") or claims.get("sub"),
             "at": now,
         }}}
    )

    # Mark associated tests
    if alert.get("test_id"):
        db.tests.update_one(
            {"test_id": alert["test_id"]},
            {"$set": {"marked_false_positive": True}}
        )

    return jsonify({"message": "Alert marked as false positive."}), 200


@alerts_bp.route("/<alert_id>/assign", methods=["POST"])
@jwt_required()
def assign_alert(alert_id):
    claims = get_jwt()
    db = get_db()

    alert = db.alerts.find_one({"alert_id": alert_id})
    if not alert:
        alert = db.alerts.find_one({"_id": alert_id})
    if not alert:
        return jsonify({"error": "Alert not found."}), 404

    data = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc).isoformat()

    db.alerts.update_one(
        {"_id": alert["_id"]},
        {"$set": {
            "assigned_to": data.get("assigned_to"),
            "status": "assigned",
        },
         "$push": {"notes": {
             "text": f"Assigned to {data.get('assigned_to')}",
             "by": claims.get("name") or claims.get("sub"),
             "at": now,
         }}}
    )
    return jsonify({"message": "Alert assigned."}), 200


# ── Escalations ───────────────────────────────────────────────────────────────
@alerts_bp.route("/escalations", methods=["GET"])
@jwt_required()
def list_escalations():
    claims = get_jwt()
    role = claims.get("role", "nurse")
    db = get_db()

    filt = {}
    if role == "specialist":
        filt["to_role"] = "specialist"
    elif role == "doctor":
        filt["to_role"] = {"$in": ["doctor", "specialist"]}

    escalations = db.escalations.find(filt)
    return jsonify({"escalations": escalations, "total": len(escalations)}), 200


@alerts_bp.route("/escalations/<esc_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_escalation(esc_id):
    claims = get_jwt()
    db = get_db()

    esc = db.escalations.find_one({"escalation_id": esc_id})
    if not esc:
        esc = db.escalations.find_one({"_id": esc_id})
    if not esc:
        return jsonify({"error": "Escalation not found."}), 404

    now = datetime.now(timezone.utc).isoformat()
    data = request.get_json(silent=True) or {}

    db.escalations.update_one(
        {"_id": esc["_id"]},
        {"$set": {
            "status": "resolved",
            "resolved_by": claims.get("name") or claims.get("sub"),
            "resolved_at": now,
        },
         "$push": {"comments": {
             "text": data.get("comment", "Resolved."),
             "by": claims.get("name") or claims.get("sub"),
             "at": now,
         }}}
    )
    return jsonify({"message": "Escalation resolved."}), 200

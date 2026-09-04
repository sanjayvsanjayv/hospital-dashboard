"""Consent and privacy routes."""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.database import get_db

consent_bp = Blueprint("consent", __name__)


@consent_bp.route("/<patient_id>", methods=["GET"])
@jwt_required()
def get_consent(patient_id):
    claims = get_jwt()
    role = claims.get("role", "nurse")

    # Lab staff cannot access consent info
    if role == "lab":
        return jsonify({"error": "Access denied."}), 403

    db = get_db()
    record = db.consent.find_one({"patient_id": patient_id})
    if not record:
        return jsonify({"error": "Consent record not found."}), 404

    return jsonify({"consent": record}), 200


@consent_bp.route("/<patient_id>", methods=["POST"])
@jwt_required()
def update_consent(patient_id):
    claims = get_jwt()
    role = claims.get("role", "nurse")

    if role not in ("admin", "doctor", "nurse"):
        return jsonify({"error": "Insufficient permissions."}), 403

    db = get_db()
    data = request.get_json(silent=True) or {}
    now = datetime.now(timezone.utc).isoformat()

    existing = db.consent.find_one({"patient_id": patient_id})
    updates = {
        "patient_id": patient_id,
        "consent_status": data.get("consent_status", "unknown"),
        "consent_date": data.get("consent_date", now),
        "consented_by": data.get("consented_by"),
        "privacy_level": data.get("privacy_level", "standard"),
        "data_sharing_consent": data.get("data_sharing_consent", False),
        "research_consent": data.get("research_consent", False),
        "notes": data.get("notes", ""),
        "updated_at": now,
        "updated_by": claims.get("name") or claims.get("sub"),
    }

    if existing:
        db.consent.update_one({"patient_id": patient_id}, {"$set": updates})
    else:
        updates["_id"] = f"CON-{patient_id}"
        updates["created_at"] = now
        db.consent.insert_one(updates)

    # Also update patient record
    db.patients.update_one(
        {"patient_id": patient_id},
        {"$set": {
            "consent_given": data.get("consent_status", "unknown"),
            "privacy_level": data.get("privacy_level", "standard"),
        }}
    )

    return jsonify({"consent": updates, "message": "Consent updated."}), 200

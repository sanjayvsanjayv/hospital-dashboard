"""Authentication routes."""
import bcrypt
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt

from app.database import get_db

auth_bp = Blueprint("auth", __name__)

# Demo credentials (passwords stored as bcrypt hash at seed time; here we compare directly)
DEMO_USERS = {
    "admin":      {"password": "admin123",     "role": "admin",     "name": "Admin User"},
    "doctor":     {"password": "doctor123",    "role": "doctor",    "name": "Dr. Priya Sharma"},
    "nurse":      {"password": "nurse123",     "role": "nurse",     "name": "Nurse Ananya"},
    "lab":        {"password": "lab123",       "role": "lab",       "name": "Lab Tech Ravi"},
    "specialist": {"password": "specialist123","role": "specialist","name": "Dr. Kavitha Iyer"},
}


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    # Check demo users first
    demo = DEMO_USERS.get(username)
    if demo and demo["password"] == password:
        token = create_access_token(
            identity=username,
            additional_claims={"role": demo["role"], "name": demo["name"]},
            expires_delta=timedelta(hours=12),
        )
        return jsonify({
            "access_token": token,
            "user": {
                "username": username,
                "role": demo["role"],
                "name": demo["name"],
            },
            "message": "Login successful (DEMO account).",
        }), 200

    # Fallback: check DB
    db = get_db()
    user = db.users.find_one({"username": username})
    if user:
        ph = user.get("password_hash", "")
        try:
            match = bcrypt.checkpw(password.encode(), ph.encode() if isinstance(ph, str) else ph)
        except Exception:
            match = False
        if match:
            token = create_access_token(
                identity=username,
                additional_claims={"role": user.get("role", "nurse"), "name": user.get("name", username)},
                expires_delta=timedelta(hours=12),
            )
            return jsonify({
                "access_token": token,
                "user": {"username": username, "role": user.get("role"), "name": user.get("name")},
            }), 200

    return jsonify({"error": "Invalid username or password."}), 401


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "username": identity,
        "role": claims.get("role"),
        "name": claims.get("name"),
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out."}), 200

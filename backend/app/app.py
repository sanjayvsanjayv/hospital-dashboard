"""
Hospital Diagnostic-Delay Early-Warning Dashboard
Flask Application Entry Point
"""
import os
from datetime import datetime, timezone

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Config ────────────────────────────────────────────────────────────────
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET", "dev-jwt-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False   # controlled per-token

    # ── Extensions ────────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    jwt = JWTManager(app)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": f"Invalid token: {reason}"}), 401

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Authentication required."}), 401

    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired."}), 401

    # ── Database init ─────────────────────────────────────────────────────────
    from app.database import init_db, is_fallback
    db = init_db()

    # ── Seed data if collections are empty ───────────────────────────────────
    with app.app_context():
        _seed_if_empty(db)

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes.auth import auth_bp
    from app.routes.patients import patients_bp
    from app.routes.tests import tests_bp
    from app.routes.alerts import alerts_bp
    from app.routes.metrics import metrics_bp
    from app.routes.consent import consent_bp
    from app.routes.integration import integration_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(patients_bp,    url_prefix="/api/patients")
    app.register_blueprint(tests_bp,       url_prefix="/api/tests")
    app.register_blueprint(alerts_bp,      url_prefix="/api/alerts")
    app.register_blueprint(metrics_bp,     url_prefix="/api")
    app.register_blueprint(consent_bp,     url_prefix="/api/consent")
    app.register_blueprint(integration_bp, url_prefix="/api/integration")

    # ── Health check ─────────────────────────────────────────────────────────
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "db_mode": "fallback (in-memory)" if is_fallback() else "MongoDB",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "note": "PROTOTYPE — Diagnostic-Delay Early-Warning Dashboard",
        }), 200

    # ── Generic error handlers ────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error.", "detail": str(e)}), 500

    return app


def _seed_if_empty(db):
    """Seed synthetic demo data if database is empty."""
    try:
        count = db.patients.count_documents({})
        if count > 0:
            print(f"[SEED] Database already has {count} patient records. Skipping seed.")
            return
    except Exception:
        pass

    print("[SEED] Seeding synthetic demo data …")
    try:
        import bcrypt
        from app.data_generator import build_all_data

        data = build_all_data()

        # Hash passwords for demo users
        pw_map = {
            "admin": "admin123", "doctor": "doctor123", "nurse": "nurse123",
            "lab": "lab123", "specialist": "specialist123",
        }
        for u in data["users"]:
            raw = pw_map.get(u["username"], "password123")
            u["password_hash"] = bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()

        db.users.insert_many(data["users"])
        db.beds.insert_many(data["beds"])
        db.patients.insert_many(data["patients"])
        db.tests.insert_many(data["tests"])
        db.alerts.insert_many(data["alerts"])
        db.escalations.insert_many(data["escalations"])
        db.consent.insert_many(data["consent"])

        print(f"[SEED] Seeded: {len(data['patients'])} patients, "
              f"{len(data['tests'])} tests, {len(data['alerts'])} alerts, "
              f"{len(data['beds'])} beds.")
    except Exception as exc:
        import traceback
        print(f"[SEED] Seed failed: {exc}")
        traceback.print_exc()

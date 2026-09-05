"""Patient routes."""

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.database import get_db
from app.engine.delay_engine import (
    calculate_test_delay,
    aggregate_patient_risk,
)

patients_bp = Blueprint("patients", __name__)


# Fields visible per role
ROLE_FIELDS = {
    "lab": [
        "patient_id",
        "ward",
        "bed_id",
        "bed_number",
        "status",
    ],
    "nurse": [
        "patient_id",
        "age",
        "gender",
        "ward",
        "bed_id",
        "bed_number",
        "admission_time",
        "status",
        "risk_level",
        "is_discharge_blocked",
        "discharge_blocker_reason",
        "doctor",
        "specialist",
        "specialty",
        "diagnosis",
    ],
    "doctor": None,       # all fields
    "specialist": None,   # all fields
    "admin": None,        # all fields
}


def _filter_patient(pat: dict, role: str) -> dict:
    """Return only fields allowed for the current role."""

    allowed = ROLE_FIELDS.get(role)

    if allowed is None:
        return pat

    return {
        key: value
        for key, value in pat.items()
        if key in allowed
    }


# -------------------------------------------------------------------
# GET ALL PATIENTS
# -------------------------------------------------------------------

@patients_bp.route("", methods=["GET"])
@jwt_required()
def list_patients():
    """List patients with optional filters."""

    claims = get_jwt()
    role = claims.get("role", "nurse")

    db = get_db()

    # Filters
    status_filter = request.args.get("status")
    ward_filter = request.args.get("ward")
    risk_filter = request.args.get("risk_level")

    # Pagination
    try:
        page = int(request.args.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        per_page = int(request.args.get("per_page", 50))
    except (TypeError, ValueError):
        per_page = 50

    page = max(page, 1)
    per_page = max(per_page, 1)

    # MongoDB filter
    filt = {}

    if status_filter:
        filt["status"] = status_filter

    if ward_filter:
        filt["ward"] = ward_filter

    if risk_filter:
        filt["risk_level"] = risk_filter

    # ---------------------------------------------------------------
    # IMPORTANT:
    #
    # Previously doctors were restricted to:
    # "Dr. Priya Sharma"
    #
    # That restriction has been removed.
    #
    # Now doctors can see patients assigned to ANY doctor name.
    # ---------------------------------------------------------------

    all_patients = db.patients.find(filt)

    total = len(all_patients)

    start = (page - 1) * per_page
    end = start + per_page

    paginated = all_patients[start:end]

    return jsonify({
        "patients": [
            _filter_patient(patient, role)
            for patient in paginated
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }), 200


# -------------------------------------------------------------------
# GET SINGLE PATIENT
# -------------------------------------------------------------------

@patients_bp.route("/<patient_id>", methods=["GET"])
@jwt_required()
def get_patient(patient_id):
    """Get a single patient with tests, risk and timeline."""

    claims = get_jwt()
    role = claims.get("role", "nurse")

    db = get_db()

    # Find patient
    pat = db.patients.find_one({
        "patient_id": patient_id
    })

    # Fallback to _id
    if not pat:
        pat = db.patients.find_one({
            "_id": patient_id
        })

    if not pat:
        return jsonify({
            "error": "Patient not found."
        }), 404

    # ---------------------------------------------------------------
    # Get tests for this patient
    # ---------------------------------------------------------------

    tests = db.tests.find({
        "patient_id": patient_id
    })

    assessments = [
        calculate_test_delay(test)
        for test in tests
    ]

    agg = aggregate_patient_risk(assessments)

    # Update current calculated risk
    pat["current_risk_level"] = agg["risk_level"]
    pat["current_risk_confidence"] = agg["confidence"]
    pat["current_risk_explanation"] = agg["explanation"]
    pat["total_delay_hours"] = agg["total_delay_hours"]
    pat["is_discharge_blocked"] = agg["is_discharge_blocked"]

    # ---------------------------------------------------------------
    # Enrich tests with delay assessment
    # ---------------------------------------------------------------

    tests_enriched = []

    raw_tests = db.tests.find({
        "patient_id": patient_id
    })

    for test in raw_tests:

        assessment = calculate_test_delay(test)

        test.update({
            "delay_type": assessment["delay_type"],
            "delay_hours": assessment["delay_hours"],
            "risk_level": assessment["risk_level"],
            "confidence": assessment["confidence"],
            "stage": assessment["stage"],
            "explanation": assessment["explanation"],
            "data_issues": assessment["data_issues"],
        })

        tests_enriched.append(test)

    # ---------------------------------------------------------------
    # Timeline
    # ---------------------------------------------------------------

    timeline = _build_timeline(
        pat,
        tests_enriched
    )

    return jsonify({
        "patient": _filter_patient(
            pat,
            role
        ),
        "tests": tests_enriched,
        "timeline": timeline,
        "risk_summary": agg,
    }), 200


# -------------------------------------------------------------------
# CREATE PATIENT
# -------------------------------------------------------------------

@patients_bp.route("", methods=["POST"])
@jwt_required()
def create_patient():
    """Create/admit a new patient."""

    claims = get_jwt()
    role = claims.get("role", "nurse")

    # Permission check
    if role not in (
        "admin",
        "doctor",
        "nurse",
    ):
        return jsonify({
            "error": "Insufficient permissions."
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    db = get_db()

    # ---------------------------------------------------------------
    # Auto-generate patient ID
    # ---------------------------------------------------------------

    count = db.patients.count_documents({})

    pat_id = f"PAT-{(count + 1):05d}"

    now = datetime.now(
        timezone.utc
    ).isoformat()

    # ---------------------------------------------------------------
    # Patient object
    # ---------------------------------------------------------------

    patient = {
        "_id": pat_id,

        "patient_id": pat_id,

        "age": data.get(
            "age"
        ),

        "gender": data.get(
            "gender",
            "Unknown"
        ),

        "ward": data.get(
            "ward",
            "Medical Ward A"
        ),

        "bed_id": data.get(
            "bed_id"
        ),

        "bed_number": data.get(
            "bed_number"
        ),

        "admission_time": data.get(
            "admission_time",
            now
        ),

        "discharge_time": None,

        "status": "admitted",

        # -----------------------------------------------------------
        # IMPORTANT:
        # Doctor name is taken directly from frontend input.
        # No hardcoded doctor name.
        # -----------------------------------------------------------

        "doctor": data.get(
            "doctor"
        ),

        "specialist": data.get(
            "specialist"
        ),

        "specialty": data.get(
            "specialty"
        ),

        "diagnosis": data.get(
            "diagnosis"
        ),

        "risk_level": "LOW",

        "risk_confidence": 90,

        "is_discharge_blocked": False,

        "consent_given": data.get(
            "consent_given",
            "unknown"
        ),

        "privacy_level": data.get(
            "privacy_level",
            "standard"
        ),

        "test_ids": [],

        "created_at": now,

        "updated_at": now,
    }

    # ---------------------------------------------------------------
    # Insert patient
    # ---------------------------------------------------------------

    db.patients.insert_one(
        patient
    )

    # ---------------------------------------------------------------
    # Update bed if assigned
    # ---------------------------------------------------------------

    if patient["bed_id"]:

        db.beds.update_one(
            {
                "_id": patient["bed_id"]
            },
            {
                "$set": {
                    "status": "occupied",
                    "patient_id": pat_id,
                }
            }
        )

    return jsonify({
        "patient": patient,
        "message": "Patient admitted.",
    }), 201


# -------------------------------------------------------------------
# UPDATE PATIENT
# -------------------------------------------------------------------

@patients_bp.route(
    "/<patient_id>",
    methods=["PUT"]
)
@jwt_required()
def update_patient(patient_id):
    """Update patient information."""

    claims = get_jwt()
    role = claims.get(
        "role",
        "nurse"
    )

    if role not in (
        "admin",
        "doctor",
        "nurse",
        "specialist",
    ):
        return jsonify({
            "error": "Insufficient permissions."
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    db = get_db()

    # Find patient
    pat = db.patients.find_one({
        "patient_id": patient_id
    })

    if not pat:
        return jsonify({
            "error": "Patient not found."
        }), 404

    # ---------------------------------------------------------------
    # Allowed fields
    # ---------------------------------------------------------------

    allowed_updates = [
        "status",
        "ward",
        "bed_id",
        "bed_number",
        "doctor",
        "specialist",
        "specialty",
        "discharge_time",
        "discharge_blocker_reason",
        "is_discharge_blocked",
        "consent_given",
        "privacy_level",
        "diagnosis",
        "age",
        "gender",
    ]

    updates = {
        key: value
        for key, value in data.items()
        if key in allowed_updates
    }

    updates["updated_at"] = datetime.now(
        timezone.utc
    ).isoformat()

    # Update patient
    db.patients.update_one(
        {
            "patient_id": patient_id
        },
        {
            "$set": updates
        }
    )

    # ---------------------------------------------------------------
    # If discharged, free bed
    # ---------------------------------------------------------------

    if (
        updates.get("status") == "discharged"
        and pat.get("bed_id")
    ):

        db.beds.update_one(
            {
                "_id": pat["bed_id"]
            },
            {
                "$set": {
                    "status": "available",
                    "patient_id": None,
                }
            }
        )

    # ---------------------------------------------------------------
    # Get updated patient
    # ---------------------------------------------------------------

    updated = db.patients.find_one({
        "patient_id": patient_id
    })

    return jsonify({
        "patient": updated,
        "message": "Patient updated.",
    }), 200


# -------------------------------------------------------------------
# PATIENT TIMELINE
# -------------------------------------------------------------------

def _build_timeline(
    pat: dict,
    tests: list
) -> list:
    """Build a visual timeline of the patient's care journey."""

    events = []

    def _add(
        stage,
        ts,
        dept,
        status,
        desc
    ):
        if ts:
            events.append({
                "stage": stage,
                "timestamp": ts,
                "department": dept,
                "status": status,
                "description": desc,
            })

    # ---------------------------------------------------------------
    # Admission
    # ---------------------------------------------------------------

    _add(
        "Admission",
        pat.get("admission_time"),
        "Admissions",
        "completed",
        "Patient admitted to hospital.",
    )

    # ---------------------------------------------------------------
    # Bed allocation
    # ---------------------------------------------------------------

    if pat.get("bed_id"):

        _add(
            "Bed Allocation",
            pat.get("admission_time"),
            "Ward",
            "completed",
            f"Assigned bed {pat.get('bed_id')}.",
        )

    # ---------------------------------------------------------------
    # Tests
    # ---------------------------------------------------------------

    for test in tests:

        test_name = test.get(
            "test_type",
            "Test"
        )

        # Test ordered
        _add(
            f"Test Ordered: {test_name}",
            test.get("test_order_time"),
            "Doctor",
            "completed",
            (
                f"{test_name} ordered. "
                f"Urgency: "
                f"{test.get('urgency', 'routine')}."
            ),
        )

        # Specimen collected
        if test.get(
            "specimen_time"
        ):

            _add(
                f"Specimen Collected: {test_name}",
                test.get("specimen_time"),
                "Lab",
                "completed",
                "Specimen collected.",
            )

        # Scan started
        if test.get(
            "scan_start_time"
        ):

            _add(
                f"Scan Started: {test_name}",
                test.get("scan_start_time"),
                "Radiology",
                "completed",
                "Scan initiated.",
            )

        # Report generated
        if test.get(
            "report_time"
        ):

            _add(
                f"Report Generated: {test_name}",
                test.get("report_time"),
                "Lab/Radiology",
                "completed",
                "Report generated.",
            )

        # Report pending
        else:

            stage_label = (
                "Report Pending"
            )

            desc = test.get(
                "explanation",
                "Report not yet available."
            )

            ts = (
                test.get("specimen_time")
                or test.get("scan_start_time")
                or test.get("test_order_time")
            )

            _add(
                f"{stage_label}: {test_name}",
                ts,
                "Lab/Radiology",
                (
                    "delayed"
                    if (
                        test.get(
                            "delay_hours"
                        ) or 0
                    ) > 4
                    else "pending"
                ),
                desc,
            )

        # Doctor review
        if test.get(
            "doctor_review_time"
        ):

            _add(
                f"Doctor Review: {test_name}",
                test.get(
                    "doctor_review_time"
                ),
                "Doctor",
                "completed",
                "Doctor reviewed the report.",
            )

        # Specialist review
        if test.get(
            "specialist_required"
        ):

            specialist_status = (
                "pending"
                if not test.get(
                    "specialist_available"
                )
                else "completed"
            )

            ts = (
                test.get(
                    "doctor_review_time"
                )
                or test.get(
                    "report_time"
                )
            )

            description = (
                "Specialist review required."
            )

            if not test.get(
                "specialist_available"
            ):
                description += (
                    " Specialist currently unavailable."
                )

            _add(
                f"Specialist Review: {test_name}",
                ts,
                "Specialist",
                specialist_status,
                description,
            )

    # ---------------------------------------------------------------
    # Discharge
    # ---------------------------------------------------------------

    if pat.get(
        "discharge_time"
    ):

        _add(
            "Discharge",
            pat.get(
                "discharge_time"
            ),
            "Ward",
            "completed",
            "Patient discharged.",
        )

    # ---------------------------------------------------------------
    # Discharge blocked
    # ---------------------------------------------------------------

    elif pat.get(
        "is_discharge_blocked"
    ):

        _add(
            "Discharge Blocked",
            None,
            "Ward",
            "blocked",
            pat.get(
                "discharge_blocker_reason",
                "Discharge blocked."
            ),
        )

    # ---------------------------------------------------------------
    # Sort timeline
    # ---------------------------------------------------------------

    events.sort(
        key=lambda event:
        event.get("timestamp")
        or "9999"
    )

    return events
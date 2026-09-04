"""
Synthetic Data Generator
========================
Generates 300+ synthetic patient records, tests, beds, users, alerts,
escalations and consent records suitable for the COE project demo.
All data is fictitious.  No real patient information is used.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from app.engine.delay_engine import calculate_test_delay

# ── reproducible randomness ────────────────────────────────────────────────────
random.seed(42)

WARDS = ["Medical Ward A", "Medical Ward B", "Surgical Ward", "ICU", "Emergency", "Paediatrics", "Orthopaedics"]
TEST_TYPES = ["Full Blood Count", "Liver Function Test", "Renal Profile", "CT Scan", "MRI", "X-Ray",
              "Ultrasound", "ECG", "Blood Culture", "Urine Culture", "Troponin", "Coagulation Profile",
              "Thyroid Function", "HbA1c", "Echocardiography"]
SCAN_TESTS = {"CT Scan", "MRI", "X-Ray", "Ultrasound", "Echocardiography"}
SPECIALTIES = ["Cardiology", "Neurology", "Gastroenterology", "Nephrology", "Haematology",
               "Pulmonology", "Endocrinology", "Infectious Disease", "Oncology", "General Surgery"]
DOCTORS = ["Dr. Priya Sharma", "Dr. Rajiv Kumar", "Dr. Anita Patel", "Dr. Suresh Nair",
           "Dr. Meena Reddy", "Dr. Arjun Mehta"]
SPECIALISTS = ["Dr. Kavitha Iyer", "Dr. Sanjay Bose", "Dr. Leela Rao", "Dr. Mohan Das",
               "Dr. Sunita Verma"]
URGENCY_LEVELS = ["routine", "urgent", "critical"]
RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"]
GENDERS = ["Male", "Female", "Other"]

NOW = datetime.now(timezone.utc)


def _dt_ago(**kwargs):
    return (NOW - timedelta(**kwargs)).isoformat()


def _dt_from(base_dt_str, **kwargs):
    if base_dt_str is None:
        return None
    from dateutil import parser as dp
    base = dp.parse(base_dt_str)
    return (base + timedelta(**kwargs)).isoformat()


def _random_dt_ago(min_h=0, max_h=72):
    h = random.uniform(min_h, max_h)
    return (NOW - timedelta(hours=h)).isoformat()


def _patient_id(n):
    return f"PAT-{n:05d}"


def _bed_id(ward, num):
    prefix = "".join(w[0] for w in ward.split())
    return f"{prefix}-{num:02d}"


# ─────────────────────────────────────────────────────────────────────────────
def generate_users():
    return [
        {"_id": "USR-00001", "username": "admin",     "password_hash": "", "role": "admin",     "name": "Admin User",      "email": "admin@hospital.demo"},
        {"_id": "USR-00002", "username": "doctor",    "password_hash": "", "role": "doctor",    "name": "Dr. Priya Sharma", "email": "doctor@hospital.demo"},
        {"_id": "USR-00003", "username": "nurse",     "password_hash": "", "role": "nurse",     "name": "Nurse Ananya",    "email": "nurse@hospital.demo"},
        {"_id": "USR-00004", "username": "lab",       "password_hash": "", "role": "lab",       "name": "Lab Tech Ravi",   "email": "lab@hospital.demo"},
        {"_id": "USR-00005", "username": "specialist","password_hash": "", "role": "specialist","name": "Dr. Kavitha Iyer","email": "specialist@hospital.demo"},
    ]


def generate_beds(n_wards=7, beds_per_ward=10):
    beds = []
    bid = 1
    for ward in WARDS:
        for num in range(1, beds_per_ward + 1):
            beds.append({
                "_id": _bed_id(ward, num),
                "ward": ward,
                "bed_number": f"{num:02d}",
                "status": "available",
                "patient_id": None,
            })
            bid += 1
    return beds


def _make_test(tid, patient_id, admission_time_str, scenario="normal"):
    """
    Scenarios:
      normal     – no major delay
      specimen   – specimen never collected (edge case 1)
      review     – report ready, doctor hasn't reviewed (edge case 2)
      specialist – specialist required but unavailable (edge case 3)
      missing_ts – missing timestamps (edge case 4)
      conflict   – conflicting timestamps (edge case 5)
      delayed    – significant delay, discharge blocked
    """
    test_type = random.choice(TEST_TYPES)
    is_scan = test_type in SCAN_TESTS
    urgency = random.choice(URGENCY_LEVELS)
    order_offset_h = random.uniform(0.5, 4)
    from dateutil import parser as dp
    admission_dt = dp.parse(admission_time_str)
    order_time = (admission_dt + timedelta(hours=order_offset_h)).isoformat()

    specialist_required = random.random() < 0.3
    specialist_available = True
    discharge_blocker = False
    actual_risk = "LOW"

    # Timestamps
    specimen_time = None
    scan_start_time = None
    report_time = None
    doctor_review_time = None
    discharge_time = None
    status = "completed"

    if scenario == "normal":
        if is_scan:
            scan_start_time = _dt_from(order_time, hours=random.uniform(1, 3))
            report_time = _dt_from(scan_start_time, hours=random.uniform(1, 3))
        else:
            specimen_time = _dt_from(order_time, hours=random.uniform(0.5, 2))
            report_time = _dt_from(specimen_time, hours=random.uniform(1, 3))
        doctor_review_time = _dt_from(report_time, hours=random.uniform(0.5, 2))
        if specialist_required:
            pass  # reviewed
        status = "completed"
        actual_risk = "LOW"

    elif scenario == "specimen":
        # Edge Case 1: Test ordered, specimen never collected
        urgency = "urgent"
        discharge_blocker = True
        status = "pending"
        actual_risk = "HIGH"
        # No specimen_time, no report_time

    elif scenario == "review":
        # Edge Case 2: Report ready but doctor hasn't reviewed
        if is_scan:
            scan_start_time = _dt_from(order_time, hours=1)
            report_time = _dt_from(scan_start_time, hours=2)
        else:
            specimen_time = _dt_from(order_time, hours=1)
            report_time = _dt_from(specimen_time, hours=2)
        # No doctor_review_time on purpose
        status = "report_ready"
        discharge_blocker = True
        actual_risk = "MEDIUM"

    elif scenario == "specialist":
        # Edge Case 3: Specialist required but unavailable
        if is_scan:
            scan_start_time = _dt_from(order_time, hours=1)
            report_time = _dt_from(scan_start_time, hours=2)
        else:
            specimen_time = _dt_from(order_time, hours=1)
            report_time = _dt_from(specimen_time, hours=2)
        doctor_review_time = _dt_from(report_time, hours=1)
        specialist_required = True
        specialist_available = False
        discharge_blocker = True
        status = "specialist_pending"
        actual_risk = "HIGH"

    elif scenario == "missing_ts":
        # Edge Case 4: Missing timestamps
        # Intentionally leave many fields None
        status = "pending"
        actual_risk = "LOW"

    elif scenario == "conflict":
        # Edge Case 5: Conflicting timestamps — report before specimen
        specimen_time = _dt_from(order_time, hours=3)
        report_time = _dt_from(order_time, hours=1)  # BEFORE specimen
        status = "report_ready"
        actual_risk = "LOW"

    elif scenario == "delayed":
        delay_h = random.uniform(6, 24)
        if is_scan:
            scan_start_time = _dt_from(order_time, hours=random.uniform(1, 3))
        else:
            specimen_time = _dt_from(order_time, hours=random.uniform(0.5, 2))
        # No report — delayed
        discharge_blocker = random.random() < 0.6
        status = "pending"
        actual_risk = "HIGH" if delay_h >= 8 else "MEDIUM"

    test = {
        "_id": f"TST-{tid:05d}",
        "test_id": f"TST-{tid:05d}",
        "patient_id": patient_id,
        "test_type": test_type,
        "urgency": urgency,
        "test_order_time": order_time,
        "specimen_time": specimen_time,
        "scan_start_time": scan_start_time,
        "report_time": report_time,
        "doctor_review_time": doctor_review_time,
        "specialist_required": specialist_required,
        "specialist_available": specialist_available,
        "discharge_blocker": discharge_blocker,
        "status": status,
        "actual_risk_level": actual_risk,
        "assigned_to": random.choice(DOCTORS),
        "lab_department": "Radiology" if is_scan else "Laboratory",
        "discharge_time": discharge_time,
        "marked_false_positive": False,
        "created_at": order_time,
        "updated_at": order_time,
    }
    # Run engine to fill predicted fields
    assessment = calculate_test_delay(test)
    test["predicted_delay_hours"] = assessment["delay_hours"]
    test["predicted_risk_level"] = assessment["risk_level"]
    test["prediction_confidence"] = assessment["confidence"]
    test["delay_type"] = assessment["delay_type"]
    test["stage"] = assessment["stage"]
    test["data_issues"] = assessment["data_issues"]
    test["explanation"] = assessment["explanation"]
    return test


def generate_patients_and_tests(n_active=25, n_historical=80):
    """Return (patients, tests, beds_update) tuples."""
    beds = generate_beds()
    available_beds = [b["_id"] for b in beds]
    random.shuffle(available_beds)

    patients = []
    tests = []
    pid = 1
    tid = 1
    bed_assignments = {}

    SCENARIOS = ["normal", "normal", "normal", "delayed", "delayed", "specimen",
                 "review", "specialist", "missing_ts", "conflict"]

    def _make_patient(is_active, idx):
        nonlocal pid, tid
        pat_id = _patient_id(pid)
        pid += 1
        age = random.randint(18, 90)
        gender = random.choice(GENDERS)
        ward = random.choice(WARDS)
        doctor = random.choice(DOCTORS)
        specialist = random.choice(SPECIALISTS)
        admit_h_ago = random.uniform(2, 120) if is_active else random.uniform(48, 240)
        admission_time = _random_dt_ago(min_h=admit_h_ago, max_h=admit_h_ago + 2)

        # Bed
        bed_id = None
        if is_active and available_beds:
            bed_id = available_beds.pop()
            bed_assignments[bed_id] = pat_id

        status = "admitted" if is_active else random.choice(["discharged", "transferred"])
        discharge_time = None
        if not is_active:
            discharge_time = _dt_from(admission_time, hours=random.uniform(24, 120))

        # Tests for this patient
        n_tests = random.randint(1, 4)
        pat_tests = []
        for i in range(n_tests):
            if idx < 5:
                scenario = SCENARIOS[idx % len(SCENARIOS)]
            else:
                weights = [40, 40, 30, 20, 10, 5, 5, 5, 5, 5]
                scenario = random.choices(SCENARIOS, weights=weights)[0]
            t = _make_test(tid, pat_id, admission_time, scenario)
            t["is_active_patient"] = is_active
            tests.append(t)
            pat_tests.append(t["_id"])
            tid += 1

        # Aggregate risk
        from app.engine.delay_engine import aggregate_patient_risk
        agg = aggregate_patient_risk([calculate_test_delay(t) for t in tests if t["patient_id"] == pat_id])

        patient = {
            "_id": pat_id,
            "patient_id": pat_id,
            "age": age,
            "gender": gender,
            "ward": ward,
            "bed_id": bed_id,
            "bed_number": bed_id.split("-")[-1] if bed_id else None,
            "admission_time": admission_time,
            "discharge_time": discharge_time,
            "status": status,
            "doctor": doctor,
            "specialist": specialist,
            "specialty": random.choice(SPECIALTIES),
            "diagnosis": f"Diagnosis-{random.randint(100, 999)}",
            "risk_level": agg["risk_level"],
            "risk_confidence": agg["confidence"],
            "risk_explanation": agg["explanation"],
            "total_delay_hours": agg["total_delay_hours"],
            "is_discharge_blocked": agg["is_discharge_blocked"],
            "discharge_blocker_reason": "Pending diagnostic result" if agg["is_discharge_blocked"] else None,
            "estimated_additional_los_hours": round(agg["total_delay_hours"] * 1.2, 1) if agg["is_discharge_blocked"] else 0.0,
            "test_ids": pat_tests,
            "consent_given": random.choice(["given", "not_given", "unknown"]),
            "privacy_level": random.choice(["standard", "high"]),
            "created_at": admission_time,
            "updated_at": admission_time,
        }
        return patient

    # Generate active patients first (with guaranteed edge-case scenarios)
    for i in range(n_active):
        patients.append(_make_patient(is_active=True, idx=i))

    # Historical patients
    for i in range(n_historical):
        patients.append(_make_patient(is_active=False, idx=i + n_active))

    # Update beds with occupancy
    beds_out = []
    for b in beds:
        if b["_id"] in bed_assignments:
            b["status"] = "occupied"
            b["patient_id"] = bed_assignments[b["_id"]]
        beds_out.append(b)

    return patients, tests, beds_out


def generate_alerts(patients, tests):
    alerts = []
    aid = 1
    for pat in patients:
        if pat["status"] != "admitted":
            continue
        if pat["risk_level"] == "HIGH":
            alerts.append({
                "_id": f"ALT-{aid:05d}",
                "alert_id": f"ALT-{aid:05d}",
                "patient_id": pat["patient_id"],
                "alert_type": "HIGH_RISK",
                "severity": "high",
                "title": f"High-Risk Patient: {pat['patient_id']}",
                "message": pat.get("risk_explanation", "Patient assessed as HIGH RISK."),
                "status": random.choice(["active", "acknowledged", "active"]),
                "created_at": pat["created_at"],
                "acknowledged_by": None,
                "acknowledged_at": None,
                "assigned_to": pat["doctor"],
                "escalated": False,
                "resolved": False,
                "notes": [],
                "is_false_positive": False,
            })
            aid += 1
        if pat["is_discharge_blocked"]:
            alerts.append({
                "_id": f"ALT-{aid:05d}",
                "alert_id": f"ALT-{aid:05d}",
                "patient_id": pat["patient_id"],
                "alert_type": "DISCHARGE_BLOCKER",
                "severity": "high",
                "title": f"Discharge Blocked: {pat['patient_id']}",
                "message": f"Discharge blocked — {pat.get('discharge_blocker_reason', 'diagnostic pending')}.",
                "status": "active",
                "created_at": pat["created_at"],
                "acknowledged_by": None,
                "acknowledged_at": None,
                "assigned_to": pat["doctor"],
                "escalated": False,
                "resolved": False,
                "notes": [],
                "is_false_positive": False,
            })
            aid += 1

    # Test-level alerts
    for t in tests:
        if t.get("delay_type") in ("Specimen Collection Delay", "Scan Delay"):
            alerts.append({
                "_id": f"ALT-{aid:05d}",
                "alert_id": f"ALT-{aid:05d}",
                "patient_id": t["patient_id"],
                "test_id": t["_id"],
                "alert_type": t["delay_type"].upper().replace(" ", "_"),
                "severity": "medium" if t.get("urgency") != "urgent" else "high",
                "title": f"{t['delay_type']}: {t['test_type']}",
                "message": t.get("explanation", ""),
                "status": "active",
                "created_at": t["created_at"],
                "acknowledged_by": None,
                "acknowledged_at": None,
                "assigned_to": t.get("assigned_to"),
                "escalated": False,
                "resolved": False,
                "notes": [],
                "is_false_positive": False,
            })
            aid += 1
        if t.get("delay_type") == "Specialist Availability Delay":
            alerts.append({
                "_id": f"ALT-{aid:05d}",
                "alert_id": f"ALT-{aid:05d}",
                "patient_id": t["patient_id"],
                "test_id": t["_id"],
                "alert_type": "SPECIALIST_UNAVAILABLE",
                "severity": "high",
                "title": f"Specialist Unavailable — {t['test_type']}",
                "message": f"Specialist review required for {t['test_type']} but no specialist is currently available.",
                "status": "active",
                "created_at": t["created_at"],
                "acknowledged_by": None,
                "acknowledged_at": None,
                "assigned_to": None,
                "escalated": False,
                "resolved": False,
                "notes": [],
                "is_false_positive": False,
            })
            aid += 1

    return alerts


def generate_escalations(alerts):
    escalations = []
    eid = 1
    for a in alerts:
        if a.get("severity") == "high" and random.random() < 0.3:
            escalations.append({
                "_id": f"ESC-{eid:05d}",
                "escalation_id": f"ESC-{eid:05d}",
                "alert_id": a["_id"],
                "patient_id": a["patient_id"],
                "from_role": "nurse",
                "to_role": "doctor",
                "reason": "Delay exceeds threshold. Escalating for immediate review.",
                "status": random.choice(["open", "acknowledged", "resolved"]),
                "timestamp": a["created_at"],
                "resolved_by": None,
                "resolved_at": None,
                "comments": [],
            })
            eid += 1
    return escalations


def generate_consent(patients):
    consent_records = []
    for pat in patients:
        consent_records.append({
            "_id": f"CON-{pat['patient_id']}",
            "patient_id": pat["patient_id"],
            "consent_status": pat.get("consent_given", "unknown"),
            "consent_date": pat.get("admission_time"),
            "consented_by": "Patient" if pat.get("consent_given") == "given" else None,
            "privacy_level": pat.get("privacy_level", "standard"),
            "data_sharing_consent": pat.get("consent_given") == "given",
            "research_consent": random.random() < 0.5,
            "notes": "",
            "updated_at": pat.get("admission_time"),
        })
    return consent_records


def build_all_data():
    """Build and return the full synthetic dataset."""
    patients, tests, beds = generate_patients_and_tests(n_active=25, n_historical=80)
    users = generate_users()
    alerts = generate_alerts(patients, tests)
    escalations = generate_escalations(alerts)
    consent = generate_consent(patients)

    return {
        "users": users,
        "patients": patients,
        "tests": tests,
        "beds": beds,
        "alerts": alerts,
        "escalations": escalations,
        "consent": consent,
    }

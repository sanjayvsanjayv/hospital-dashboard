# API Documentation
## Diagnostic-Delay Early-Warning Dashboard

Base URL: `http://localhost:5000/api`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /auth/login

Login and receive a JWT token.

**Request:**
```json
{ "username": "admin", "password": "admin123" }
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "user": { "username": "admin", "role": "admin", "name": "Admin User" },
  "message": "Login successful (DEMO account)."
}
```

**Response 401:**
```json
{ "error": "Invalid username or password." }
```

---

### GET /auth/me *(protected)*

Returns the current user's identity from the JWT.

**Response 200:**
```json
{ "username": "doctor", "role": "doctor", "name": "Dr. Priya Sharma" }
```

---

## Health

### GET /health

Public health check.

**Response 200:**
```json
{
  "status": "ok",
  "db_mode": "fallback (in-memory)",
  "timestamp": "2026-09-04T10:00:00+00:00",
  "version": "1.0.0",
  "note": "PROTOTYPE — Diagnostic-Delay Early-Warning Dashboard"
}
```

---

## Patients

### GET /patients *(protected)*

List patients with optional filters. Doctors see only their assigned patients. Lab staff cannot access this endpoint.

**Query params:**
| Param | Type | Description |
|---|---|---|
| status | string | admitted / discharged / transferred |
| ward | string | Filter by ward name |
| risk_level | string | LOW / MEDIUM / HIGH |
| page | int | Page number (default 1) |
| per_page | int | Page size (default 50) |

**Response 200:**
```json
{
  "patients": [ { "patient_id": "PAT-00001", "age": 54, ... } ],
  "total": 105, "page": 1, "per_page": 50, "pages": 3
}
```

---

### GET /patients/{patient_id} *(protected)*

Full patient detail including tests, risk summary, and timeline.

**Response 200:**
```json
{
  "patient": { "patient_id": "PAT-00001", "risk_level": "HIGH", ... },
  "tests": [ { "test_id": "TST-00001", "delay_hours": 9.2, "risk_level": "HIGH", ... } ],
  "timeline": [ { "stage": "Admission", "timestamp": "...", "status": "completed" } ],
  "risk_summary": { "risk_level": "HIGH", "confidence": 87, "total_delay_hours": 9.2 }
}
```

---

### POST /patients *(protected, roles: admin/doctor/nurse)*

Admit a new patient.

**Request body:**
```json
{
  "age": 65, "gender": "Male", "ward": "Medical Ward A",
  "bed_id": "MWA-03", "doctor": "Dr. Priya Sharma",
  "diagnosis": "Chest pain query", "consent_given": "given"
}
```

**Response 201:**
```json
{ "patient": { "patient_id": "PAT-00106", ... }, "message": "Patient admitted." }
```

---

### PUT /patients/{patient_id} *(protected, roles: admin/doctor/nurse/specialist)*

Update patient fields (status, discharge_time, discharge_blocker_reason, etc.).

**Request body:** Any subset of updatable fields.

**Response 200:**
```json
{ "patient": { ... }, "message": "Patient updated." }
```

---

## Tests

### GET /tests *(protected)*

List tests. Lab staff see a restricted field set.

**Query params:** `patient_id`, `status`, `urgency`, `delay_type`

**Response 200:**
```json
{
  "tests": [
    {
      "test_id": "TST-00001",
      "patient_id": "PAT-00001",
      "test_type": "CT Scan",
      "urgency": "urgent",
      "delay_hours": 9.2,
      "delay_type": "Specialist Availability Delay",
      "risk_level": "HIGH",
      "confidence": 87,
      "stage": "Specialist Review",
      "discharge_blocker": true,
      "explanation": "CT Scan has a current delay of 9.2 hours..."
    }
  ],
  "total": 277
}
```

---

### POST /tests *(protected, roles: admin/doctor/nurse)*

Create a new test order.

**Request body:**
```json
{
  "patient_id": "PAT-00001",
  "test_type": "Full Blood Count",
  "urgency": "urgent",
  "specialist_required": false
}
```

**Response 201:**
```json
{ "test": { "test_id": "TST-00278", ... }, "message": "Test order created." }
```

---

### PUT /tests/{test_id}/status *(protected)*

Update test status and/or timestamps. Triggers patient risk recalculation.

**Request body:**
```json
{ "status": "specimen_collected" }
```

Recognised status transitions: `pending` → `specimen_collected` / `scan_started` → `report_ready` → `doctor_reviewed` → `completed`

Setting a status automatically records the corresponding timestamp if not already set.

**Response 200:**
```json
{ "test": { "test_id": "TST-00001", "status": "specimen_collected", "stage": "Processing", ... }, "message": "Test status updated." }
```

---

## Alerts

### GET /alerts *(protected)*

**Query params:** `status`, `severity`, `alert_type`, `patient_id`

Lab staff automatically filtered to test-related alerts.

**Response 200:**
```json
{
  "alerts": [
    {
      "alert_id": "ALT-00001",
      "patient_id": "PAT-00003",
      "alert_type": "HIGH_RISK",
      "severity": "high",
      "title": "High-Risk Patient: PAT-00003",
      "status": "active",
      "escalated": false,
      "notes": []
    }
  ],
  "total": 39
}
```

---

### POST /alerts/{alert_id}/acknowledge *(protected)*

Mark alert as acknowledged.

**Body (optional):** `{ "note": "Reviewed and actioning." }`

**Response 200:** `{ "message": "Alert acknowledged." }`

---

### POST /alerts/{alert_id}/escalate *(protected)*

Escalate to another role.

**Body:**
```json
{ "reason": "Delay exceeds threshold. Immediate review needed.", "to_role": "specialist" }
```

**Response 201:** `{ "escalation": { "escalation_id": "ESC-00001", ... }, "message": "Alert escalated." }`

---

### POST /alerts/{alert_id}/resolve *(protected)*

**Body (optional):** `{ "note": "Issue resolved. Patient discharged." }`

**Response 200:** `{ "message": "Alert resolved." }`

---

### POST /alerts/{alert_id}/false-positive *(protected)*

Mark alert as a false positive for error analysis.

**Body:** `{ "reason": "Test was already completed in a different system." }`

**Response 200:** `{ "message": "Alert marked as false positive." }`

---

### POST /alerts/{alert_id}/assign *(protected)*

**Body:** `{ "assigned_to": "Dr. Priya Sharma" }`

**Response 200:** `{ "message": "Alert assigned." }`

---

### GET /alerts/escalations *(protected)*

Lists escalations. Specialists see only escalations targeted to their role.

**Response 200:**
```json
{ "escalations": [ { "escalation_id": "ESC-00001", "from_role": "nurse", "to_role": "doctor", "status": "open", ... } ], "total": 5 }
```

---

### POST /alerts/escalations/{esc_id}/resolve *(protected)*

**Body (optional):** `{ "comment": "Specialist reviewed and discharged patient." }`

**Response 200:** `{ "message": "Escalation resolved." }`

---

## Metrics

### GET /dashboard *(protected)*

Full dashboard summary including KPIs and chart data.

**Response 200:**
```json
{
  "summary": {
    "total_patients": 105,
    "active_admissions": 25,
    "occupied_beds": 25,
    "available_beds": 45,
    "bed_occupancy_pct": 35.7,
    "pending_tests": 180,
    "delayed_diagnostics": 145,
    "high_risk_patients": 19,
    "discharge_blockers": 52,
    "avg_diagnostic_delay_hours": 12.3,
    "los_bottleneck_hours": 6021.9
  },
  "charts": {
    "delay_by_test_type": [ { "test_type": "CT Scan", "avg_delay_hours": 14.2, "count": 12 } ],
    "risk_distribution": [ { "name": "HIGH", "value": 19 } ],
    "discharge_blocker_reasons": [ { "reason": "Pending diagnostic result", "count": 40 } ]
  }
}
```

---

### GET /metrics *(protected)*

Extended metrics including precision/recall/F1 and baseline comparison.

**Response 200:**
```json
{
  "total_patients": 105,
  "avg_diagnostic_delay_hours": 12.3,
  "median_diagnostic_delay_hours": 8.7,
  "high_risk_cases": 19,
  "discharge_blockers": 52,
  "avg_los_hours": 48.2,
  "los_bottleneck_hours": 6021.9,
  "baseline_los_bottleneck_hours": 6307.9,
  "proposed_los_bottleneck_hours": 6021.9,
  "hours_saved": 286.0,
  "improvement_pct": 4.5,
  "precision": 0.4306,
  "recall": 1.0,
  "f1_score": 0.602,
  "accuracy": 0.7128,
  "false_positive_count": 82,
  "false_negative_count": 0,
  "note": "All metrics are from SYNTHETIC data."
}
```

---

### GET /baseline *(protected)*

Full baseline vs proposed comparison.

**Response 200:**
```json
{
  "baseline": { "process_label": "Baseline (Manual/Reactive)", "total_los_bottleneck_hours": 6307.9, ... },
  "proposed": { "process_label": "Proposed (Early-Warning Rule Engine)", "total_los_bottleneck_hours": 6021.9, ... },
  "comparison_table": [ { "metric": "Total LOS Bottleneck Hours", "baseline": 6307.9, "proposed": 6021.9, "improvement_pct": 4.5 } ],
  "summary": { "los_hours_saved": 286.0, "improvement_pct": 4.5 },
  "disclaimer": "All results are from a SYNTHETIC prototype experiment..."
}
```

---

### GET /error-analysis *(protected)*

Prediction error analysis.

**Response 200:**
```json
{
  "true_positives": 62, "false_positives": 82, "false_negatives": 0, "true_negatives": 133,
  "precision": 0.4306, "recall": 1.0, "accuracy": 0.7128, "f1_score": 0.602,
  "total_assessed": 277,
  "false_positive_details": [ { "test_id": "TST-00012", "predicted": "HIGH", "actual": "LOW", "reason": "..." } ],
  "false_negative_details": [],
  "missing_data_cases": [ { "test_id": "TST-00045", "issue": "Missing timestamps: specimen_time" } ],
  "conflicting_timestamp_cases": [ { "test_id": "TST-00067", "issue": "Data quality issue: report_time is before specimen_time" } ],
  "note": "Metrics calculated on SYNTHETIC validation dataset only."
}
```

---

### GET /beds *(protected)*

Bed occupancy summary by ward.

---

## Consent

### GET /consent/{patient_id} *(protected, not lab)*

Returns consent record for a patient.

**Response 200:**
```json
{
  "consent": {
    "patient_id": "PAT-00001",
    "consent_status": "given",
    "privacy_level": "standard",
    "data_sharing_consent": true,
    "research_consent": false,
    "notes": ""
  }
}
```

---

### POST /consent/{patient_id} *(protected, roles: admin/doctor/nurse)*

Create or update consent record.

**Body:**
```json
{
  "consent_status": "given",
  "privacy_level": "standard",
  "data_sharing_consent": true,
  "research_consent": false,
  "consented_by": "Nurse Ananya",
  "notes": "Verbal consent obtained."
}
```

---

## Integration Stubs

All return synthetic data. Clearly labelled as stubs.

### GET /integration/test-orders *(protected)*
### GET /integration/lab-results *(protected)*
### GET /integration/scan-status *(protected)*
### GET /integration/specialist-availability *(protected)*

All responses include:
```json
{ "stub": true, "banner": "INTEGRATION STUB — Synthetic data only...", "data": [...] }
```

---

## Error Responses

All endpoints return structured JSON errors:

| Status | Meaning |
|---|---|
| 400 | Bad request / missing required fields |
| 401 | Missing, expired, or invalid JWT token |
| 403 | Authenticated but insufficient role permissions |
| 404 | Resource not found |
| 500 | Internal server error (includes detail) |

```json
{ "error": "Patient not found." }
```

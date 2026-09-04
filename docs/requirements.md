# Requirements Specification
## Diagnostic-Delay Early-Warning Dashboard — COE Project

> Version 1.0 | PROTOTYPE | Synthetic data only

---

## 1. Problem Statement

District hospitals with limited beds and limited specialist availability face a recurring problem: diagnostic bottlenecks silently extend patient length of stay (LOS). When a specimen is not collected on time, when a lab report is ready but no doctor has reviewed it, or when a specialist is unavailable, the patient occupies a bed unnecessarily.

These delays are currently identified manually and reactively — often hours after they begin, when the window to intervene has narrowed. There is no automated system to detect these bottlenecks early, classify their severity, or route them to the appropriate person for action.

**Core question:** Can a transparent rule-based system detect diagnostic delays earlier, flag discharge blockers proactively, and improve LOS-attributable bottleneck hours?

---

## 2. Objectives

1. Detect diagnostic delays at each stage of the pipeline (order → specimen → processing → report → review → specialist → discharge).
2. Calculate delay duration, classify risk (LOW/MEDIUM/HIGH), and identify whether a delay is blocking discharge.
3. Generate structured alerts and route them through an escalation workflow.
4. Compare baseline (manual) process against proposed (automated) process on a key metric: **LOS hours attributable to unresolved diagnostic bottlenecks**.
5. Provide error analysis (precision, recall, F1) on synthetic validation data.
6. Support role-based access: Admin, Doctor, Nurse, Lab/Scan Staff, Specialist.
7. Manage patient consent and privacy indicators.

---

## 3. Functional Requirements

### FR-01: Authentication & Role-Based Access
- FR-01-1: Users must authenticate with username and password.
- FR-01-2: JWT-based session management with 12-hour expiry.
- FR-01-3: Five roles: admin, doctor, nurse, lab, specialist.
- FR-01-4: Role-based route protection — both frontend and backend enforce access control.
- FR-01-5: Demo credentials provided for all five roles.
- FR-01-6: Lab staff see only test/specimen/scan fields, not full clinical records.

### FR-02: Patient Management
- FR-02-1: Admit patients with ward, bed, doctor assignment.
- FR-02-2: Track status: admitted → discharged / transferred.
- FR-02-3: Bed allocation and release on discharge.
- FR-02-4: Patient detail page with all clinical and diagnostic information.
- FR-02-5: Visual timeline of the patient care journey.

### FR-03: Diagnostic Test Tracking
- FR-03-1: Create test orders with type, urgency, timestamps.
- FR-03-2: Track pipeline stages: Ordered → Specimen Pending → Processing → Report Generated → Doctor Review → Specialist Review → Completed.
- FR-03-3: Update status at each stage with automatic timestamp recording.
- FR-03-4: Identify scan vs lab test pathways.
- FR-03-5: Flag discharge blockers at test level.

### FR-04: Diagnostic Delay Engine
- FR-04-1: Calculate delay hours from available timestamps.
- FR-04-2: Identify delay type: Specimen Collection Delay, Scan Delay, Report Pending, Doctor Review Pending, Specialist Availability Delay.
- FR-04-3: Handle missing timestamps gracefully ("Insufficient Data").
- FR-04-4: Detect conflicting timestamps ("Data quality issue").
- FR-04-5: Risk classification: LOW (<4h), MEDIUM (4–8h), HIGH (≥8h).
- FR-04-6: Risk escalation factors: discharge blocker, urgent test, specialist unavailable.
- FR-04-7: Confidence score (20–97%) with explanation text.
- FR-04-8: All rules are transparent — every decision can be explained in plain English.

### FR-05: Alert System
- FR-05-1: Generate alerts for: HIGH_RISK, DISCHARGE_BLOCKER, SPECIMEN_DELAY, SCAN_DELAY, REPORT_PENDING, SPECIALIST_UNAVAILABLE.
- FR-05-2: Actions: Acknowledge, Escalate, Resolve, Mark False Positive, Assign.
- FR-05-3: All alert actions timestamped with user attribution.
- FR-05-4: Notes/activity log on every alert.
- FR-05-5: Role-based alert visibility (lab staff see only test-related alerts).

### FR-06: Escalation Workflow
- FR-06-1: Escalation chain: Nurse/Doctor → Doctor → Specialist → Admin.
- FR-06-2: Every escalation records: from_role, to_role, reason, timestamp.
- FR-06-3: Escalations can be resolved with comments.
- FR-06-4: Escalation status tracked independently of alert status.

### FR-07: Baseline vs Proposed Comparison
- FR-07-1: Baseline simulates manual/reactive process with 6h average detection lag.
- FR-07-2: Proposed simulates this system with 0.5h detection lag.
- FR-07-3: Key metric: LOS hours attributable to unresolved diagnostic bottlenecks.
- FR-07-4: Comparison table with improvement percentages.
- FR-07-5: All results clearly labelled as SYNTHETIC EXPERIMENT.

### FR-08: Error Analysis
- FR-08-1: Compare predicted risk level (HIGH/other) against ground-truth actual_risk_level.
- FR-08-2: Calculate precision, recall, accuracy, F1 score.
- FR-08-3: List false positives, false negatives, missing data cases, conflicting timestamp cases.
- FR-08-4: Failure reason explanation for each false negative.

### FR-09: Consent & Privacy
- FR-09-1: Per-patient consent record: Given / Not Given / Unknown.
- FR-09-2: Data sharing and research consent flags.
- FR-09-3: Privacy level: Standard / High.
- FR-09-4: Role-based visibility enforced in UI and API.
- FR-09-5: Lab staff denied access to consent endpoint (403).

### FR-10: Integration Stubs
- FR-10-1: Four stub endpoints simulating HIS, LIS, RIS, specialist roster.
- FR-10-2: Stubs return synthetic data with clear labelling.
- FR-10-3: Stubs accessible only to authenticated users.

### FR-11: Dashboard & Metrics
- FR-11-1: Real-time KPIs: total patients, active admissions, bed occupancy, pending tests, delayed diagnostics, high-risk patients, discharge blockers, avg delay, LOS bottleneck.
- FR-11-2: Charts: delay by test type (bar), risk distribution (pie), discharge blocker reasons.
- FR-11-3: Metrics endpoint with precision/recall/F1, baseline/proposed comparison, hours saved.

---

## 4. Non-Functional Requirements

### NFR-01: Performance
- Dashboard must load in < 3 seconds on localhost.
- API responses < 500ms for standard queries.

### NFR-02: Reliability
- Application must run without MongoDB using in-memory fallback.
- Missing or invalid timestamps must not crash the engine.
- API errors return structured JSON responses.

### NFR-03: Security
- JWT authentication on all non-public endpoints.
- Passwords stored as bcrypt hashes.
- Role enforcement at both API (Flask) and UI (React Router) layers.
- No real patient data used anywhere.

### NFR-04: Maintainability
- Risk thresholds configurable in `delay_engine.py` `THRESHOLDS` dict.
- Rule logic is readable Python — no black-box model.
- All synthetic data is reproducible (random.seed(42)).

### NFR-05: Transparency
- Every risk classification includes a plain-English explanation.
- Every confidence score includes a reason.
- Prototype/synthetic labels are visible in all relevant UI locations.

### NFR-06: Usability
- Responsive layout for desktop and tablet.
- Consistent loading, error, and empty states.
- Role-based sidebar shows only relevant navigation items.

---

## 5. Edge Case Requirements

| ID | Scenario | Expected Behaviour |
|---|---|---|
| EC-01 | Test ordered but specimen never collected | Specimen Collection Delay flagged; HIGH after threshold |
| EC-02 | Report ready but doctor has not reviewed | Doctor Review Pending alert |
| EC-03 | Specialist required but unavailable | Specialist Availability Delay + HIGH risk |
| EC-04 | Missing timestamp | "Insufficient Data" — no crash, confidence reduced |
| EC-05 | Conflicting timestamps (report before specimen) | "Data quality issue" shown, confidence reduced |
| EC-06 | False positive alert | User can mark False Positive; stored for error analysis |

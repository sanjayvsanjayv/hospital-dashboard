# Limitations
## Diagnostic-Delay Early-Warning Dashboard — COE Project

> This document is part of mandatory project documentation. Honest limitations are essential for responsible prototype evaluation.

---

## 1. Data Limitations

### 1.1 Synthetic data only
All patient records, test results, timestamps, and outcomes are artificially generated using `random.seed(42)`. The system has never been evaluated against real hospital data.

### 1.2 No real validation dataset
The error analysis metrics (precision, recall, F1) are computed by comparing the engine's predictions against the `actual_risk_level` field, which was itself set by the same data generator using scenario rules. This is a **closed-loop validation** and does not reflect performance on unseen real-world data.

### 1.3 Simplified patient model
Real patient records contain hundreds of fields (ICD codes, comorbidities, medication history, nursing observations, vital signs). This prototype tracks a simplified set focused only on diagnostic pipeline timestamps.

### 1.4 Static timestamp generation
Synthetic timestamps are generated at seed time and do not advance in real time. The "delay hours" values are computed relative to `datetime.now()` at request time, which means delays grow the longer the server runs. This is intentional for demo purposes but would need rethinking in a deployed system.

---

## 2. Clinical Limitations

### 2.1 Not clinically validated
No clinical expert has reviewed the risk thresholds (4h → MEDIUM, 8h → HIGH), delay type classifications, or confidence calculations. These thresholds were chosen to be plausible for demonstration purposes only.

### 2.2 Confidence score is not probability calibrated
The 20–97% confidence scores are derived from heuristic rules (penalty for missing data, bonus for discharge blockers), not from a statistically calibrated model. They should not be interpreted as calibrated probabilities.

### 2.3 No clinical outcome data
The system cannot track whether an early warning actually prevented harm or reduced LOS in real patients, because no such data exists for this prototype.

### 2.4 No patient acuity or comorbidity adjustment
A 4-hour specimen delay may be very different for an 85-year-old sepsis patient versus a 30-year-old with a routine infection. The engine does not adjust for clinical severity, comorbidities, or patient acuity.

### 2.5 Specialist availability is binary
In reality, specialist availability is nuanced — a specialist may be in surgery, available by phone, or available within 2 hours. The prototype only tracks a boolean `specialist_available` flag.

---

## 3. Technical Limitations

### 3.1 In-memory database is volatile
When using the fallback in-memory database (the default), all data is lost when the Flask server restarts. The database is re-seeded from scratch on startup. For persistent operation, configure MongoDB.

### 3.2 No real-time push updates
The dashboard requires a manual refresh or page navigation to show updated data. There is no WebSocket or Server-Sent Events implementation for real-time push notifications. A production system should implement live alerts.

### 3.3 Single-instance deployment only
The in-memory fallback database is not shared between multiple Flask processes. For multi-worker deployments, MongoDB must be configured.

### 3.4 No audit logging
The system does not maintain a comprehensive immutable audit trail of all actions. The alert notes/activity log is partial. A production healthcare system requires full audit logging for regulatory compliance.

### 3.5 Password storage is demo-only
Demo passwords (`admin123`, `doctor123`, etc.) are weak and exist for prototype convenience. A production system must enforce strong password policies, account lockout, and MFA.

### 3.6 No rate limiting or DDoS protection
The API has no rate limiting, request throttling, or brute-force protection.

### 3.7 CORS is open
`Flask-CORS` is configured with `origins: "*"` for development convenience. This must be locked down in production.

### 3.8 JWT tokens are not revocable
Once issued, a JWT token cannot be individually revoked until it expires (12 hours). A production system needs a token denylist.

### 3.9 No pagination on all endpoints
Some endpoints (tests, alerts) return all matching documents without pagination. For large datasets this could be slow.

### 3.10 Large frontend bundle
The production build produces a ~800KB JS bundle. Code splitting would reduce initial load time in production.

---

## 4. Operational Limitations

### 4.1 No automated alert generation loop
Alerts are generated once during data seeding. In a real system, a background process or scheduled job would continuously re-evaluate all active patients and generate new alerts as conditions change. This prototype only recalculates risk when a test status is explicitly updated.

### 4.2 No notification system
There is no email, SMS, or push notification system. Staff must actively open the dashboard to see new alerts.

### 4.3 No bed management workflow
The system tracks bed occupancy but does not manage bed requests, bed cleaning queues, or bed reassignments.

### 4.4 No shift handover support
Nurses and doctors changing shifts need to be briefed on pending alerts. The system has no shift handover summary or "handover bundle" feature.

---

## 5. Regulatory and Compliance Limitations

### 5.1 Not compliant with healthcare regulations
This prototype does not comply with any healthcare IT regulations (e.g., HL7 FHIR, HIPAA, NHS DSPT, ABDM/NHP India standards). Compliance engineering would be required before any real deployment.

### 5.2 No HL7/FHIR integration
The integration stubs simulate HIS/LIS/RIS connections but do not implement real HL7 v2, HL7 FHIR R4, or any standard clinical messaging format.

### 5.3 Consent model is simplified
The consent tracking in this prototype is indicative only. Real patient consent management requires legal review, regulatory compliance, and integration with existing clinical systems.

---

## 6. Improvement Opportunities

| Limitation | Suggested Improvement |
|---|---|
| Volatile in-memory DB | Always use MongoDB Atlas with proper backups |
| No real-time updates | Add WebSocket layer (Flask-SocketIO or separate service) |
| No audit logging | Add immutable audit log table |
| Static timestamps | Background risk-evaluation job every 15 minutes |
| Binary specialist availability | Integrate with real scheduling system |
| Open CORS | Configure strict CORS origin allowlist |
| Weak passwords | Enforce password policy, add MFA |
| No HL7/FHIR | Implement FHIR R4 adapter layer for real HIS integration |
| Clinical validation | Conduct structured evaluation with clinical experts |
| Bundle size | Implement route-based code splitting |

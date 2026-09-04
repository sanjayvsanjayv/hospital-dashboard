# System Architecture
## Diagnostic-Delay Early-Warning Dashboard

> PROTOTYPE — Synthetic data only

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (React App)                       │
│  Vite + React + Tailwind CSS + React Router + Recharts       │
│  Port: 5173 (dev)                                            │
└─────────────────────────┬────────────────────────────────────┘
                          │  HTTP/REST (proxied /api/*)
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                   Flask REST API                              │
│  Port: 5000                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  /auth   │ │/patients │ │  /tests  │ │   /alerts    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │/metrics  │ │/baseline │ │/consent  │ │/integration  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────┬────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────────┐       ┌──────────────────────────┐
│  Risk / Delay Engine  │       │  Baseline Engine          │
│  delay_engine.py      │       │  baseline_engine.py       │
│  Rule-based, transparent│     │  Synthetic comparison     │
└──────────────────────┘       └──────────────────────────┘
          │                               │
          └───────────────┬───────────────┘
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    Database Layer                             │
│  ┌─────────────────────────┐  ┌────────────────────────┐   │
│  │  MongoDB (Atlas/local)  │  │  In-Memory Fallback     │   │
│  │  (when configured)      │  │  (default, always works)│   │
│  └─────────────────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│           Synthetic Hospital Data (auto-seeded)              │
│  105 patients · 277 tests · 48 alerts · 70 beds              │
│  Generated with random.seed(42) — fully reproducible         │
└──────────────────────────────────────────────────────────────┘

             ┌──────────────────────────────────────┐
             │        Integration Stubs              │
             │  /api/integration/test-orders         │
             │  /api/integration/lab-results         │
             │  /api/integration/scan-status         │
             │  /api/integration/specialist-avail.   │
             │  (Simulate HIS/LIS/RIS — NOT real)   │
             └──────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (React)

| Layer | Technology | Purpose |
|---|---|---|
| Build tool | Vite 6 | Fast dev server, ES module bundling |
| UI framework | React 19 | Component-based UI |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Routing | React Router 7 | Client-side navigation with role guards |
| Charts | Recharts 2 | Bar, pie, radar charts |
| Icons | Lucide React | Consistent icon set |
| HTTP | Axios | API calls with JWT interceptor |

**Key frontend components:**
- `AuthContext` — JWT state management, login/logout
- `ProtectedRoute` — wraps routes with role enforcement
- `Layout` — sidebar, top bar, navigation
- `RiskBadge` / `StatusBadge` — reusable status indicators
- `StatCard` — KPI cards with icons
- `Modal` — accessible modal dialog
- `LoadingSpinner` / `ErrorMessage` / `EmptyState` — consistent states

**Pages and role access:**

| Page | Admin | Doctor | Nurse | Lab | Specialist |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Patients | ✓ | ✓ | ✓ | — | ✓ |
| Diagnostics | ✓ | ✓ | ✓ | ✓ | — |
| Alerts | ✓ | ✓ | ✓ | ✓ | ✓ |
| Baseline vs Proposed | ✓ | ✓ | — | — | — |
| Error Analysis | ✓ | ✓ | — | — | — |
| Consent & Privacy | ✓ | ✓ | ✓ | — | — |
| Integration Stubs | ✓ | — | — | — | — |

---

### Backend (Flask)

**Application factory pattern** (`app/app.py` → `create_app()`):
- Registers CORS, JWT extension, blueprints
- Calls `init_db()` and seeds if empty
- Global error handlers for 404/500/JWT errors

**Blueprints:**

| Blueprint | Prefix | Responsibility |
|---|---|---|
| `auth_bp` | `/api/auth` | Login, /me, logout |
| `patients_bp` | `/api/patients` | CRUD patients, risk aggregation, timeline |
| `tests_bp` | `/api/tests` | CRUD tests, status transitions |
| `alerts_bp` | `/api/alerts` | Alerts, escalations, all alert actions |
| `metrics_bp` | `/api` | Dashboard, metrics, baseline, error analysis, beds |
| `consent_bp` | `/api/consent` | Per-patient consent records |
| `integration_bp` | `/api/integration` | Four simulation stubs |

---

### Delay / Risk Engine

Located in `app/engine/delay_engine.py`.

**Algorithm (transparent rule-based):**

```
Input: test record (timestamps, flags)

1. Parse all timestamps safely
2. Detect data quality issues (missing, conflicting)
3. Determine pathway: Scan (CT/MRI/X-Ray/US) or Lab
4. Walk the pipeline stages:
   Scan pathway:
     Order → Scan Started? → Report? → Doctor Reviewed? → Specialist?
   Lab pathway:
     Order → Specimen Collected? → Report? → Doctor Reviewed? → Specialist?
5. At first incomplete stage, calculate delay_hours = now - last_stage_time
6. Classify risk:
   delay < 4h              → LOW (base confidence ~90%)
   4h ≤ delay < 8h         → MEDIUM (base ~85%)
   delay ≥ 8h              → HIGH (base ~88%)
7. Apply escalation factors:
   +risk if discharge_blocker == true
   +risk if urgent/critical test
   +risk if specialist_required and not specialist_available
8. Reduce confidence for missing/conflicting data
9. Build plain-English explanation
```

**Configurable thresholds** (`THRESHOLDS` dict):
```python
THRESHOLDS = {
    "low_medium": 4.0,
    "medium_high": 8.0,
    "specimen_urgent": 1.0,
    "specimen_normal": 2.0,
    "scan_delay": 2.0,
    "report_delay": 4.0,
    "doctor_review_delay": 2.0,
    "specialist_delay": 3.0,
}
```

---

### Database Layer

**Primary:** MongoDB (Atlas or local) — configured via `MONGODB_URI`.

**Fallback:** `_FallbackCollection` in `app/database.py` — a list-backed in-memory store with a MongoDB-compatible interface (find, find_one, insert_one, insert_many, update_one, update_many, delete_one, aggregate subset).

**Collections:**

| Collection | Description |
|---|---|
| `users` | Auth accounts with bcrypt-hashed passwords |
| `patients` | Patient records with risk aggregation |
| `tests` | Diagnostic test orders and timestamps |
| `alerts` | System alerts with action history |
| `beds` | Bed inventory with occupancy status |
| `consent` | Per-patient consent records |
| `escalations` | Escalation chain records |

---

### Synthetic Data Generator

`app/data_generator.py` — deterministic with `random.seed(42)`.

Generates 10 scenario types per test:
- `normal` — no significant delay
- `delayed` — significant delay, possible discharge blocker
- `specimen` — Edge Case 1: test ordered, specimen never collected
- `review` — Edge Case 2: report ready, doctor not reviewed
- `specialist` — Edge Case 3: specialist required but unavailable
- `missing_ts` — Edge Case 4: missing timestamps
- `conflict` — Edge Case 5: conflicting timestamps

---

## Data Flow: Single Test Delay Assessment

```
Test record in DB
        │
        ▼
calculate_test_delay(test)          ← delay_engine.py
        │
        ├── _safe_parse(timestamps) ← handles None, strings, datetimes
        ├── detect data quality issues
        ├── determine pathway (scan vs lab)
        ├── walk pipeline stages
        ├── _classify_risk(delay_hours, factors)
        └── _build_explanation()
        │
        ▼
{
  delay_type, delay_hours, is_discharge_blocker,
  risk_level, confidence, confidence_reason,
  data_issues, stage, explanation
}
        │
        ▼
aggregate_patient_risk([assessments])  ← worst risk across all tests
        │
        ▼
Patient risk_level, risk_confidence updated in DB
```

---

## Security Architecture

```
Request
   │
   ▼
Flask route
   │
   ├── @jwt_required() ──── checks Authorization: Bearer <token>
   │                        returns 401 if missing/invalid/expired
   ├── get_jwt()       ──── extracts role from claims
   │
   ├── Role check      ──── returns 403 if role not permitted
   │
   └── Business logic
```

JWT tokens are signed with `JWT_SECRET` (HS256). Tokens expire after 12 hours. Passwords are bcrypt-hashed with work factor 12.

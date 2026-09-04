# Diagnostic-Delay Early-Warning Dashboard
## District Hospital Patient Flow — COE Project Prototype

> ⚠ **PROTOTYPE** — All patient data is entirely synthetic. Not for clinical use.

A full-stack web application that monitors diagnostic bottlenecks in a district hospital, generates early-warning risk alerts, and provides a structured escalation workflow.

---

## Quick Start (3 steps)

### Step 1 — Install Python packages

```bash
cd hospital-dashboard/backend
pip install Flask flask-cors Flask-JWT-Extended pymongo python-dotenv pandas scikit-learn numpy bcrypt python-dateutil
python run.py
```

Backend starts on **http://localhost:5000** and auto-seeds demo data.

### Step 2 — Install & start frontend

```bash
cd hospital-dashboard/frontend
npm install
npm run dev
```

Frontend starts on **http://localhost:5173**

### Step 3 — Open the app

Go to **http://localhost:5173** and log in with any demo account:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `doctor` | `doctor123` | Doctor |
| `nurse` | `nurse123` | Nurse |
| `lab` | `lab123` | Lab/Scan |
| `specialist` | `specialist123` | Specialist |

---

## Full Documentation

See the `docs/` folder:

- [`docs/README.md`](docs/README.md) — Detailed setup guide
- [`docs/requirements.md`](docs/requirements.md) — Functional & non-functional requirements
- [`docs/architecture.md`](docs/architecture.md) — System architecture & data flow
- [`docs/api-documentation.md`](docs/api-documentation.md) — All API endpoints
- [`docs/limitations.md`](docs/limitations.md) — Known limitations
- [`docs/validation-report.md`](docs/validation-report.md) — Metrics & validation results

---

## What does this system do?

| Feature | Description |
|---|---|
| **Early-warning risk engine** | Transparent rules detect delays at every pipeline stage |
| **Risk classification** | LOW / MEDIUM / HIGH with confidence score and explanation |
| **Discharge blocker tracking** | Identifies which delays are preventing discharge |
| **LOS bottleneck metric** | Hours of LOS attributable to unresolved diagnostic delays |
| **Alert system** | Acknowledge, escalate, resolve, mark false positive |
| **Escalation workflow** | Nurse → Doctor → Specialist → Admin |
| **Baseline vs Proposed** | Synthetic comparison of manual vs automated detection |
| **Error analysis** | Precision, recall, F1, false positives/negatives |
| **Consent & privacy** | Per-patient consent tracking with role-based visibility |
| **Integration stubs** | Simulated HIS, LIS, RIS, and specialist availability feeds |
| **5 user roles** | Admin, Doctor, Nurse, Lab/Scan Staff, Specialist |

---

## Technology Stack

**Frontend:** React 19 · Vite 6 · Tailwind CSS 4 · React Router 7 · Recharts · Lucide React · Axios

**Backend:** Python 3.13 · Flask 3 · Flask-JWT-Extended · Flask-CORS

**Database:** MongoDB Atlas / local MongoDB (or in-memory fallback — works without any DB install)

**ML/Analytics:** pandas · scikit-learn · numpy (for baseline comparison and error analysis)

---

## Demo Scenario (End-to-End)

1. Login as **Nurse** → open Patients → select a HIGH-risk patient
2. Find a test with "Specimen Collection Delay" → click **Mark Specimen Collected**
3. Navigate to **Alerts** → find the HIGH_RISK alert → **Escalate to Doctor**
4. Login as **Doctor** → **Acknowledge** alert → open patient → **Mark Report Ready** → escalate to Specialist
5. Login as **Specialist** → **Resolve** alert
6. Navigate to **Baseline vs Proposed** → see LOS bottleneck comparison
7. Navigate to **Error Analysis** → see precision/recall/F1

---

## COE Project Notes

This project was built as a Centre of Excellence (COE) prototype demonstrating:

- Transparent rule-based clinical decision support (no black-box ML)
- End-to-end patient flow tracking
- Structured escalation workflow
- Quantified baseline-vs-proposed comparison methodology
- Honest error analysis with documented limitations

All figures are from synthetic data. Refer to `docs/validation-report.md` for full methodology and caveats.

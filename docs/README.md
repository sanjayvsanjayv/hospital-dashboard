# Diagnostic-Delay Early-Warning Dashboard
## District Hospital Patient Flow — COE Project Prototype

> **PROTOTYPE — All patient data is entirely synthetic. This system is not for clinical use.**

---

## What is this?

A full-stack web application that monitors diagnostic bottlenecks in a district hospital and generates early warnings before delays significantly extend a patient's length of stay (LOS).

The core problem: diagnostic delays (specimen not collected, scan backlog, report not reviewed, specialist unavailable) can silently add hours to a patient's bed stay. This system detects those delays automatically, classifies risk, and escalates through a structured workflow.

---

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| MongoDB (optional) | 6+ — app runs without it using in-memory fallback |

---

### 1. Clone / open the project

```
hospital-dashboard/
├── backend/          ← Flask API
├── frontend/         ← React + Vite
└── docs/             ← Documentation
```

---

### 2. Backend setup

```bash
cd hospital-dashboard/backend

# Install Python dependencies
pip install Flask flask-cors Flask-JWT-Extended pymongo python-dotenv \
            pandas scikit-learn numpy bcrypt python-dateutil

# Copy and configure environment
cp .env.example .env
# Edit .env — see "Environment Variables" below

# Start the API server
python run.py
```

The backend starts on **http://localhost:5000**.

On first start it automatically seeds 105 synthetic patients, 277 tests, 48 alerts, and 70 beds.

---

### 3. Frontend setup

```bash
cd hospital-dashboard/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend starts on **http://localhost:5173**.

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000`, so no CORS issues during development.

---

### 4. Environment variables (backend/.env)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | *(empty)* | MongoDB connection string. Leave empty to use in-memory fallback. |
| `DB_NAME` | `hospital_dashboard` | MongoDB database name |
| `SECRET_KEY` | `dev-secret-key-…` | Flask secret key — change in production |
| `JWT_SECRET` | `dev-jwt-secret-…` | JWT signing key — change in production |
| `FLASK_DEBUG` | `1` | Set to `0` in production |
| `USE_LOCAL_FALLBACK` | `true` | Force in-memory DB (ignore MongoDB URI) |
| `PORT` | `5000` | API port |

**MongoDB Atlas:**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hospital_dashboard
USE_LOCAL_FALLBACK=false
```

**Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/hospital_dashboard
USE_LOCAL_FALLBACK=false
```

**No MongoDB (in-memory, default):**
```
USE_LOCAL_FALLBACK=true
```

---

### 5. Demo login credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `doctor` | `doctor123` | Doctor |
| `nurse` | `nurse123` | Nurse |
| `lab` | `lab123` | Lab/Scan Staff |
| `specialist` | `specialist123` | Specialist |

> **These are DEMO credentials for a prototype. Never use these in production.**

---

### 6. API health check

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "db_mode": "fallback (in-memory)",
  "version": "1.0.0"
}
```

---

## End-to-End Demo Scenario

Follow this sequence to demonstrate the full workflow:

1. Open http://localhost:5173
2. Log in as **Nurse** (`nurse / nurse123`)
3. Open **Patients** — see 25 active admitted patients
4. Click a patient with HIGH risk (red badge)
5. Observe bed assignment, admission time, active tests
6. Find a test with "Specimen Collection Delay" — click it to expand
7. Click **Mark Specimen Collected** — timestamp is auto-set
8. Risk recalculates immediately
9. Navigate to **Alerts** — find the associated HIGH_RISK alert
10. Click **Escalate** → select Doctor, add reason → Confirm
11. Log out → Log in as **Doctor** (`doctor / doctor123`)
12. Open **Alerts** → find the escalated alert → Acknowledge
13. Open the patient → find report pending → click **Mark Report Ready**
14. Click **Escalate** → escalate to Specialist
15. Log out → Log in as **Specialist** (`specialist / specialist123`)
16. Open **Alerts** → find the escalated alert → Resolve
17. Log back in as Doctor → on patient, click **Mark Doctor Reviewed**
18. Discharge blocker clears → patient ready for discharge
19. Navigate to **Baseline vs Proposed** — see LOS bottleneck comparison
20. Navigate to **Error Analysis** — see precision/recall/F1

---

## Project Structure

```
hospital-dashboard/
├── backend/
│   ├── app/
│   │   ├── app.py              ← Flask application factory
│   │   ├── database.py         ← MongoDB + in-memory fallback
│   │   ├── data_generator.py   ← Synthetic dataset generator
│   │   ├── engine/
│   │   │   ├── delay_engine.py     ← Rule-based delay/risk engine
│   │   │   └── baseline_engine.py  ← Baseline vs proposed comparison
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── patients.py
│   │       ├── tests.py
│   │       ├── alerts.py
│   │       ├── metrics.py
│   │       ├── consent.py
│   │       └── integration.py
│   ├── run.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/           ← Axios client + all API calls
│   │   ├── context/       ← Auth context
│   │   ├── components/    ← Shared UI components
│   │   └── pages/         ← All page components
│   ├── vite.config.js
│   └── package.json
└── docs/
    ├── README.md
    ├── requirements.md
    ├── architecture.md
    ├── api-documentation.md
    ├── limitations.md
    └── validation-report.md
```

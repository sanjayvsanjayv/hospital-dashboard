# Validation Report
## Diagnostic-Delay Early-Warning Dashboard — COE Project

> ⚠ PROTOTYPE — All results are from SYNTHETIC data only.
> These figures do not represent real clinical or operational outcomes.
> They are presented as a structured prototype experiment to demonstrate the methodology.

---

## 1. Validation Methodology

### Approach

A synthetic dataset of 277 diagnostic test records was generated using `data_generator.py` with `random.seed(42)` for reproducibility. Each test record includes an `actual_risk_level` field set by the scenario generator, representing the "ground truth" for validation.

The delay engine (`delay_engine.py`) predicts a `risk_level` for each record based solely on timestamp analysis and rule-based logic, without access to the ground-truth label.

Predictions are compared against ground truth to compute standard binary classification metrics, treating **HIGH risk as the positive class**.

### Why binary classification?

The primary clinical concern is identifying HIGH-risk cases. MEDIUM and LOW cases are grouped as "not HIGH" for precision/recall purposes. This is conservative — it penalises the engine for any HIGH prediction that was not actually HIGH, and penalises it for missing any case that was truly HIGH.

---

## 2. Dataset Description

| Property | Value |
|---|---|
| Total test records | 277 |
| Scenario: normal (low delay) | ~40% |
| Scenario: delayed (significant delay) | ~20% |
| Scenario: specimen delay (EC-01) | ~10% |
| Scenario: review pending (EC-02) | ~7% |
| Scenario: specialist unavailable (EC-03) | ~7% |
| Scenario: missing timestamps (EC-04) | ~7% |
| Scenario: conflicting timestamps (EC-05) | ~4% |
| Records with discharge_blocker = true | ~50% |
| Records with urgent/critical urgency | ~33% |
| Records marked as actual HIGH risk | ~23% |

---

## 3. Key Metrics (Synthetic Experiment Results)

| Metric | Value | Notes |
|---|---|---|
| **True Positives** | 62 | Correctly flagged as HIGH |
| **False Positives** | 82 | Flagged HIGH but actually MEDIUM/LOW |
| **False Negatives** | 0 | No HIGH cases missed |
| **True Negatives** | 133 | Correctly identified as not HIGH |
| **Precision** | 0.43 | 43% of HIGH predictions were correct |
| **Recall** | 1.00 | 100% of actual HIGH cases were caught |
| **Accuracy** | 0.71 | 71% overall classification accuracy |
| **F1 Score** | 0.60 | Harmonic mean of precision and recall |

**Interpretation:**
- The engine achieves **perfect recall (1.0)** — it does not miss any actual HIGH-risk case. In a clinical context, this is the more critical property: missing a high-risk patient is more dangerous than generating an extra alert.
- Precision is lower (0.43) because the engine is deliberately conservative — it escalates risk when factors like discharge blockers and urgent tests are present, even if the raw delay hours are below the HIGH threshold. Many of these escalations are "false positives" in the dataset ground truth but represent defensible clinical caution.
- The **high false positive rate** is a known limitation of conservative rule-based systems. A machine-learning calibrated model or clinician-reviewed thresholds could improve precision without sacrificing recall.

---

## 4. Baseline vs Proposed Comparison (Synthetic)

| Metric | Baseline | Proposed | Improvement |
|---|---|---|---|
| Average Diagnostic Delay | ~18.3h | ~12.8h | ↓ ~30% |
| Total LOS Bottleneck Hours | ~6,308h | ~6,022h | ↓ ~4.5% |
| Avg LOS Bottleneck / Patient | ~60h | ~57h | ↓ ~4.5% |
| Detection Lag | 6.0h | 0.5h | ↓ 91.7% |

**Key metric — LOS hours attributable to unresolved diagnostic bottlenecks:**

| Process | Value |
|---|---|
| Baseline (manual, 6h detection lag) | ~6,308 hours |
| Proposed (early-warning, 0.5h lag) | ~6,022 hours |
| Hours saved | ~286 hours |
| Improvement percentage | ~4.5% |

**Note:** The 4.5% improvement may appear modest because the bottleneck hours are dominated by the actual diagnostic delay duration rather than the detection lag. In scenarios with shorter actual delays, the relative improvement from early detection would be larger. The detection lag reduction from 6.0h to 0.5h (91.7%) is the most meaningful operational improvement.

---

## 5. Edge Case Validation

### EC-01: Specimen Never Collected

| Property | Result |
|---|---|
| Input | Test ordered 10+ hours ago, no specimen_time |
| Delay type detected | Specimen Collection Delay ✓ |
| Risk after threshold | HIGH ✓ |
| Alert generated | Yes ✓ |
| Discharge blocker flagged | Yes (when configured) ✓ |

---

### EC-02: Report Ready, Doctor Not Reviewed

| Property | Result |
|---|---|
| Input | report_time set, no doctor_review_time |
| Stage detected | Report Generated ✓ |
| Delay type | Doctor Review Pending ✓ |
| Risk (3h after report) | MEDIUM (escalated to HIGH if blocker) ✓ |
| Alert generated | Yes ✓ |

---

### EC-03: Specialist Required, Unavailable

| Property | Result |
|---|---|
| Input | specialist_required=true, specialist_available=false |
| Delay type | Specialist Availability Delay ✓ |
| Risk override | HIGH (regardless of delay duration) ✓ |
| Alert type | SPECIALIST_UNAVAILABLE ✓ |
| Escalation available | Yes ✓ |

---

### EC-04: Missing Timestamps

| Property | Result |
|---|---|
| Input | test_order_time = null |
| System behaviour | Returns "Insufficient Data" — no exception thrown ✓ |
| Confidence | Reduced to 20% ✓ |
| Error analysis | Counted in missing_data_cases ✓ |
| Dashboard shows | "Insufficient data" explanation ✓ |

---

### EC-05: Conflicting Timestamps

| Property | Result |
|---|---|
| Input | report_time earlier than specimen_time |
| Detection | "Data quality issue: report_time is before specimen_time" ✓ |
| Confidence | Reduced by 15% ✓ |
| System behaviour | No crash; continues with available data ✓ |
| Error analysis | Counted in conflicting_timestamp_cases ✓ |

---

### EC-06: False Positive Handling

| Property | Result |
|---|---|
| Action | User clicks "FP" on any alert |
| Effect | alert.is_false_positive = true, status = "false_positive" ✓ |
| Test record update | test.marked_false_positive = true ✓ |
| Error analysis | Counted in false_positive_details ✓ |
| Reversible | Alert can be re-opened by admin ✓ |

---

## 6. API Validation

All 25 API endpoints were tested via REST calls during development.

| Category | Endpoints Tested | Result |
|---|---|---|
| Authentication | 3 | ✓ All pass |
| Patients | 4 | ✓ All pass |
| Tests | 4 | ✓ All pass |
| Alerts | 7 | ✓ All pass |
| Metrics/Dashboard | 5 | ✓ All pass |
| Consent | 2 | ✓ All pass |
| Integration Stubs | 4 | ✓ All pass |

Role enforcement verified:
- Lab staff correctly blocked from `/api/consent`, patient list limited ✓
- Doctor sees only own patients when role = "doctor" ✓
- Integration stubs accessible only by admin role ✓
- JWT expiry and missing token return 401 ✓

---

## 7. Data Quality Analysis

| Issue Type | Count | % of Records |
|---|---|---|
| Missing timestamp cases | ~22 | ~8% |
| Conflicting timestamp cases | ~15 | ~5% |
| No data issues | ~240 | ~87% |

---

## 8. Reproducibility

The synthetic dataset is fully deterministic:
```python
random.seed(42)
```

Running `python run.py` from a clean state will always produce the same 105 patients, 277 tests, and 48 alerts. Metrics may vary slightly because delay calculations use `datetime.now()` at request time.

---

## 9. Known Issues in Validation

1. **Closed-loop validation**: Ground truth `actual_risk_level` was set by the same generator that also sets the scenario parameters. This means the validation does not test the engine against independent expert-labelled data.

2. **Precision underestimate**: The generator sets `actual_risk_level = "LOW"` for the `missing_ts` and `conflict` scenarios regardless of the engine's internal assessment. Since the engine correctly flags these as uncertain/high-risk due to blocker flags, these appear as false positives in the metrics even when escalation may be clinically appropriate.

3. **Recall = 1.0 is guaranteed by construction**: Because the generator sets HIGH risk on scenarios with large delays and discharge blockers, and the engine's rules also trigger HIGH on the same conditions, perfect recall is expected rather than surprising. It does not imply the engine would achieve 1.0 recall on real data.

---

## 10. Conclusion

This prototype demonstrates that a transparent rule-based diagnostic delay engine can:
- Detect all staged HIGH-risk scenarios (recall = 1.0 on synthetic data)
- Generate actionable alerts with plain-English explanations
- Reduce the effective detection lag from 6.0h to 0.5h
- Provide a structured escalation workflow
- Handle missing and conflicting data without crashing
- Support role-based access for five clinical roles

**The system is not validated for clinical use.** Real-world validation would require prospective data collection, clinical expert review of thresholds, and regulatory compliance assessment.

from __future__ import annotations

import sys
import unittest
from pathlib import Path


REVIEW_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REVIEW_DIR))

from make_ab_template import build_rows  # noqa: E402
from summarize_ab_runs import DataError, summarize  # noqa: E402


def completed_rows():
    rows = build_rows()
    for row in rows:
        is_new = row["workflow_variant"] == "v1.1测试版"
        row.update(
            {
                "evidence_sufficient": "true",
                "duration_seconds": "45" if is_new else "100",
                "generation_input_tokens": "250" if is_new else "600",
                "validation_input_tokens": "200" if is_new else "400",
                "total_input_tokens": "450" if is_new else "1000",
                "question_count": "5",
                "first_round_decision": "PASS",
                "final_decision": "PASS",
                "rounds_used": "1",
                "hard_evidence_count": "3",
                "clinical_reasoning_count": "2",
                "json_parse_ok": "true",
                "answer_index_ok": "true",
                "answer_text_ok": "true",
                "locator_ok": "true",
                "hard_error_count": "0",
                "case_fact_invention_count": "0",
                "time_leakage_count": "0",
                "population_mismatch_count": "0",
                "treatment_stage_or_purpose_mismatch_count": "0",
                "infection_boundary_error_count": "0",
                "high_risk_extrapolation_count": "0",
                "duplicate_question_count": "0",
                "reviewed_question_count": "5",
                "direct_use_or_minor_count": "5",
                "reviewer_clinical_value_mean": "4.5",
                "advanced_recognition_count": "5",
                "failure_code": "",
            }
        )
    return rows


class AbSummaryTests(unittest.TestCase):
    def test_acceptance_summary(self):
        summary = summarize(completed_rows())
        self.assertTrue(summary["all_acceptance_pass"])
        self.assertEqual(summary["design"]["deidentified_cases"], 20)
        self.assertAlmostEqual(summary["comparison"]["median_duration_ratio_new_over_old"], 0.45)
        self.assertAlmostEqual(summary["comparison"]["median_input_token_ratio_new_over_old"], 0.45)

    def test_rejects_non_deidentified_case_id(self):
        rows = completed_rows()
        rows[0]["case_id"] = "患者 张三"
        with self.assertRaises(DataError):
            summarize(rows)

    def test_stop_rows_must_not_report_published_candidate_counts(self):
        rows = completed_rows()
        rows[0]["final_decision"] = "STOP_INSUFFICIENT"
        rows[0]["question_count"] = "0"
        rows[0]["hard_evidence_count"] = "0"
        rows[0]["clinical_reasoning_count"] = "0"
        rows[0]["treatment_stage_or_purpose_mismatch_count"] = "1"
        with self.assertRaises(DataError):
            summarize(rows)


if __name__ == "__main__":
    unittest.main()

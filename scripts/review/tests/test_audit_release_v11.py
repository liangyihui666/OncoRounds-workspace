from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path


REVIEW_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REVIEW_DIR))

from audit_release_v11 import audit_payload  # noqa: E402


FIXTURES = REVIEW_DIR / "fixtures"


class ReleaseV11AuditTests(unittest.TestCase):
    def load(self, name: str):
        return json.loads((FIXTURES / name).read_text(encoding="utf-8"))

    def test_valid_fixture_passes(self):
        result = audit_payload(self.load("release_v11_valid.json"))
        self.assertTrue(result.ok, result.errors)
        self.assertEqual(result.stats["question_count"], 5)
        self.assertGreaterEqual(result.stats["hard_evidence_count"], 2)
        self.assertGreaterEqual(result.stats["clinical_reasoning_count"], 2)

    def test_invalid_fixture_collects_all_contract_failures(self):
        result = audit_payload(self.load("release_v11_invalid.json"))
        self.assertFalse(result.ok)
        joined = "\n".join(result.errors)
        for expected in (
            "schema_version",
            "difficulty",
            "exactly 5",
            "distinct",
            "banned learner-facing phrase",
            "answer or option letters",
            "high-risk conclusion",
            "source_url",
        ):
            self.assertIn(expected, joined)

    def test_reasoning_cannot_carry_high_risk_dose(self):
        payload = self.load("release_v11_valid.json")
        payload["questions"][2]["answer_text"] = "泼尼松1 mg/kg治疗"
        payload["questions"][2]["options"][2] = "泼尼松1 mg/kg治疗"
        result = audit_payload(payload)
        self.assertTrue(any("high-risk conclusion: 剂量" in error for error in result.errors))

    def test_rejects_legacy_abcd_options_and_answer_letter(self):
        payload = self.load("release_v11_valid.json")
        payload["questions"][0]["options"] = {
            "A": "完善基线分期并确认治疗目标",
            "B": "直接按随访处理",
            "C": "仅重复病理染色",
            "D": "等待出现症状再评估",
        }
        payload["questions"][0]["answer"] = "A"
        result = audit_payload(payload)
        joined = "\n".join(result.errors)
        self.assertIn("options must be an array", joined)

    def test_reference_fields_except_split_index_must_be_strings(self):
        payload = self.load("release_v11_valid.json")
        payload["questions"][0]["guidelineRef"]["source_version"] = 2026
        result = audit_payload(payload)
        self.assertTrue(any("source_version must be a string" in error for error in result.errors))

    def test_same_locator_may_be_used_twice_only_across_distinct_decisions(self):
        payload = self.load("release_v11_valid.json")
        payload["questions"][4]["guidelineRef"]["doc_id"] = payload["questions"][0]["guidelineRef"]["doc_id"]
        payload["questions"][4]["guidelineRef"]["split_index"] = payload["questions"][0]["guidelineRef"]["split_index"]
        result = audit_payload(payload)
        self.assertTrue(result.ok, result.errors)

        bad = copy.deepcopy(payload)
        bad["questions"][4]["timepoint"] = bad["questions"][0]["timepoint"]
        result = audit_payload(bad)
        self.assertTrue(any("same timepoint" in error for error in result.errors))


if __name__ == "__main__":
    unittest.main()

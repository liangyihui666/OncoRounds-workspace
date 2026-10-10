#!/usr/bin/env python3
"""Generate a de-identified 20-case × 2-workflow × 3-run A/B log template."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


FIELDS = (
    "case_id",
    "workflow_variant",
    "run_index",
    "evidence_sufficient",
    "duration_seconds",
    "generation_input_tokens",
    "validation_input_tokens",
    "total_input_tokens",
    "question_count",
    "first_round_decision",
    "final_decision",
    "rounds_used",
    "hard_evidence_count",
    "clinical_reasoning_count",
    "json_parse_ok",
    "answer_index_ok",
    "answer_text_ok",
    "locator_ok",
    "hard_error_count",
    "case_fact_invention_count",
    "time_leakage_count",
    "population_mismatch_count",
    "treatment_stage_or_purpose_mismatch_count",
    "infection_boundary_error_count",
    "high_risk_extrapolation_count",
    "duplicate_question_count",
    "reviewed_question_count",
    "direct_use_or_minor_count",
    "reviewer_clinical_value_mean",
    "advanced_recognition_count",
    "failure_code",
)
VARIANTS = ("旧流程", "v1.1测试版")


def build_rows(case_count: int = 20, runs: int = 3) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for case_number in range(1, case_count + 1):
        case_id = f"CASE-{case_number:02d}"
        for variant in VARIANTS:
            for run_index in range(1, runs + 1):
                row = {field: "" for field in FIELDS}
                row.update(
                    {
                        "case_id": case_id,
                        "workflow_variant": variant,
                        "run_index": str(run_index),
                    }
                )
                rows.append(row)
    return rows


def write_template(path: Path, case_count: int = 20, runs: int = 3) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(build_rows(case_count, runs))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--case-count", type=int, default=20)
    parser.add_argument("--runs", type=int, default=3)
    args = parser.parse_args()
    if args.case_count < 1 or args.runs < 1:
        parser.error("case-count and runs must be positive")
    write_template(args.output, args.case_count, args.runs)
    print(f"WROTE {args.case_count * len(VARIANTS) * args.runs} de-identified run rows: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

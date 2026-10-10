#!/usr/bin/env python3
"""Summarize de-identified OncoRounds old-vs-v1.1 A/B run logs."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import statistics
import sys
from pathlib import Path
from typing import Any, Iterable

from make_ab_template import FIELDS, VARIANTS


DECISIONS = {"PASS", "REVISE", "STOP_INSUFFICIENT", "JSON_PARSE_ERROR", "NETWORK_ERROR", "REVISE_EXHAUSTED"}
BOOL_TRUE = {"1", "true", "yes", "y"}
BOOL_FALSE = {"0", "false", "no", "n"}
COUNT_FIELDS = (
    "hard_error_count",
    "case_fact_invention_count",
    "time_leakage_count",
    "population_mismatch_count",
    "treatment_stage_or_purpose_mismatch_count",
    "infection_boundary_error_count",
    "high_risk_extrapolation_count",
    "duplicate_question_count",
)


class DataError(ValueError):
    pass


def number(row: dict[str, str], field: str, *, integer: bool = False) -> float | int:
    value = row.get(field, "").strip()
    if not value:
        raise DataError(f"{row.get('case_id')}/{row.get('workflow_variant')}/run{row.get('run_index')}: missing {field}")
    try:
        parsed = int(value) if integer else float(value)
    except ValueError as exc:
        raise DataError(f"invalid {field}={value!r}") from exc
    if parsed < 0 or not math.isfinite(float(parsed)):
        raise DataError(f"{field} must be a finite non-negative number")
    return parsed


def boolean(row: dict[str, str], field: str) -> bool:
    value = row.get(field, "").strip().lower()
    if value in BOOL_TRUE:
        return True
    if value in BOOL_FALSE:
        return False
    raise DataError(f"invalid boolean {field}={row.get(field)!r}")


def percentile(values: Iterable[float], fraction: float) -> float | None:
    ordered = sorted(float(value) for value in values)
    if not ordered:
        return None
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        actual = tuple(reader.fieldnames or ())
        if actual != FIELDS:
            missing = sorted(set(FIELDS) - set(actual))
            extra = sorted(set(actual) - set(FIELDS))
            raise DataError(f"CSV header mismatch; missing={missing}, extra={extra}")
        rows = list(reader)
    if not rows:
        raise DataError("CSV has no run rows")
    return rows


def validate_design(rows: list[dict[str, str]]) -> None:
    coverage: dict[tuple[str, str], set[int]] = {}
    for row in rows:
        case_id = row["case_id"].strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", case_id):
            raise DataError("case_id must be a de-identified ASCII key (letters, digits, '_' or '-')")
        variant = row["workflow_variant"].strip()
        if variant not in VARIANTS:
            raise DataError(f"unsupported workflow_variant={variant!r}")
        run_index = int(number(row, "run_index", integer=True))
        coverage.setdefault((case_id, variant), set()).add(run_index)
    cases = {case for case, _ in coverage}
    if len(cases) < 20:
        raise DataError(f"at least 20 de-identified cases are required; found {len(cases)}")
    for case_id in cases:
        for variant in VARIANTS:
            if coverage.get((case_id, variant)) != {1, 2, 3}:
                raise DataError(f"{case_id}/{variant} must contain exactly run_index 1,2,3")


def normalize_row(row: dict[str, str]) -> dict[str, Any]:
    first = row["first_round_decision"].strip()
    final = row["final_decision"].strip()
    if first not in DECISIONS or final not in DECISIONS:
        raise DataError(f"invalid decision for {row['case_id']}/{row['workflow_variant']}/run{row['run_index']}")
    failure_code = row["failure_code"].strip()
    if failure_code and not re.fullmatch(r"[A-Z0-9_:-]{1,64}", failure_code):
        raise DataError("failure_code must be a short code, not free text or raw case/questionnaire data")
    generation_tokens = int(number(row, "generation_input_tokens", integer=True))
    validation_tokens = int(number(row, "validation_input_tokens", integer=True))
    total_tokens = int(number(row, "total_input_tokens", integer=True))
    if total_tokens != generation_tokens + validation_tokens:
        raise DataError("total_input_tokens must equal generation_input_tokens + validation_input_tokens")

    normalized: dict[str, Any] = {
        "case_id": row["case_id"].strip(),
        "variant": row["workflow_variant"].strip(),
        "run_index": int(number(row, "run_index", integer=True)),
        "evidence_sufficient": boolean(row, "evidence_sufficient"),
        "duration": float(number(row, "duration_seconds")),
        "tokens": total_tokens,
        "question_count": int(number(row, "question_count", integer=True)),
        "first_pass": first == "PASS",
        "final_pass": final == "PASS",
        "final_decision": final,
        "rounds": int(number(row, "rounds_used", integer=True)),
        "hard_evidence": int(number(row, "hard_evidence_count", integer=True)),
        "reasoning": int(number(row, "clinical_reasoning_count", integer=True)),
        "mechanical_ok": all(boolean(row, field) for field in ("json_parse_ok", "answer_index_ok", "answer_text_ok", "locator_ok")),
        "reviewed": int(number(row, "reviewed_question_count", integer=True)),
        "direct_use": int(number(row, "direct_use_or_minor_count", integer=True)),
        "clinical_value": float(number(row, "reviewer_clinical_value_mean")),
        "advanced": int(number(row, "advanced_recognition_count", integer=True)),
    }
    for field in COUNT_FIELDS:
        normalized[field] = int(number(row, field, integer=True))
    if final == "STOP_INSUFFICIENT":
        stop_nonzero = [
            field
            for field in (
                "question_count",
                "hard_evidence",
                "reasoning",
                *COUNT_FIELDS,
            )
            if normalized[field] != 0
        ]
        if stop_nonzero:
            raise DataError(f"STOP_INSUFFICIENT rows must record zero final-candidate counts: {stop_nonzero}")
    if normalized["direct_use"] > normalized["reviewed"] or normalized["advanced"] > normalized["reviewed"]:
        raise DataError("review counts cannot exceed reviewed_question_count")
    if not 0 <= normalized["clinical_value"] <= 5:
        raise DataError("reviewer_clinical_value_mean must be between 0 and 5")
    return normalized


def aggregate(rows: list[dict[str, Any]], variant: str) -> dict[str, Any]:
    selected = [row for row in rows if row["variant"] == variant]
    sufficient = [row for row in selected if row["evidence_sufficient"]]
    published = [row for row in selected if row["final_pass"]]
    reviewed = sum(row["reviewed"] for row in selected)
    questions = sum(row["question_count"] for row in selected)
    weighted_value = sum(row["clinical_value"] * row["reviewed"] for row in selected)
    hard_medical_errors = sum(
        row[field]
        for row in selected
        for field in (
            "case_fact_invention_count",
            "time_leakage_count",
            "population_mismatch_count",
            "treatment_stage_or_purpose_mismatch_count",
            "infection_boundary_error_count",
            "high_risk_extrapolation_count",
        )
    )
    return {
        "runs": len(selected),
        "cases": len({row["case_id"] for row in selected}),
        "median_duration_seconds": statistics.median(row["duration"] for row in selected),
        "p90_duration_seconds": percentile((row["duration"] for row in selected), 0.9),
        "median_input_tokens": statistics.median(row["tokens"] for row in selected),
        "five_question_rate_evidence_sufficient": (
            sum(row["question_count"] == 5 for row in sufficient) / len(sufficient) if sufficient else None
        ),
        "first_round_pass_rate": sum(row["first_pass"] for row in selected) / len(selected),
        "within_two_round_pass_rate": sum(row["final_pass"] and row["rounds"] <= 2 for row in selected) / len(selected),
        "v11_quota_rate_final_pass": (
            sum(row["hard_evidence"] >= 2 and row["reasoning"] >= 2 for row in published) / len(published)
            if published else None
        ),
        "mechanical_integrity_rate": sum(row["mechanical_ok"] for row in selected) / len(selected),
        "hard_error_count": sum(row["hard_error_count"] for row in selected),
        "hard_medical_error_count": hard_medical_errors,
        "direct_use_or_minor_rate": sum(row["direct_use"] for row in selected) / reviewed if reviewed else None,
        "clinical_value_mean": weighted_value / reviewed if reviewed else None,
        "advanced_recognition_rate": sum(row["advanced"] for row in selected) / reviewed if reviewed else None,
        "duplicate_question_rate": sum(row["duplicate_question_count"] for row in selected) / questions if questions else None,
    }


def ratio(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator


def summarize(raw_rows: list[dict[str, str]]) -> dict[str, Any]:
    validate_design(raw_rows)
    rows = [normalize_row(row) for row in raw_rows]
    old = aggregate(rows, "旧流程")
    new = aggregate(rows, "v1.1测试版")
    comparison = {
        "median_duration_ratio_new_over_old": ratio(new["median_duration_seconds"], old["median_duration_seconds"]),
        "p90_duration_ratio_new_over_old": ratio(new["p90_duration_seconds"], old["p90_duration_seconds"]),
        "median_input_token_ratio_new_over_old": ratio(new["median_input_tokens"], old["median_input_tokens"]),
    }
    acceptance = {
        "median_duration_le_50pct": comparison["median_duration_ratio_new_over_old"] is not None and comparison["median_duration_ratio_new_over_old"] <= 0.5,
        "p90_duration_le_60pct": comparison["p90_duration_ratio_new_over_old"] is not None and comparison["p90_duration_ratio_new_over_old"] <= 0.6,
        "input_tokens_le_50pct": comparison["median_input_token_ratio_new_over_old"] is not None and comparison["median_input_token_ratio_new_over_old"] <= 0.5,
        "stable_five_questions_ge_90pct": (new["five_question_rate_evidence_sufficient"] or 0) >= 0.9,
        "first_round_pass_ge_70pct": new["first_round_pass_rate"] >= 0.7,
        "within_two_round_pass_ge_90pct": new["within_two_round_pass_rate"] >= 0.9,
        "mechanical_integrity_100pct": new["mechanical_integrity_rate"] == 1.0,
        "all_final_pass_meet_v11_quota": new["v11_quota_rate_final_pass"] == 1.0,
        "hard_medical_errors_zero": new["hard_medical_error_count"] == 0,
        "direct_use_or_minor_ge_80pct": (new["direct_use_or_minor_rate"] or 0) >= 0.8,
        "clinical_value_ge_4": (new["clinical_value_mean"] or 0) >= 4.0,
        "advanced_recognition_ge_80pct": (new["advanced_recognition_rate"] or 0) >= 0.8,
        "duplicate_rate_lt_5pct": (new["duplicate_question_rate"] if new["duplicate_question_rate"] is not None else 1) < 0.05,
    }
    return {
        "schema_version": "1.1-ab-summary",
        "contains_raw_questionnaire_pii": False,
        "design": {"deidentified_cases": len({row["case_id"] for row in rows}), "runs_per_case_per_variant": 3},
        "旧流程": old,
        "v1.1测试版": new,
        "comparison": comparison,
        "acceptance": acceptance,
        "all_acceptance_pass": all(acceptance.values()),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_csv", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        summary = summarize(read_rows(args.input_csv))
    except (OSError, DataError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    text = json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    print(text, end="")
    return 0 if summary["all_acceptance_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Fail-closed structural audit for OncoRounds developer release JSON v1.1.

This audit is necessary but not sufficient for publication. It deliberately does
not attempt to replace the independent medical review of case chronology,
population applicability, or direct snippet support.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


ROOT_FIELDS = {
    "schema_version",
    "case_id",
    "cancer_type",
    "generation_status",
    "case_summary",
    "difficulty",
    "question_count",
    "questions",
    "missing_information",
    "risk_message",
}
QUESTION_FIELDS = {
    "id",
    "type",
    "phase",
    "timepoint",
    "question",
    "options",
    "answer",
    "answer_text",
    "explain",
    "keyPoint",
    "guidelineRef",
}
REFERENCE_FIELDS = {
    "evidence_type",
    "doc_id",
    "split_index",
    "type",
    "authority",
    "source_title",
    "source_version",
    "source_section",
    "source_url",
    "evidence_summary",
}
OPTION_LETTERS = ("A", "B", "C", "D")
ABILITY_TYPES = {
    "诊断与分期",
    "分子诊断",
    "治疗决策",
    "疗效复评与局部治疗",
    "耐药与后线管理",
    "不良反应管理",
}
EVIDENCE_TYPES = {"指南", "临床研究", "病例+临床推理"}
HARD_EVIDENCE_TYPES = {"指南", "临床研究"}

# These phrases are unsafe learner-facing shortcuts or contradict the active
# infection-safety contract. They are blocked regardless of case metadata.
BANNED_PHRASES = (
    "以上都是",
    "以上都不是",
    "感染已排除",
    "无感染证据",
    "无阳性细菌学结果",
    "未提示感染直接证据",
    "抗感染无效，因此不是感染",
    "抗感染无效所以不是感染",
)
LETTER_REFERENCE_PATTERNS = (
    re.compile(r"正确答案(?:为|是)?\s*[ABCD](?![A-Za-z])", re.IGNORECASE),
    re.compile(r"选项\s*[ABCD](?![A-Za-z])", re.IGNORECASE),
    re.compile(r"(?<![A-Za-z])[ABCD]\s*项", re.IGNORECASE),
)
HTML_RE = re.compile(r"<\/?[A-Za-z][^>]*>")

# A 病例+临床推理 question may use a reliable source for a principle, but the
# active v1.1 contract does not allow this evidence class to carry these
# high-risk recommendations. Inspect the correct conclusion, not distractors.
HIGH_RISK_REASONING_PATTERNS = (
    ("剂量", re.compile(r"(?:\d+(?:\.\d+)?\s*(?:mg|g|μg|ug)(?:/\s*(?:kg|m2|m²))?\b|剂量)", re.IGNORECASE)),
    ("疗程或周期", re.compile(r"(?:疗程|每\s*\d+\s*周|共\s*\d+\s*周期|\d+\s*个?周期)")),
    ("标准治疗", re.compile(r"(?:标准治疗|标准方案|金标准|一线标准)")),
    ("强制停药", re.compile(r"(?:必须|永久|立即|强制)\s*(?:停药|停用|终止)")),
    ("再挑战", re.compile(r"(?:再挑战|重新启用|重启|恢复使用)")),
    ("高级别毒性", re.compile(r"(?:≥\s*3\s*级|3\s*级及以上|G\s*[34]|grade\s*[34])", re.IGNORECASE)),
    ("手术适应证", re.compile(r"(?:手术适应证|手术指征|具备手术条件|应行手术|必须手术)")),
)


@dataclass
class AuditResult:
    errors: list[str]
    warnings: list[str]
    stats: dict[str, Any]

    @property
    def ok(self) -> bool:
        return not self.errors


def _text(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _nonempty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _visible_text(question: dict[str, Any]) -> str:
    options = question.get("options")
    option_text = " ".join(options) if isinstance(options, list) else ""
    ref = question.get("guidelineRef")
    evidence_summary = ref.get("evidence_summary", "") if isinstance(ref, dict) else ""
    return " ".join(
        _text(question.get(field))
        for field in ("question", "explain", "keyPoint")
    ) + " " + option_text + " " + _text(evidence_summary)


def _normalized_concept(value: Any) -> str:
    return re.sub(r"[\W_]+", "", _text(value).lower(), flags=re.UNICODE)


def _safe_public_url(value: Any) -> bool:
    if value == "":
        return True
    if not isinstance(value, str):
        return False
    try:
        parsed = urlsplit(value.strip())
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    host = (parsed.hostname or "").lower()
    if host in {"localhost", "0.0.0.0"} or host.startswith("127."):
        return False
    if host.startswith(("10.", "192.168.", "169.254.")):
        return False
    if re.match(r"172\.(?:1[6-9]|2\d|3[01])\.", host):
        return False
    return not re.search(
        r"(?:^|[?&])(?:token|access_token|api_key|apikey|auth|authorization|credential|signature|sig)=",
        parsed.query,
        re.IGNORECASE,
    )


def _field_mismatch(actual: set[str], expected: set[str]) -> str:
    return f"missing={sorted(expected - actual)}, extra={sorted(actual - expected)}"


def audit_payload(payload: Any) -> AuditResult:
    errors: list[str] = []
    warnings: list[str] = [
        "结构审计不能替代独立医学审核：仍需人工核对病例事实、时序、适用人群及单条 snippet 的直接支持。"
    ]
    stats: dict[str, Any] = {
        "question_count": 0,
        "hard_evidence_count": 0,
        "clinical_reasoning_count": 0,
        "evidence_type_counts": {},
    }

    if not isinstance(payload, dict):
        return AuditResult(["root must be a JSON object"], warnings, stats)

    root_keys = set(payload)
    if root_keys != ROOT_FIELDS:
        errors.append(f"root fields mismatch; {_field_mismatch(root_keys, ROOT_FIELDS)}")
    if payload.get("schema_version") != "1.1":
        errors.append("schema_version must be the string '1.1'")
    if payload.get("generation_status") != "success":
        errors.append("generation_status must be 'success'; non-PASS artifacts are not publishable")
    if payload.get("difficulty") != "进阶":
        errors.append("difficulty must be '进阶'")
    if payload.get("question_count") != 5:
        errors.append("question_count must be the integer 5")
    if payload.get("missing_information") != []:
        errors.append("successful v1.1 publication requires missing_information=[]")
    if payload.get("risk_message") != "":
        errors.append("successful v1.1 publication requires risk_message='' ")
    for field in ("case_id", "cancer_type", "case_summary"):
        if not _nonempty_string(payload.get(field)):
            errors.append(f"{field} must be a non-empty string")

    questions = payload.get("questions")
    if not isinstance(questions, list):
        errors.append("questions must be an array")
        return AuditResult(errors, warnings, stats)
    stats["question_count"] = len(questions)
    if len(questions) != 5:
        errors.append(f"successful v1.1 publication requires exactly 5 questions; found {len(questions)}")

    evidence_counts: Counter[str] = Counter()
    locators: list[tuple[str, str, str, str, str]] = []
    concepts: list[tuple[str, str]] = []

    for index, question in enumerate(questions, 1):
        qid = f"Q{index}"
        if not isinstance(question, dict):
            errors.append(f"{qid}: question must be an object")
            continue
        actual_id = question.get("id")
        label = actual_id if isinstance(actual_id, str) and actual_id else qid
        if actual_id != qid:
            errors.append(f"question {index}: id must be {qid}; found {actual_id!r}")
        question_keys = set(question)
        if question_keys != QUESTION_FIELDS:
            errors.append(f"{label}: question fields mismatch; {_field_mismatch(question_keys, QUESTION_FIELDS)}")

        for field in ("type", "phase", "timepoint", "question", "explain", "keyPoint"):
            if not _nonempty_string(question.get(field)):
                errors.append(f"{label}: {field} must be a non-empty string")
        if question.get("type") not in ABILITY_TYPES:
            errors.append(f"{label}: type is outside the six UI ability dimensions")

        length_limits = {"question": 160, "explain": 160, "keyPoint": 70}
        for field, limit in length_limits.items():
            value = question.get(field)
            if isinstance(value, str) and len(value.strip()) > limit:
                errors.append(f"{label}: {field} exceeds {limit} characters")

        options = question.get("options")
        answer = question.get("answer")
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{label}: options must be an array of exactly four strings")
        else:
            option_values = options
            if any(not _nonempty_string(value) for value in option_values):
                errors.append(f"{label}: all four options must be non-empty strings")
            if any(isinstance(value, str) and len(value.strip()) > 60 for value in option_values):
                errors.append(f"{label}: each option must be at most 60 characters")
            normalized_options = [value.strip() if isinstance(value, str) else value for value in option_values]
            if len(set(normalized_options)) != 4:
                errors.append(f"{label}: options must be distinct after trimming")
            if not isinstance(answer, int) or isinstance(answer, bool) or answer < 0 or answer > 3:
                errors.append(f"{label}: answer must be a 0-based integer from 0 to 3")
            elif question.get("answer_text") != options[answer]:
                errors.append(f"{label}: answer_text must exactly equal options[answer]")

        explanation = " ".join((_text(question.get("explain")), _text(question.get("keyPoint"))))
        for pattern in LETTER_REFERENCE_PATTERNS:
            if pattern.search(explanation):
                errors.append(f"{label}: explain/keyPoint must not refer to answer or option letters")
                break

        visible = _visible_text(question)
        for phrase in BANNED_PHRASES:
            if phrase in visible:
                errors.append(f"{label}: banned learner-facing phrase: {phrase}")
        if HTML_RE.search(visible) or "\ufffd" in visible:
            errors.append(f"{label}: learner-facing text contains HTML or replacement-character noise")

        ref = question.get("guidelineRef")
        if not isinstance(ref, dict):
            errors.append(f"{label}: guidelineRef must be an object")
            continue
        ref_keys = set(ref)
        if ref_keys != REFERENCE_FIELDS:
            errors.append(f"{label}: guidelineRef fields mismatch; {_field_mismatch(ref_keys, REFERENCE_FIELDS)}")

        evidence_type = ref.get("evidence_type")
        for field in REFERENCE_FIELDS - {"split_index"}:
            if not isinstance(ref.get(field), str):
                errors.append(f"{label}: guidelineRef.{field} must be a string")
        if evidence_type not in EVIDENCE_TYPES:
            errors.append(f"{label}: evidence_type must be one of {sorted(EVIDENCE_TYPES)}")
        else:
            evidence_counts[evidence_type] += 1

        for field in ("doc_id", "type", "source_title", "evidence_summary"):
            if not _nonempty_string(ref.get(field)):
                errors.append(f"{label}: guidelineRef.{field} must be non-empty")
        split_index = ref.get("split_index")
        if not isinstance(split_index, int) or isinstance(split_index, bool) or split_index < 0:
            errors.append(f"{label}: guidelineRef.split_index must be a non-negative integer")
        if evidence_type == "指南":
            if ref.get("type") != "guideline":
                errors.append(f"{label}: 指南 evidence requires guidelineRef.type='guideline'")
            if not _nonempty_string(ref.get("authority")):
                errors.append(f"{label}: 指南 evidence requires non-empty authority")
        if evidence_type == "临床研究" and ref.get("type") not in {
            "clinical_study",
            "clinical_trial",
            "meeting",
            "journal",
            "study",
            "trial",
        }:
            errors.append(f"{label}: 临床研究 evidence has an unsupported source type")
        if not _safe_public_url(ref.get("source_url")):
            errors.append(f"{label}: source_url must be empty or a safe public http(s) URL")

        if evidence_type == "病例+临床推理":
            correct_conclusion = " ".join(
                (
                    _text(question.get("answer_text")),
                    _text(question.get("explain")),
                    _text(question.get("keyPoint")),
                    _text(ref.get("evidence_summary")),
                )
            )
            for risk_name, pattern in HIGH_RISK_REASONING_PATTERNS:
                if pattern.search(correct_conclusion):
                    errors.append(f"{label}: 病例+临床推理 cannot carry high-risk conclusion: {risk_name}")

        doc_id = ref.get("doc_id")
        if _nonempty_string(doc_id) and isinstance(split_index, int) and not isinstance(split_index, bool):
            locators.append(
                (
                    doc_id,
                    str(split_index),
                    _text(question.get("timepoint")),
                    _normalized_concept(question.get("question")),
                    _normalized_concept(question.get("answer_text")),
                )
            )
        concepts.append(
            (_normalized_concept(question.get("question")), _normalized_concept(question.get("answer_text")))
        )

    locator_counts = Counter((doc, split) for doc, split, *_ in locators)
    for locator, count in locator_counts.items():
        if count > 2:
            errors.append(f"primary locator {locator[0]} / {locator[1]} is used {count} times; maximum is 2")
        if count == 2:
            uses = [item for item in locators if item[:2] == locator]
            if uses[0][2] == uses[1][2]:
                errors.append(f"primary locator {locator[0]} / {locator[1]} reused at the same timepoint")
            if uses[0][4] == uses[1][4]:
                errors.append(f"primary locator {locator[0]} / {locator[1]} reused with the same answer_text")
            # keyPoint is part of the tested decision boundary in v1.1.
            paired_questions = [
                question
                for question in questions
                if isinstance(question, dict)
                and isinstance(question.get("guidelineRef"), dict)
                and question["guidelineRef"].get("doc_id") == locator[0]
                and str(question["guidelineRef"].get("split_index")) == locator[1]
            ]
            if len(paired_questions) == 2 and paired_questions[0].get("keyPoint") == paired_questions[1].get("keyPoint"):
                errors.append(f"primary locator {locator[0]} / {locator[1]} reused with the same keyPoint")

    for concept, count in Counter(concepts).items():
        if concept != ("", "") and count > 1:
            errors.append("duplicate question concept and correct conclusion detected")

    hard_count = sum(evidence_counts[label] for label in HARD_EVIDENCE_TYPES)
    reasoning_count = evidence_counts["病例+临床推理"]
    stats.update(
        {
            "hard_evidence_count": hard_count,
            "clinical_reasoning_count": reasoning_count,
            "evidence_type_counts": dict(sorted(evidence_counts.items())),
        }
    )
    if hard_count < 2:
        errors.append(f"hard-evidence questions {hard_count} < required 2")
    if reasoning_count < 2:
        errors.append(f"病例+临床推理 questions {reasoning_count} < required 2")

    return AuditResult(errors, warnings, stats)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("release_json", type=Path)
    parser.add_argument("--json-report", type=Path, help="Optional machine-readable audit report")
    args = parser.parse_args(argv)
    try:
        payload = load_json(args.release_json)
        result = audit_payload(payload)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    report = {"ok": result.ok, **asdict(result)}
    if args.json_report:
        args.json_report.parent.mkdir(parents=True, exist_ok=True)
        args.json_report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for warning in result.warnings:
        print(f"WARNING: {warning}")
    for error in result.errors:
        print(f"ERROR: {error}")
    print(
        f"AUDIT {'PASS' if result.ok else 'FAIL'}: "
        f"{len(result.errors)} error(s), {len(result.warnings)} warning(s); "
        f"hard={result.stats['hard_evidence_count']}, "
        f"病例+临床推理={result.stats['clinical_reasoning_count']}"
    )
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

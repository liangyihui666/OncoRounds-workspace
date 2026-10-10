#!/usr/bin/env python3
"""Audit FastGPT medical-question JSON structure and evidence locators."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


GUIDELINE_LABELS = ("指南", "共识", "guideline", "consensus")
STUDY_LABELS = ("临床研究", "临床试验", "clinical_study", "clinical_trial", "study", "trial")
CASE_LABELS = ("病例事实", "case_fact", "case fact")
INFECTION_PHRASES = (
    "感染已排除",
    "无感染证据",
    "无阳性细菌学结果",
    "未提示感染直接证据",
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def maybe_json(value: Any) -> Any:
    if isinstance(value, str):
        text = value.strip()
        if text.startswith(("{", "[")):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return value
    return value


def extract_payload(root: Any) -> dict[str, Any]:
    """Return the latest parseable final-question object from common FastGPT wrappers."""
    root = maybe_json(root)
    if isinstance(root, dict) and "generation_status" in root:
        return root
    if isinstance(root, dict):
        if "final_questions_json" in root:
            candidate = maybe_json(root["final_questions_json"])
            if isinstance(candidate, dict):
                return candidate
        custom = root.get("customOutputs")
        if isinstance(custom, dict) and "final_questions_json" in custom:
            candidate = maybe_json(custom["final_questions_json"])
            if isinstance(candidate, dict):
                return candidate
    if isinstance(root, list):
        for item in reversed(root):
            try:
                return extract_payload(item)
            except ValueError:
                pass
    raise ValueError("No parseable final_questions_json payload found")


def walk(value: Any) -> Iterable[Any]:
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def evidence_index(files: list[Path]) -> dict[tuple[str, str], dict[str, Any]]:
    result: dict[tuple[str, str], dict[str, Any]] = {}
    for path in files:
        root = load_json(path)
        for item in walk(root):
            if not isinstance(item, dict):
                continue
            doc = item.get("docId", item.get("doc_id"))
            split = item.get("splitIndex", item.get("split_index"))
            if doc not in (None, "") and split not in (None, ""):
                result[(str(doc), str(split))] = item
    return result


def label_kind(label: Any) -> str:
    text = str(label or "").strip().lower()
    if any(x.lower() in text for x in GUIDELINE_LABELS):
        return "guideline"
    if any(x.lower() in text for x in STUDY_LABELS):
        return "study"
    if any(x.lower() in text for x in CASE_LABELS):
        return "case"
    return "other"


def all_text(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(all_text(v) for v in value.values())
    if isinstance(value, list):
        return " ".join(all_text(v) for v in value)
    return str(value or "")


def audit(
    payload: dict[str, Any],
    evidence: dict[tuple[str, str], dict[str, Any]],
    expected_count: int,
    min_guidelines: int,
    min_backed: int,
    max_case: int,
    answer_base: int,
    positive_pathogen: bool,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    status = str(payload.get("generation_status", "")).lower()
    questions = payload.get("questions", [])
    if status != "success":
        errors.append(f"generation_status is {status or '<missing>'}, not success")
    if not isinstance(questions, list):
        return errors + ["questions is not an array"], warnings
    if len(questions) != expected_count:
        errors.append(f"expected {expected_count} questions, found {len(questions)}")
    declared = payload.get("question_count")
    if declared != len(questions):
        errors.append(f"question_count={declared!r} but questions length={len(questions)}")

    ids: list[str] = []
    kinds: Counter[str] = Counter()
    locators: list[tuple[str, str]] = []
    for pos, question in enumerate(questions, 1):
        if not isinstance(question, dict):
            errors.append(f"Q{pos}: question is not an object")
            continue
        qid = str(question.get("id") or f"Q{pos}")
        ids.append(qid)
        options = question.get("options")
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{qid}: options must contain exactly 4 items")
        answer = question.get("answer")
        expected_indexes = range(answer_base, answer_base + 4)
        if not isinstance(answer, int) or answer not in expected_indexes:
            errors.append(f"{qid}: answer must be an integer in {list(expected_indexes)}")
        elif isinstance(options, list) and len(options) == 4:
            option_index = answer - answer_base
            if question.get("answer_text") != options[option_index]:
                errors.append(f"{qid}: answer_text does not equal the indexed option")

        ref = question.get("guidelineRef") or question.get("guideline_ref") or {}
        if not isinstance(ref, dict):
            ref = {}
            errors.append(f"{qid}: guidelineRef is not an object")
        evidence_type = ref.get("evidence_type", question.get("evidence_type"))
        kind = label_kind(evidence_type)
        kinds[kind] += 1

        doc = ref.get("doc_id", ref.get("docId"))
        split = ref.get("split_index", ref.get("splitIndex"))
        if kind in ("guideline", "study"):
            required = ("doc_id", "split_index", "type")
            for field in required:
                aliases = {"doc_id": doc, "split_index": split, "type": ref.get("type")}
                if aliases[field] in (None, ""):
                    errors.append(f"{qid}: evidence-backed question missing {field}")
            if kind == "guideline" and not str(ref.get("authority") or "").strip():
                errors.append(f"{qid}: guideline evidence missing authority")
            if doc not in (None, "") and split not in (None, ""):
                key = (str(doc), str(split))
                locators.append(key)
                if evidence:
                    record = evidence.get(key)
                    if record is None:
                        errors.append(f"{qid}: locator {key[0]} / {key[1]} absent from retrieval JSON")
                    else:
                        for ref_field, record_field in (("type", "type"), ("authority", "authority")):
                            expected = str(record.get(record_field) or "")
                            actual = str(ref.get(ref_field) or "")
                            if expected != actual:
                                errors.append(f"{qid}: {ref_field}={actual!r}, retrieval record has {expected!r}")
                        link = str(record.get("link") or "")
                        url = str(ref.get("source_url") or "")
                        if link != url:
                            errors.append(f"{qid}: source_url does not exactly match retrieval link")

        text = all_text(question)
        found = [phrase for phrase in INFECTION_PHRASES if phrase in text]
        if found:
            message = f"{qid}: risky infection wording: {', '.join(found)}"
            (errors if positive_pathogen else warnings).append(message)

    duplicates = [key for key, count in Counter(locators).items() if count > 1]
    for doc, split in duplicates:
        errors.append(f"duplicate primary evidence locator: {doc} / {split}")
    duplicate_ids = [qid for qid, count in Counter(ids).items() if count > 1]
    for qid in duplicate_ids:
        errors.append(f"duplicate question id: {qid}")

    if kinds["guideline"] < min_guidelines:
        errors.append(f"guideline questions {kinds['guideline']} < required {min_guidelines}")
    if kinds["guideline"] + kinds["study"] < min_backed:
        errors.append(
            f"guideline+study questions {kinds['guideline'] + kinds['study']} < required {min_backed}"
        )
    if kinds["case"] > max_case:
        errors.append(f"case-fact questions {kinds['case']} > allowed {max_case}")
    if kinds["other"]:
        warnings.append(f"{kinds['other']} question(s) have an unrecognized evidence_type")
    return errors, warnings


def self_test() -> int:
    record = {
        "result": [{"docId": "g1", "splitIndex": 2, "type": "guideline", "authority": "ORG", "link": ""}]
    }
    questions = []
    for i in range(5):
        kind = "指南" if i < 3 else "临床研究"
        ref = {"evidence_type": kind}
        if i < 3:
            ref.update({"doc_id": f"g{i+1}", "split_index": 2, "type": "guideline", "authority": "ORG", "source_url": ""})
        else:
            ref.update({"doc_id": f"s{i-2}", "split_index": 1, "type": "clinical_study", "authority": "", "source_url": ""})
        questions.append({"id": f"Q{i+1}", "options": ["A", "B", "C", "D"], "answer": 1, "answer_text": "B", "guidelineRef": ref})
    payload = {"generation_status": "success", "question_count": 5, "questions": questions}
    index = {
        ("g1", "2"): record["result"][0],
        ("g2", "2"): {**record["result"][0], "docId": "g2"},
        ("g3", "2"): {**record["result"][0], "docId": "g3"},
        ("s1", "1"): {"docId": "s1", "splitIndex": 1, "type": "clinical_study", "authority": "", "link": ""},
        ("s2", "1"): {"docId": "s2", "splitIndex": 1, "type": "clinical_study", "authority": "", "link": ""},
    }
    errors, _ = audit(payload, index, 5, 3, 5, 0, 0, False)
    if errors:
        print("SELF-TEST FAILED", errors, file=sys.stderr)
        return 1
    payload["questions"][4]["options"] = ["A", "B"]
    errors, _ = audit(payload, index, 5, 3, 5, 0, 0, False)
    if not any("exactly 4" in e for e in errors):
        print("SELF-TEST FAILED: invalid options were not detected", file=sys.stderr)
        return 1
    print("SELF-TEST PASS")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("questions", nargs="?", type=Path, help="Question or loop JSON file")
    parser.add_argument("--evidence", action="append", default=[], type=Path, help="Retrieval JSON; repeat as needed")
    parser.add_argument("--expected-count", type=int, default=5)
    parser.add_argument("--min-guidelines", type=int, default=3)
    parser.add_argument("--min-backed", type=int, default=5)
    parser.add_argument("--max-case", type=int, default=0)
    parser.add_argument("--answer-base", type=int, choices=(0, 1), default=0)
    parser.add_argument("--positive-pathogen", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.questions is None:
        parser.error("questions JSON file is required unless --self-test is used")
    try:
        payload = extract_payload(load_json(args.questions))
        index = evidence_index(args.evidence)
        errors, warnings = audit(
            payload,
            index,
            args.expected_count,
            args.min_guidelines,
            args.min_backed,
            args.max_case,
            args.answer_base,
            args.positive_pathogen,
        )
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")
    if errors:
        print(f"AUDIT FAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"AUDIT PASS: 0 errors, {len(warnings)} warning(s)")
    print("Manual semantic review of case facts and snippet support is still required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

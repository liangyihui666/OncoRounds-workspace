# Developer-facing question JSON contract

## When to use it

Use this schema for every file handed to the OncoRounds UI/development team. It is the current publication format and is distinct from FastGPT's internal loop format.

Only convert the last independently audited `PASS` result. Never hand off the complete iteration array, `customOutputs`, a stringified `final_questions_json`, Markdown fences, or explanatory prose.

## Root object

Use exactly these root fields:

```json
{
  "schema_version": "1.0",
  "case_id": "stable-ui-case-id",
  "cancer_type": "病种简称",
  "generation_status": "success",
  "difficulty": "进阶",
  "question_count": 5,
  "questions": [],
  "missing_information": []
}
```

Requirements:

- `schema_version` is the string `1.0` until the development contract is deliberately versioned;
- `case_id` is the stable ID agreed with the UI, not `TEST-001` unless that is the intended published ID;
- `cancer_type` is the concise UI label such as `胃癌`, `食管癌`, or `肺癌`;
- only a true final `PASS` may use `generation_status: "success"`;
- successful publication contains exactly five questions and an empty `missing_information` array;
- omit internal-only `case_summary`, `risk_message`, validation fields, and loop metadata from this handoff schema.

## Question object

Each question uses exactly these fields:

```json
{
  "id": "Q1",
  "type": "治疗决策",
  "phase": "初始治疗",
  "timepoint": "初诊时",
  "question": "题干",
  "options": {
    "A": "选项A",
    "B": "选项B",
    "C": "选项C",
    "D": "选项D"
  },
  "answer": "A",
  "answer_text": "选项A",
  "explain": "解析",
  "keyPoint": "临床要点",
  "guidelineRef": {}
}
```

Requirements:

- IDs are `Q1` through `Q5` in clinical chronological order;
- `type` is the UI ability-dimension field and must be exactly one of `诊断与分期`, `分子诊断`, `治疗决策`, `疗效复评与局部治疗`, `耐药与后线管理`, or `不良反应管理`;
- `options` is an object with exactly the four keys `A`, `B`, `C`, and `D`, never an array;
- `answer` is the uppercase letter `A`, `B`, `C`, or `D`, never a numeric index;
- `answer_text` exactly equals `options[answer]`;
- preserve the already-audited medical wording; conversion changes representation only.

## Evidence object

`guidelineRef` contains exactly these ten fields:

```json
{
  "evidence_type": "指南",
  "doc_id": "",
  "split_index": 0,
  "type": "guideline",
  "authority": "",
  "source_title": "",
  "source_version": "",
  "source_section": "",
  "source_url": "",
  "evidence_summary": ""
}
```

Copy values from the final audited internal question without inventing or enriching metadata. Keep `source_url` or `source_section` as an empty string when unavailable. Do not expose local paths or internal attachment locations.

## Deterministic conversion

For each internal question:

1. map array positions `0,1,2,3` to `A,B,C,D`;
2. map numeric answer indexes `0,1,2,3` to `A,B,C,D`;
3. verify the mapped `answer_text` before writing;
4. preserve every other question and evidence field unchanged;
5. encode the file as UTF-8 JSON.

Run `scripts/audit_questions.py <file> --require-developer-format` before delivery. A structurally valid file still requires the completed medical and evidence audit.

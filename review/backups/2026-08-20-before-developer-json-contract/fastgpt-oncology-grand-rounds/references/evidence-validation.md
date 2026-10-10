# Evidence and validation rules

## Contents

1. Evidence classes
2. Evidence locator contract
3. Structural checks
4. Chronology and applicability
5. Infection and competing diagnoses
6. Validator decisions

## Evidence classes

### Formal guideline or consensus

Require the returned record itself to have:

- `type=guideline`;
- non-empty `authority`;
- an identifiable formal source;
- a snippet directly supporting the tested decision;
- matching disease/population/phase/purpose, or for toxicity, matching treatment class, toxicity, grade, management stage, and purpose.

A formal-sounding title is insufficient when metadata identifies an ordinary article or authority is empty.

### Clinical study

Require the same current record to establish the study identity and enough of the design, population, intervention, comparator when applicable, endpoint, and result. Do not reconstruct missing details from memory. Commentaries, physician articles, meeting reports, media, interpretations, and case sharing remain secondary/expert material.

### Case facts as context only

Use only explicitly documented facts about the patient as stem context and chronology. Under the current production contract, a question whose answer is established only by recalling the case is not a valid output question. A case fact cannot prove a universal recommendation, standard treatment, definition, mandatory stopping rule, or allowed rechallenge.

### Expert/secondary evidence

Label ordinary articles, interpretations, and commentary according to their actual nature. Do not relabel them merely to satisfy a quota.

## Evidence locator contract

For every evidence-backed question, use one primary record and include at least:

```json
{
  "evidence_type": "",
  "doc_id": "",
  "split_index": null,
  "type": "",
  "authority": "",
  "source_title": "",
  "source_version": "",
  "source_section": "",
  "source_url": "",
  "evidence_summary": ""
}
```

Copy identifiers and metadata exactly from the returned record. Use `""` when a section or link is unavailable or ambiguous. Never put a local path, attachment path, `docId`, `dataId`, or database ID into `source_url`.

The correct answer's complete core decision must be supported by the bound snippet. Do not combine diagnosis from one split, dose from another, duration from another, or rechallenge criteria from memory. Distinct splits of one document may support distinct non-duplicate questions, but they remain one source document for source-diversity counting.

## Structural checks

Use the active workflow contract rather than assuming historical defaults. For the current five-question production workflow, require:

- exactly five questions;
- four options and one best answer per question;
- answer index in the configured base and exact `answer_text` match;
- required keys for question, phase, timepoint, explanation, `keyPoint`, and `guidelineRef`;
- all five questions to be valid formal-guideline or valid clinical-study questions;
- valid formal-guideline questions at least three;
- at least one valid clinical-study question when an eligible returned study directly supports an actual case decision; otherwise five guideline questions are allowed;
- no case-fact or expert-opinion question used to fill the quota;
- no duplicate question concepts or duplicate primary locators.

For `全程管理`, prefer distinct decisions across the available longitudinal phases and normally cover at least three phases when the case supports them. Do not force a phase that has no safe decision or evidence.

Judge requested difficulty by reasoning burden, not label or stem length:

- `基础`: one direct, sufficiently stated knowledge point; no artificial complexity.
- `中等`: normally integrate at least two decision-relevant factors, use plausible distractors, and require judgment rather than mostly verbatim case recall.
- `进阶`: normally integrate at least three decision-relevant factors or require evidence-applicability/dynamic-management reasoning; keep every option clinically plausible under some condition and let the stem determine the unique best answer.

Do not create fake difficulty with obscure vocabulary, traps, or long stems. If the returned pool cannot support the requested difficulty safely, use `insufficient` rather than downgrade silently.

Verify explicit current settings or supplied artifacts when they differ.

Do not silently fall back to the historical allowance of two case-fact questions, two guideline questions, or three total evidence-backed questions. If the eligible returned pool cannot support the current all-evidence contract, use `STOP_INSUFFICIENT`.

Run `scripts/audit_questions.py` when question and retrieval JSON files are available. The script checks structure, quotas, locators, metadata equality, duplicates, and risky infection phrases; manually verify medical semantics afterward.

## Chronology and applicability

Use only information available at or before each stated `timepoint`. Do not use postoperative pathology, later toxicity, response, recurrence, or survival to justify an earlier decision.

Keep `cTNM`, untreated `pTNM`, and post-neoadjuvant `ypTNM` distinct. Preserve uncertainty in suspected findings and conflicting source records. Frame later-published guidance as current teaching review rather than the historical team's actual basis.

Do not extrapolate across molecular subtype, resectability, treatment purpose, drug, toxicity, grade, or management stage without an explicit boundary. A single patient's outcome does not prove general applicability.

## Infection and competing diagnoses

When pathogen testing is positive or infection remains possible, prohibit claims equivalent to:

- 感染已排除;
- 无感染证据;
- 无阳性细菌学结果;
- 抗感染无效，因此不是感染.

Infection, colonization, contamination, tumor, and treatment toxicity may coexist. A negative tumor cytology result is not a negative infection result. Preserve parallel evaluation or treatment where supported.

## Validator decisions

- `PASS`: all structure, evidence, chronology, medical-safety, revision, and quota checks pass.
- `REVISE`: a safe correction is possible with the available pool; identify failed question IDs and actionable full-field changes.
- `STOP_INSUFFICIENT`: the eligible returned evidence cannot safely meet the contract; specify the exact missing evidence.

Never accept `PASS` or a high score without verifying the returned records and answers. Never convert a true evidence gap into prompt relabeling.

# Prompt and retrieval editing

## Contents

1. Locate before editing
2. Query boundaries
3. Generator contract
4. Validator contract
5. Contradiction scan

## Locate before editing

Inspect the current complete prompt or a readable screenshot before naming an edit location. Refer only to a small heading or field that visibly exists.

Give instructions in this form:

```text
Node: 题目生成
Field/position: small heading 【...】, at the end
Action: preserve the original and append
Paste: <complete canonical block>
Expected result: <one observable change>
Return: <one artifact>
```

If replacing a whole prompt, explicitly say to select all existing prompt text and replace it. Do not invent headings for the user to locate.

## Query boundaries

Use FastGPT's variable picker to create live chips. Descriptive placeholders are not literal IDs.

### Disease-guideline queries A and B

Split current-disease guidance into two focused lanes when the case spans the full course:

- A: initial treatment and molecular diagnosis;
- B: response reassessment, local/operative decisions, re-biopsy, recurrence, and later disease management actually present in the timeline.

Include the disease, mode, and only the decisions assigned to that lane. Prefer returned records with `type=guideline`, non-empty authority, and a snippet directly supporting one current decision. Reduce ordinary articles, interpretations, case sharing, duplicates, and content owned by the other lane.

### Clinical-study query

Include the disease/population, actual drugs and treatment phase, comparator when relevant, and decision endpoints. Rank a record only when that record itself identifies the study and material design, population, intervention/comparator, endpoint, and result. Lower case stories, media, interpretations, and name-only mentions.

### Toxicity/irAE queries A and B

Use only adverse events explicitly present in `adverse_events`. Exclude tumor stage, surgery, pathology response, and unrelated treatment-choice history. Prioritize `G4 > G3 > G2 > G1` and decision impact.

Allow formal toxicity guidance across primary tumors when treatment class, toxicity, grade, management stage, and purpose match. Preserve infection and alternative-diagnosis boundaries.

Use an expanded node-Debug query rather than template variables when testing a retrieval node. Keep the reusable workflow dynamic; never permanently hard-code one patient's diseases, drugs, adverse events, or known `docId` anchors.

Use separate retrieval calls for the first- and second-priority severe adverse events when both exist. Do not pass the same broad adverse-event text unchanged to both anchor models. If no second severe event exists, keep lane B empty or bypass it; never search the literal absence marker as medical content.

## Generator contract

Require the generator to:

- classify evidence from the actual returned metadata and snippet;
- bind each guideline/study question to one unique `doc_id + split_index`;
- copy `type`, `authority`, title, version, section, and link from that same record;
- use empty strings for unavailable sections or links;
- keep every core action in the correct answer within that one snippet's support;
- avoid cross-split or memory-based completion;
- use case facts only for this patient's documented events, never universal recommendations;
- on revision, preserve passed questions and fully replace failed questions when requested;
- recompute structure and evidence quotas after revision;
- generate exactly five questions, all backed by a valid formal guideline or valid clinical study;
- use at least three valid guideline questions;
- include a clinical-study question when an eligible returned study directly supports an actual case decision, otherwise allow five guideline questions;
- never use a case-fact or expert-opinion question as filler;
- return `insufficient` before drafting if the returned evidence pool cannot safely meet the contract;
- emit directly parseable JSON only.
- use `questions[].type` as the UI ability-dimension field and restrict it to the six production values: `诊断与分期`, `分子诊断`, `治疗决策`, `疗效复评与局部治疗`, `耐药与后线管理`, or `不良反应管理`.

When changing question count, JSON fields, difficulty definitions, allowed evidence types, evidence quotas, URL behavior, chronology rules, or failure states, make the corresponding rule change in both generator and validator prompts. If validator output fields change, also update the extraction node and loop custom-output mappings.

## Validator contract

Keep validation independent; it must audit, not silently repair.

Require the validator to:

- parse generation status before judging questions;
- locate each primary record using `doc_id + split_index` in the current retrieval results;
- reclassify evidence from the record rather than trust `evidence_type`;
- compare record metadata, source fields, snippet, and the correct answer;
- recompute guideline and clinical-study counts and reject any case-fact or expert-opinion output question;
- detect cross-record/source-field mixing, cross-split claims, chronology leakage, duplicate concepts, and unsafe infection wording;
- compare prior and revised questions field-by-field when full replacement was requested;
- reject unauthorized changes to already-passed questions;
- output only the allowed decision states.
- reject `PASS` when any `questions[].type` is outside the six-value production enum or does not match the question's primary clinical competency; request a precise `type` correction when that is the only error.

## Contradiction scan

Before returning a replacement block, check the complete prompt for older conflicting rules and duplicate headings. Keep one canonical version for each topic. Common conflicts include:

- old dual-retrieval wording after a third irAE branch was added;
- permissive and prohibitive rules for `lyhdoc` in different sections;
- URL rules that both require and forbid empty strings;
- revision instructions that edit one question but never recount global quotas;
- multiple evidence-result blocks referencing different/stale nodes.

After a schema change, verify downstream extraction and branch conditions against the new exact field names before running the complete workflow.

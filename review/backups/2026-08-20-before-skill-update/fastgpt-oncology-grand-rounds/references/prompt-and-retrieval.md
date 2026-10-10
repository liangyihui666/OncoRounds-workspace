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

### Disease-guideline query

Include the disease, mode, and a concise list of current clinical decisions. Prefer returned records with `type=guideline`, non-empty authority, and a snippet directly supporting one current decision. Reduce ordinary articles, interpretations, case sharing, and duplicates.

### Clinical-study query

Include the disease/population, actual drugs and treatment phase, comparator when relevant, and decision endpoints. Rank a record only when that record itself identifies the study and material design, population, intervention/comparator, endpoint, and result. Lower case stories, media, interpretations, and name-only mentions.

### Toxicity/irAE query

Use only adverse events explicitly present in `adverse_events`. Exclude tumor stage, surgery, pathology response, and unrelated treatment-choice history. Prioritize `G4 > G3 > G2 > G1` and decision impact.

Allow formal toxicity guidance across primary tumors when treatment class, toxicity, grade, management stage, and purpose match. Preserve infection and alternative-diagnosis boundaries.

Use an expanded node-Debug query rather than template variables when testing a retrieval node. Keep the reusable workflow dynamic; never permanently hard-code one patient's diseases, drugs, adverse events, or known `docId` anchors.

If a query contains several independent G3/G4 events, first ask reranking to cover each severe event with at least one distinct eligible record. If complete JSON still shows recall bias, split the database calls by event or event category.

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
- return `insufficient` before drafting if the returned evidence pool cannot safely meet the contract;
- emit directly parseable JSON only.

When changing question count, JSON fields, difficulty definitions, allowed evidence types, evidence quotas, URL behavior, chronology rules, or failure states, make the corresponding rule change in both generator and validator prompts. If validator output fields change, also update the extraction node and loop custom-output mappings.

## Validator contract

Keep validation independent; it must audit, not silently repair.

Require the validator to:

- parse generation status before judging questions;
- locate each primary record using `doc_id + split_index` in the current retrieval results;
- reclassify evidence from the record rather than trust `evidence_type`;
- compare record metadata, source fields, snippet, and the correct answer;
- recompute case-fact, guideline, and clinical-study counts;
- detect cross-record/source-field mixing, cross-split claims, chronology leakage, duplicate concepts, and unsafe infection wording;
- compare prior and revised questions field-by-field when full replacement was requested;
- reject unauthorized changes to already-passed questions;
- output only the allowed decision states.

## Contradiction scan

Before returning a replacement block, check the complete prompt for older conflicting rules and duplicate headings. Keep one canonical version for each topic. Common conflicts include:

- old dual-retrieval wording after a third irAE branch was added;
- permissive and prohibitive rules for `lyhdoc` in different sections;
- URL rules that both require and forbid empty strings;
- revision instructions that edit one question but never recount global quotas;
- multiple evidence-result blocks referencing different/stale nodes.

After a schema change, verify downstream extraction and branch conditions against the new exact field names before running the complete workflow.

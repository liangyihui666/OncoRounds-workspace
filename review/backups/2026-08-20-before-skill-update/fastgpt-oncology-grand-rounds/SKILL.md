---
name: fastgpt-oncology-grand-rounds
description: Continue, debug, audit, onboard cases into, extend, and safely publish an existing FastGPT oncology simulated-rounds/medical-teaching MCQ workflow without redesigning it. Use for FastGPT node screenshots, global or node debug forms, de-identified case variables, disease-guideline/clinical-study/irAE retrieval, text-splice evidence transfer, five-question JSON and difficulty rules, question_draft and review_feedback revision state, two-pass generation-validation loops, PASS/REVISE/STOP_INSUFFICIENT decisions, evidence locators, hallucination reduction, later OCR/file-upload/API integration, or OncoRounds publication gating. Give beginner-friendly instructions for one exact visible node and one exact field or small heading at a time.
---

# FastGPT Oncology Grand Rounds

Continue from the user's current workflow and handoff state. Do not rebuild the graph, rename working nodes, or revive completed work unless direct evidence shows that layer is faulty.

## Operate one verifiable action at a time

In each user-facing turn, normally give exactly one action on one visible node and one field or small heading. Use the exact labels visible in the user's screenshot or prompt.

Use this response contract:

1. **Node:** exact displayed node name.
2. **Field/position:** exact field label or existing small heading.
3. **Action:** one of select, paste, replace, append, enable, delete, save, or run.
4. **Expected result:** one observable result.
5. **Return artifact:** one screenshot, expanded query, full retrieval JSON, aggregation output, or complete loop JSON.

Do not give the next action until the returned artifact is checked. If the user explicitly requests a complete prompt replacement, one paste-ready replacement in one node still counts as one action. If a full run is expensive, combine only certain edits that belong to the same field or canonical prompt block; do not mix unrelated nodes.

When a screenshot contradicts the user's description, explain the visible evidence without blame and request the smallest corrective click. When the user changes the requested debug method, follow the new method and retain all already-verified facts.

## Diagnose before editing

Classify the current failure into the smallest responsible layer:

1. start/global variables;
2. query builder;
3. vector recall;
4. reranking or deduplication;
5. branch wiring or aggregation;
6. question generation;
7. independent validation;
8. revision-state persistence or loop routing;
9. response parsing or publication;
10. execution timeout/termination.

Do not change a downstream prompt to conceal an upstream retrieval or wiring failure. Inspect actual expanded queries and full JSON records before changing evidence rules.

Read [references/workflow-debug.md](references/workflow-debug.md) before mapping the graph, guiding a node Debug window, diagnosing slow execution, or choosing between node-only and full-project debugging.

Read [references/product-contract-and-onboarding.md](references/product-contract-and-onboarding.md) before changing global variables, question count, difficulty, JSON fields, phase coverage, case onboarding, or future upload/OCR behavior.

## Choose the smallest debug surface

- For a missing source, debug the exact retrieval node directly with an expanded test query.
- For a source present upstream but absent to generation, inspect the aggregation variable chips and then a full-run aggregation output.
- For wrong evidence use, inspect generator JSON plus the exact cited retrieval record.
- For false `PASS`, inspect validator JSON and its evidence inputs.
- For failed revision, inspect both iterations and compare `question_draft`, `review_feedback`, and question fields.
- For a final-message-only report, request the loop node's complete JSON, preferably both iterations' `customOutputs`.

Run the full project only when the required upstream layer has been verified or the user explicitly chooses an end-to-end run. Populate every mandatory global variable for a full run. A database-node Debug normally needs only resolved node variables, not every global variable.

## Preserve retrieval boundaries

Keep separate retrieval objectives for:

- disease-specific formal guidelines or consensus;
- treatment-matched clinical trials or clinical studies;
- cross-disease toxicity/irAE formal guidance when adverse events exist.

Keep embedding queries concise. Move detailed evidence-use restrictions into reranking, generation, or validation as appropriate. A reranker can only reorder recalled candidates; if a multi-event irAE query repeatedly recalls only one severe event, split retrieval by event or event category after confirming the full result JSON.

Read [references/prompt-and-retrieval.md](references/prompt-and-retrieval.md) before editing a query, reranker, generator, or validator prompt. Insert live FastGPT variables through the UI picker; never type an internal variable ID as ordinary text.

## Enforce evidence identity and medical safety

Treat evidence labels as claims to verify, not ground truth. Bind every evidence-backed question to one primary returned record using `doc_id + split_index`. Copy record metadata exactly. Leave unavailable section names and URLs empty. Do not combine a dose, duration, stopping rule, rechallenge rule, or study result from another split or from model memory.

Never lower evidence standards merely to produce five questions. `insufficient` and `STOP_INSUFFICIENT` are safe valid outcomes when the returned pool cannot satisfy the requested count, difficulty, or evidence quotas.

Read [references/evidence-validation.md](references/evidence-validation.md) before reviewing question JSON, changing validation rules, or deciding whether a model-reported `PASS` is trustworthy.

When question and retrieval JSON files are available, run `scripts/audit_questions.py` for structural and locator checks. Treat script success as necessary, never sufficient; manually verify case facts and direct snippet support.

## Audit revision loops and publication

Treat `question_draft` and `review_feedback` as persistent incoming state, not fixed first-run placeholders. On `REVISE`, preserve passed questions and replace only failed questions unless a global rule requires broader correction. If evidence type or decision action changes, replace the entire question: stem, options, answer, explanation, `keyPoint`, `evidence_type`, and `guidelineRef`.

Separate generation outcome from validation outcome. A successful generation or high score does not authorize publication. Check both loop iterations, verify that iteration 1 feedback entered iteration 2, compare the questions field-by-field, and recompute evidence quotas after revision.

Read [references/loop-and-publication.md](references/loop-and-publication.md) before interpreting complete loop JSON, normalizing final state, or modifying any API/UI integration.

Keep the current learner workflow a controlled teaching-content pipeline, not a diagnostic system. Accept only de-identified case inputs. Do not expose names, admission numbers, contact details, local paths, internal database identifiers, credentials, or tokens in learner output.

## Declare completion only after end-to-end proof

Require all of:

- the intended retrieval branch returned eligible evidence;
- aggregation passed that exact record downstream;
- each evidence-backed answer is fully supported by its single bound snippet;
- the validator independently checked facts, locators, and source fields;
- revision state persisted and requested fixes actually occurred;
- the final set satisfies structure, difficulty, evidence quotas, chronology, and medical-safety boundaries;
- the normalized final state permits publication;
- no source field, recommendation, study detail, or case fact was invented.

# Product contract and case onboarding

## Contents

1. Current product boundary
2. Global variables
3. Generation and validation JSON
4. Question-set contract
5. Prompt and downstream synchronization
6. Future OCR and upload boundary

## Current product boundary

Treat the current product as a teaching-content pipeline for manually prepared, de-identified oncology cases. Generate a fixed five-question single-best-answer set unless the user's active workflow explicitly changes that contract. Use evidence retrieval, independent validation, bounded revision, and safe stop; do not present the system as autonomous diagnosis or clinical care.

Preserve the user's current graph and field names. Use this reference to check roles and contracts, not to rename nodes or replace the current three retrieval branches with an older topology.

## Global variables

Verify the current FastGPT fields before changing them. Common stable roles are:

| Variable | Typical type | Required when | Purpose |
|---|---|---|---|
| `case_id` | String | Optional | Internal de-identified key |
| `case_title` | String | Full run | De-identified case title |
| `disease` | String | Full run | Disease and pathology context |
| `case_mode` | Select/String | Full run | Commonly `全程管理` or `单时间点` |
| `case_context` | String | Full run | Initial presentation and known facts |
| `case_timeline` | String | Longitudinal case | Chronological treatment timeline |
| `biomarkers` | String | When present | Pathology and molecular markers |
| `learning_points` | String | Optional | Intended teaching goals |
| `decision_points` | String | Full run | Decisions the questions should test |
| `adverse_events` | String | When present | Explicit treatment-related events |
| `evidence_notes` | String | When needed | Conflicts, uncertainty, and applicability boundaries |
| `question_count` | Number | Full run | Current product value commonly `5` |
| `difficulty` | Select/String | Full run | `基础`, `中等`, or `进阶` |
| `question_draft` | Internal String | Revision | Complete previous generation JSON |
| `review_feedback` | Internal String | Loop | Structured prior review or initial-run marker |

Do not make optional medical information mandatory merely to satisfy a preview form. Do require every fact needed for the requested decision. Insert variable references through FastGPT's picker and preserve the visible current tokens.

Keep preview data outside the app in a reusable de-identified artifact because new/reset conversation state may clear entered globals.

## Generation and validation JSON

Preserve the active generator root contract, commonly including:

```text
generation_status, case_summary, question_count, difficulty,
questions, missing_information, risk_message
```

For every successful question, commonly require:

```text
id, type, phase, timepoint, question, options, answer,
answer_text, explain, keyPoint, guidelineRef
```

Use the expanded `guidelineRef` locator contract defined in `evidence-validation.md`; do not revert to a historical shorter reference object.

Preserve the active validator root contract, commonly including:

```text
decision, score, fatal_errors, general_feedback,
question_checks, revision_instruction, missing_information
```

Return directly parseable JSON without Markdown fences or surrounding prose whenever downstream nodes parse the response.

For `generation_status=insufficient`, require zero questions, a non-empty specific `missing_information`, and an explanation of why safe generation is impossible. Do not fabricate questions to avoid this state.

## Question-set contract

For the established five-question workflow, verify:

- exactly five questions on success;
- exactly four options per question;
- one unique best answer;
- `answer_text` exactly matches the indexed option using the workflow's configured index base;
- no shortcut options such as “以上都是” or “以上都不是” unless the active product contract explicitly permits them;
- explanations address the answer and material distractor boundaries;
- no dependence on unseen images or later case facts;
- case-fact questions at most two;
- valid formal-guideline questions at least two;
- valid guideline plus valid clinical-study questions at least three;
- requested difficulty is achieved semantically;
- source identity, year, section, URL, and evidence summary remain faithful to one returned record.

Do not treat a validator score as publication authority unless the active contract explicitly defines a score threshold. The final validation decision plus independent hard-gate audit controls publication.

## Prompt and downstream synchronization

Synchronize generator and validator whenever changing:

- question count or option count;
- JSON keys or evidence-reference fields;
- difficulty definitions;
- evidence labels or quotas;
- source URL behavior;
- chronology/TNM rules;
- PASS, REVISE, or insufficient gates.

If validator output fields change, update the field-extraction node. If final or loop fields change, update loop custom outputs, branch conditions, parser, and publication storage. The extraction node must extract existing validator fields only; it must not reinterpret or rewrite the review.

## Future OCR and upload boundary

Keep photo upload, document upload, OCR, and structured extraction outside the current five-question loop unless the user explicitly requests that extension.

Use a separate upstream workflow or subflow:

```text
photo/file upload
  -> OCR or document parsing
  -> structured case extraction
  -> de-identification and sensitive-field screening
  -> user/clinician confirmation
  -> completeness and contradiction checks
  -> map into current global variables
  -> existing retrieval/generation/validation loop
```

Never treat OCR text as verified medical truth. Preserve page/source provenance, uncertainty, and conflicting values. Require human confirmation before retrieved evidence or generated questions use OCR-derived facts. Do not expose raw uploads, local paths, names, identifiers, contact data, credentials, or tokens to learner-facing output.

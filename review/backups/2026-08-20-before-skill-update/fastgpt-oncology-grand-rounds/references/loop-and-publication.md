# Loop and publication contract

## Contents

1. Persistent state
2. Two-pass audit
3. Final-state normalization
4. Publication boundary
5. API and UI safety

## Persistent state

The loop initializer must copy incoming/global `question_draft` and `review_feedback`. It must not overwrite them with fixed values such as `无`, `首次生成`, or test markers.

Use prior state, not iteration number alone, to distinguish first generation from revision:

```text
previous STOP_INSUFFICIENT -> stop safely
previous REVISE + non-empty draft -> minimal revision
no meaningful draft/review -> first generation
```

On `REVISE`, preserve passed questions. If the validator requires a new evidence type or different clinical decision, replace the failed question's stem, options, answer, explanation, `keyPoint`, evidence type, and complete reference—not just its wording.

## Two-pass audit

For every iteration, locate when present:

- `final_questions_json`;
- `validation_decision`;
- `validation_score`;
- `validation_feedback`;
- `missing_information`;
- `loop_count` or iteration number.

Confirm that iteration 2 received iteration 1's actionable feedback. A changed score alone does not prove the revision path worked. Compare question content and `guidelineRef` field-by-field, verify requested replacements occurred, check passed questions for unauthorized changes, and recount the entire final set.

If validation fields are missing, inspect whether execution ended before the validator. Do not interpret termination as `STOP_INSUFFICIENT`.

## Final-state normalization

Retain the raw FastGPT decision and derive a separate integration status:

- `PASS`: raw validation decision is `PASS` and final JSON parses and passes required checks;
- `STOP_INSUFFICIENT`: validator confirms evidence insufficiency; publish no questions;
- `REVISE_EXHAUSTED`: decision remains `REVISE` at the maximum allowed iteration; publish no questions;
- `NETWORK_ERROR`: transport, timeout, or non-success HTTP error;
- `JSON_PARSE_ERROR`: invalid JSON or missing critical fields.

Do not promote embedded `generation_status=success` or a high score into publication authority.

## Publication boundary

Only a parsed and independently audited `PASS` set may enter the publishable question store. Quarantine or discard questions for every other normalized state. Expose only safe diagnostics such as score, feedback, missing information, and loop count.

Do not modify learner-facing UI merely to compensate for a workflow failure. Keep generation/review backstage; do not trigger a long generation run when a learner clicks to begin a prepared case.

## API and UI safety

Inspect the actual API response contract before implementing a parser; do not guess the outer wrapper. Keep API keys only in ignored server-side environment configuration. Never place keys in browser code, prompts, screenshots, logs, chat responses, or committed files.

Modify API/UI integration only when the user explicitly requests it or a verified response-contract mismatch requires it. Preserve working visual and interaction behavior otherwise.

# Workflow and debug procedure

## Contents

1. Preserve and map the graph
2. Failure-location matrix
3. Before any Debug run
4. Retrieval-node Debug
5. Aggregation verification
6. Full-project Debug
7. Slow or terminated runs

## Preserve and map the graph

Use the user's visible node names. Verify logical roles without renaming working nodes:

```text
Start / global variables
  |-- disease guideline A -> initial/molecular guideline retrieval --|
  |-- disease guideline B -> reassessment/later guideline retrieval -|
  |-- clinical-study query -> study retrieval -----------------------|-> evidence aggregation
  |-- severe irAE anchor A -> toxicity-guideline retrieval A --------|
  `-- severe irAE anchor B -> toxicity-guideline retrieval B --------|       |
                                                                            v
                                                                    question generator
                                                                            |
                                                                    independent validator
                                                                            |
                                                                  result extraction / decision
                                                                            |
                                                                  revision loop / final output
```

Trust the current handoff, saved graph, screenshots, and actual trace over historical node IDs or obsolete topology notes. After node copying or deletion, use displayed variable-chip labels rather than an old internal ID.

Typical global variables include case identity, disease, mode, case context, timeline, biomarkers, learning points, decision points, adverse events, evidence notes, question count, difficulty, `question_draft`, and `review_feedback`.

For a clean first-generation preview, set incoming `question_draft` empty and provide the workflow's current initial-feedback value. The initializer must copy those incoming values. For a revision preview, provide the complete prior generator JSON and structured review. Never replace revision inputs with first-run defaults inside the initializer.

## Failure-location matrix

| Symptom | Responsible layer to check first |
|---|---|
| Required value absent or literal ID appears | Global variable or query-builder chip |
| Desired record absent from retrieval JSON | Query/vector recall |
| Desired record present but ranked low | Reranker/deduplication |
| Record present upstream but generator reports missing | Aggregation/wiring |
| Generator cites wrong source or split | Generator evidence contract |
| Validator accepts a conflicting answer | Validator fact/snippet audit |
| Every iteration behaves like first generation | State initializer |
| `REVISE` feedback does not change failed question | Loop transfer or revision contract |
| Validation fields are empty | Execution termination before validation |
| Final UI exposes non-PASS questions | Parser/publication gate |

## Before any Debug run

1. Save the workflow and confirm the top bar is not marked unsaved.
2. Stop or close the previous run-result view.
3. Select the exact displayed node, not a similar duplicate.
4. Decide the one artifact needed next.

Do not ask the user to fill unrelated inputs before knowing whether the window is on **Node variables** or **Global variables**. In screenshots, identify the active tab by its highlight/underline.

## Retrieval-node Debug

Use direct database-node Debug for recall testing without filling the full case:

1. Open the intended database/retrieval node.
2. Click **Debug**.
3. Switch to **Node variables**.
4. Paste an already-expanded test query into the required search field.
5. Do not paste template IDs or fill global variables in this mode.
6. Verify the node's configured search parameters only when those fields are visible and relevant.
7. Run, open **Full response**, select the retrieval node, expand the complete result array, and copy the complete JSON.

Inspect every candidate's `docId`, `splitIndex`, `type`, `authority`, title/data-source name, year, link, snippet, and score when present. A promising title alone is not proof.

If the desired record is absent, inspect the actual expanded query before editing reranker prose. Remove irrelevant timeline, surgery, pathology, mild toxicity, and generic background from a focused vector query. If independent severe events compete and one remains absent, use separate retrieval calls rather than endlessly lengthening the reranker.

When no second severe adverse event exists, the B lane may be empty or bypassed. Do not run a database search for `无第二项严重不良反应`; that phrase can recall unrelated toxicity records and increase latency.

## Aggregation verification

Under every evidence heading, verify that the visible variable chip references the intended retrieval node's result. A heading without the correct chip is not evidence transfer.

Do not infer broken wiring from isolated text-splice Debug output: isolated aggregation Debug normally does not run upstream retrieval nodes. Verify transfer in a full-run trace or supply explicit test inputs.

## Full-project Debug

Use a full run after relevant node-level behavior works, or immediately when the user explicitly requests an end-to-end attempt.

Populate all mandatory global variables. For a revision run, paste the complete prior question JSON into `question_draft` and the complete structured review into `review_feedback`; do not replace either with fixed first-run wording.

Preview forms are not durable storage. If clearing a conversation resets fields, reuse a saved de-identified test-case artifact rather than relying on previous preview state.

After completion, request the loop node's complete JSON, not only the rendered final message. Prefer both iterations' `customOutputs`, plus retrieval records when cited evidence cannot otherwise be verified.

## Slow or terminated runs

Do not treat a long or stopped execution as a medical decision. First identify the active/last completed node and capture its trace.

Optimize only the proven bottleneck, usually in this order:

1. shorten retrieval queries;
2. remove duplicated evidence blocks;
3. reduce oversized retrieval output where safe;
4. revise only failed questions;
5. avoid unnecessary loop iterations;
6. remove repeated case/rule text from multiple prompts.

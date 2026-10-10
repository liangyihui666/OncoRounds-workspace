# Case document preprocessing

## Purpose and boundary

Use a separate upstream workflow named `病例资料预处理` to turn a de-identified source document into draft FastGPT case variables. Do not merge document parsing into the evidence-retrieval and question-generation loop.

The MVP should accept one required HTML file first. Extend later to TXT, MD, DOCX, PDF, and images after the HTML path is stable. A normal workflow is sufficient; an Agent is optional for conversational orchestration.

## Recommended graph

```text
流程开始
  -> 文档解析
  -> HTML正文清洗
  -> 病例结构化提取
  -> 提取结果独立校验
  -> 校验结果提取
  -> 条件判断
      |-- PASS -> 输出结构化病例变量
      |-- REVISE -> 返回明确修订字段
      `-- STOP_INSUFFICIENT -> 输出缺失信息
```

Keep upload inputs medically appropriate. If FastGPT reports that a workflow with special inputs cannot be used as an Agent tool, do not delete the upload field merely to force attachment. Keep it as a workflow or expose it through a supported API/form path.

## Structured output

Map only supported facts into:

```text
case_id
case_title
disease
case_context
learning_points
case_mode
case_timeline
biomarkers
decision_points
adverse_events
evidence_notes
case_intro_images
```

Do not populate `question_draft` or `review_feedback` from the source document. Those are revision-loop state variables. Keep `question_count=5` and difficulty as explicit user/product inputs.

The extractor should distinguish:

- patient-specific facts;
- verbatim report findings;
- clinician or MDT opinion;
- promotional or narrative claims;
- citations and reference lists;
- image URLs or embedded image identifiers;
- missing, conflicting, or uncertain information.

Preserve chronology and uncertainty. Never convert `疑似`, `考虑`, `倾向`, or a radiology-only suspicion into a confirmed diagnosis.

## De-identification and confirmation

Reject or redact names, admission numbers, phone numbers, addresses, identity numbers, institution-internal identifiers, and credentials. Preserve a reversible source locator internally only when safe; never publish local file paths.

Require independent extraction validation and clinician confirmation before the question workflow consumes the fields. Parsing success is not medical verification.

## Images

Use image understanding only to describe visible findings and route useful teaching images. It may help fill `case_context`, `case_timeline`, `biomarkers`, `adverse_events`, or `case_intro_images` when the image and surrounding report directly support them.

Do not let image description alone fill `disease`, universal treatment recommendations, or evidence fields. Do not diagnose from screenshots. Keep confidence and source labels, and prefer report text over inferred image meaning when they conflict.

## Debug sequence

1. Test one known HTML file through `文档解析`.
2. Inspect complete parsed text and image references.
3. Verify the cleaner removed navigation, scripts, duplicated slide text, and irrelevant boilerplate without deleting medical chronology.
4. Inspect the complete structured JSON.
5. Verify every field against the source.
6. Confirm contradictions and missing information are preserved.
7. Only then pass the approved JSON to the existing production workflow.

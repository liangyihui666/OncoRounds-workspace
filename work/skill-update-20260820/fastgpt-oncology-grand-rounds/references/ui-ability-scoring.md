# UI ability-dimension scoring

## Current source field and meaning

The production UI uses each question's `questions[].type` as the ability-dimension category. The generator and validator must use exactly one of:

- `诊断与分期`
- `分子诊断`
- `治疗决策`
- `疗效复评与局部治疗`
- `耐药与后线管理`
- `不良反应管理`

Do not emit legacy free text such as `诊断策略`, `疗效评估`, `复发管理`, `再活检决策`, `证据适用性`, `治疗`, `诊断`, or `不良反应` in new production JSON.

The current OncoRounds UI ability percentage is a simple domain accuracy:

```text
correct questions in the domain / attempted questions in the domain * 100%
```

It is not an AI-generated competence assessment, a validated psychometric score, or a longitudinal estimate of clinical ability. Explain it as performance on the questions assigned to that domain.

## Audit the denominator and classifier

Before trusting a displayed percentage, inspect:

1. which questions were assigned to the domain;
2. the number attempted in that domain;
3. the number answered correctly;
4. whether the question-to-domain rule matched the intended teaching construct.

Legacy keyword classification is order-sensitive. For example, a molecular-testing question containing `进展` may be classified as `耐药管理` before a later `分子` rule can match. A correct percentage can therefore describe the wrong group.

Display numerator and denominator where possible, such as `1/3（33%）`. For fewer than two attempted questions in a domain, show `样本不足` or otherwise avoid strong competence claims.

## Legacy fallback

Older JSON may contain free-text `type` values and may still require a compatibility mapping. New production content must not rely on stem-keyword classification. If the UI later adopts a separate `ability_domain` field, version the developer contract and update the generator, validator, extraction, TypeScript types, publication parser, audit script, and tests together.

## Interpretation guardrail

Use the dimension summary to guide review and learning, not to credential clinicians or make clinical decisions. A small five-question case cannot reliably measure broad professional competence.

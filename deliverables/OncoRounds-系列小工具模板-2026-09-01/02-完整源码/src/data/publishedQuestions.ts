import type {
  CaseQuestion,
  ClinicalDomain,
  LegacyPublishedEvidenceType,
  PublishedQuestion,
  PublishedQuestionSet,
  PublishedReference,
  PublishedSchemaVersion,
  QuestionEvidence,
} from './types'

const referenceKeys = [
  'evidence_type',
  'doc_id',
  'split_index',
  'type',
  'authority',
  'source_title',
  'source_version',
  'source_section',
  'source_url',
  'evidence_summary',
] as const

const v10EvidenceTypes = new Set<LegacyPublishedEvidenceType>([
  '指南',
  '临床研究',
  '病例事实',
])
const v11EvidenceTypes = new Set<LegacyPublishedEvidenceType>([
  '指南',
  '临床研究',
  '病例+临床推理',
])

const domainAliases: Array<[RegExp, ClinicalDomain]> = [
  [/耐药|进展|后线/, '耐药管理'],
  [/分子|基因|标志物|再次活检/, '分子诊断'],
  [/疗效|影像|缓解|病理评估/, '疗效评估'],
  [/不良|毒性|安全/, '不良反应'],
  [/随访/, '随访管理'],
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getSchemaVersion(
  value: Record<string, unknown>,
  caseId: string,
): PublishedSchemaVersion {
  const version = value.schema_version ?? '1.0'
  if (version !== '1.0' && version !== '1.1') {
    throw new Error(`${caseId} published question set has an unsupported schema version`)
  }
  return version
}

function assertReference(
  value: unknown,
  caseId: string,
  questionId: string,
  schemaVersion: PublishedSchemaVersion,
): asserts value is PublishedReference {
  if (!isRecord(value)) {
    throw new Error(`${caseId} ${questionId} has an invalid guidelineRef`)
  }

  if (!referenceKeys.every((key) => Object.hasOwn(value, key))) {
    throw new Error(`${caseId} ${questionId} has an incomplete guidelineRef contract`)
  }

  const stringKeys = referenceKeys.filter((key) => key !== 'split_index')
  if (stringKeys.some((key) => typeof value[key] !== 'string')) {
    throw new Error(`${caseId} ${questionId} has invalid guidelineRef metadata`)
  }

  if (
    value.split_index !== null &&
    (!Number.isInteger(value.split_index) || Number(value.split_index) < 0)
  ) {
    throw new Error(`${caseId} ${questionId} has an invalid evidence locator`)
  }

  const evidenceType = value.evidence_type as LegacyPublishedEvidenceType
  const supportedTypes =
    schemaVersion === '1.1' ? v11EvidenceTypes : v10EvidenceTypes
  if (!supportedTypes.has(evidenceType)) {
    throw new Error(
      `${caseId} ${questionId} has an evidence type that is incompatible with schema ${schemaVersion}`,
    )
  }

  if (
    !String(value.source_title).trim() ||
    !String(value.evidence_summary).trim()
  ) {
    throw new Error(`${caseId} ${questionId} has incomplete learner-facing evidence`)
  }

  const requiresLocator =
    schemaVersion === '1.1' || evidenceType === '指南' || evidenceType === '临床研究'
  if (
    requiresLocator &&
    (!String(value.doc_id).trim() || !Number.isInteger(value.split_index))
  ) {
    throw new Error(`${caseId} ${questionId} has an incomplete evidence locator`)
  }
}

function assertQuestion(
  value: unknown,
  caseId: string,
  expectedId: string,
  schemaVersion: PublishedSchemaVersion,
): asserts value is PublishedQuestion {
  if (!isRecord(value) || value.id !== expectedId) {
    throw new Error(`${caseId} published question set must contain Q1-Q5 in order`)
  }

  const requiredText = [
    'type',
    'phase',
    'timepoint',
    'question',
    'answer_text',
    'explain',
    'keyPoint',
  ] as const
  if (
    requiredText.some(
      (key) => typeof value[key] !== 'string' || !String(value[key]).trim(),
    )
  ) {
    throw new Error(`${caseId} ${expectedId} has an incomplete question contract`)
  }

  if (
    !Array.isArray(value.options) ||
    value.options.length !== 4 ||
    value.options.some(
      (option) => typeof option !== 'string' || !option.trim(),
    ) ||
    new Set(value.options.map((option) => option.trim())).size !== 4
  ) {
    throw new Error(`${caseId} ${expectedId} must have four distinct options`)
  }

  if (
    !Number.isInteger(value.answer) ||
    Number(value.answer) < 0 ||
    Number(value.answer) > 3 ||
    value.options[Number(value.answer)] !== value.answer_text
  ) {
    throw new Error(`${caseId} ${expectedId} has an invalid answer contract`)
  }

  assertReference(value.guidelineRef, caseId, expectedId, schemaVersion)
}

function assertPublishableQuestionSet(
  value: unknown,
  caseId: string,
): asserts value is PublishedQuestionSet {
  if (!isRecord(value)) {
    throw new Error(`${caseId} published question set must be an object`)
  }

  const schemaVersion = getSchemaVersion(value, caseId)
  if (
    value.generation_status !== 'success' ||
    value.difficulty !== '进阶' ||
    value.question_count !== 5 ||
    !Array.isArray(value.questions) ||
    value.questions.length !== 5
  ) {
    throw new Error(`${caseId} published question set failed the five-question release gate`)
  }

  value.questions.forEach((question, index) => {
    assertQuestion(question, caseId, `Q${index + 1}`, schemaVersion)
  })

  const questions = value.questions as PublishedQuestion[]
  const hardEvidenceCount = questions.filter((question) =>
    ['指南', '临床研究'].includes(question.guidelineRef.evidence_type),
  ).length

  if (schemaVersion === '1.1') {
    const reasoningCount = questions.filter(
      (question) =>
        question.guidelineRef.evidence_type === '病例+临床推理',
    ).length
    if (hardEvidenceCount < 2 || reasoningCount < 2) {
      throw new Error(`${caseId} published question set failed the v1.1 evidence quota gate`)
    }

    const questionsByLocator = new Map<string, PublishedQuestion[]>()
    questions.forEach((question) => {
      const reference = question.guidelineRef
      const locator = `${reference.doc_id}::${reference.split_index}`
      questionsByLocator.set(locator, [
        ...(questionsByLocator.get(locator) ?? []),
        question,
      ])
    })

    questionsByLocator.forEach((related) => {
      if (related.length > 2) {
        throw new Error(`${caseId} published question set reuses one locator more than twice`)
      }
      if (
        related.length === 2 &&
        (new Set(related.map((question) => question.timepoint)).size !== 2 ||
          new Set(related.map((question) => question.answer_text)).size !== 2 ||
          new Set(related.map((question) => question.keyPoint)).size !== 2)
      ) {
        throw new Error(
          `${caseId} published question set reuses one locator without distinct decisions`,
        )
      }
    })
  } else {
    const guidelineCount = questions.filter(
      (question) => question.guidelineRef.evidence_type === '指南',
    ).length
    const caseFactCount = questions.filter(
      (question) => question.guidelineRef.evidence_type === '病例事实',
    ).length
    if (guidelineCount < 2 || hardEvidenceCount < 3 || caseFactCount > 2) {
      throw new Error(`${caseId} published question set failed the v1.0 evidence quota gate`)
    }
  }
}

function toDomain(question: PublishedQuestion): ClinicalDomain {
  const searchable = `${question.type} ${question.phase} ${question.question}`
  return (
    domainAliases.find(([pattern]) => pattern.test(searchable))?.[1] ??
    '治疗决策'
  )
}

function toOneSentence(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  const chineseEnd = text.search(/[。！？]/u)
  const westernEnd = text.search(/[.!?](?=\s|$)/u)
  const candidates = [chineseEnd, westernEnd].filter((index) => index >= 0)
  const end = candidates.length > 0 ? Math.min(...candidates) : -1
  return end >= 0 ? text.slice(0, end + 1) : text
}

function toEvidence(question: PublishedQuestion): QuestionEvidence {
  const reference = question.guidelineRef
  return {
    sourceTitle: reference.source_title.trim() || reference.authority.trim(),
    sourceVersion: reference.source_version.trim(),
    evidenceSummary: toOneSentence(reference.evidence_summary),
  }
}

export function buildPublishedQuestions(
  input: unknown,
  caseId: string,
): CaseQuestion[] {
  assertPublishableQuestionSet(input, caseId)

  return input.questions.map((question) => ({
    id: `${caseId}-${question.id.toLowerCase()}`,
    domain: toDomain(question),
    prompt: question.question,
    context: [question.timepoint, question.phase].filter(Boolean).join(' · '),
    options: [...question.options],
    correctIndex: question.answer,
    explanation: question.explain,
    takeaways: [question.keyPoint],
    evidence: toEvidence(question),
  }))
}

import type { CaseQuestion, ClinicalDomain } from './types'

interface PublishedReference {
  evidence_type: string
  doc_id: string
  split_index: number | null
  type: string
  authority: string
  source_title: string
  source_version: string
  source_section: string
  source_url: string
  evidence_summary: string
}

interface PublishedQuestion {
  id: string
  type: string
  phase: string
  timepoint: string
  question: string
  options: string[]
  answer: number
  answer_text: string
  explain: string
  keyPoint: string
  guidelineRef: PublishedReference
}

interface PublishedQuestionSet {
  generation_status: 'success'
  case_summary: string
  question_count: 5
  difficulty: '进阶'
  questions: PublishedQuestion[]
  missing_information: string[]
  risk_message: string
}

const domainAliases: Array<[RegExp, ClinicalDomain]> = [
  [/耐药|进展|后线/, '耐药管理'],
  [/分子|基因|标志物|再次活检/, '分子诊断'],
  [/疗效|影像|缓解|病理评估/, '疗效评估'],
  [/不良|毒性|安全/, '不良反应'],
  [/随访/, '随访管理'],
]

function assertPublishableQuestionSet(
  value: unknown,
  caseId: string,
): asserts value is PublishedQuestionSet {
  if (!value || typeof value !== 'object') {
    throw new Error(`${caseId} published question set must be an object`)
  }

  const set = value as Partial<PublishedQuestionSet>
  if (
    set.generation_status !== 'success' ||
    set.difficulty !== '进阶' ||
    set.question_count !== 5 ||
    !Array.isArray(set.questions) ||
    set.questions.length !== 5
  ) {
    throw new Error(`${caseId} published question set failed the five-question release gate`)
  }

  const guidelineQuestions = set.questions.filter(
    (question) => question.guidelineRef?.evidence_type === '指南',
  )
  const caseFactQuestions = set.questions.filter(
    (question) => question.guidelineRef?.evidence_type === '病例事实',
  )
  const clinicalStudyQuestions = set.questions.filter(
    (question) => question.guidelineRef?.evidence_type === '临床研究',
  )

  if (
    guidelineQuestions.length < 2 ||
    guidelineQuestions.length + clinicalStudyQuestions.length < 3 ||
    caseFactQuestions.length > 2
  ) {
    throw new Error(
      `${caseId} published question set failed the evidence quota gate`,
    )
  }

  set.questions.forEach((question) => {
    if (
      question.options.length !== 4 ||
      question.answer < 0 ||
      question.answer > 3 ||
      question.options[question.answer] !== question.answer_text
    ) {
      throw new Error(`${caseId} ${question.id} has an invalid answer contract`)
    }

    if (
      question.guidelineRef.evidence_type === '指南' &&
      (!question.guidelineRef.doc_id ||
        !Number.isInteger(question.guidelineRef.split_index) ||
        question.guidelineRef.type !== 'guideline' ||
        !question.guidelineRef.authority.trim())
    ) {
      throw new Error(`${caseId} ${question.id} has an incomplete guideline locator`)
    }
  })
}

function toDomain(question: PublishedQuestion): ClinicalDomain {
  const searchable = `${question.type} ${question.phase} ${question.question}`
  return (
    domainAliases.find(([pattern]) => pattern.test(searchable))?.[1] ??
    '治疗决策'
  )
}

function toEvidence(question: PublishedQuestion) {
  const reference = question.guidelineRef
  if (reference.evidence_type === '病例事实') {
    return reference.source_title || reference.evidence_type
  }

  return [reference.authority, reference.source_title, reference.source_version]
    .filter(Boolean)
    .join(' · ')
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

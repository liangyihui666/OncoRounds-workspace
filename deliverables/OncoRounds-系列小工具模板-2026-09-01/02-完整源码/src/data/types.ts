export type ClinicalDomain =
  | '分子诊断'
  | '治疗决策'
  | '疗效评估'
  | '耐药管理'
  | '不良反应'
  | '随访管理'

export interface SummaryItem {
  label: string
  value: string
}

export interface TimelineItem {
  date: string
  title: string
  detail: string
}

export interface QuestionEvidence {
  sourceTitle: string
  sourceVersion: string
  evidenceSummary: string
}

export type PublishedSchemaVersion = '1.0' | '1.1'

export type PublishedEvidenceType =
  | '指南'
  | '临床研究'
  | '病例+临床推理'

export type LegacyPublishedEvidenceType = PublishedEvidenceType | '病例事实'

export interface PublishedReference {
  evidence_type: LegacyPublishedEvidenceType
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

export interface PublishedQuestion {
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

export interface PublishedQuestionSet {
  schema_version?: PublishedSchemaVersion
  generation_status: 'success'
  case_summary: string
  question_count: 5
  difficulty: '进阶'
  questions: PublishedQuestion[]
  missing_information: string[]
  risk_message: string
}

export interface CaseQuestion {
  id: string
  domain: ClinicalDomain
  prompt: string
  context: string
  options: string[]
  correctIndex: number
  explanation: string
  takeaways: string[]
  evidence: QuestionEvidence
}

export interface OutcomeMedia {
  src: string
  alt: string
  caption: string
}

export interface GrandRoundCase {
  id: string
  cancerType: '肺癌' | '食管癌' | '胃癌'
  shortTitle: string
  title: string
  subtitle: string
  doctor: string
  hospital: string
  difficulty: '进阶'
  minutes: number
  color: 'violet' | 'cyan' | 'rose'
  image: string
  summary: SummaryItem[]
  timeline: TimelineItem[]
  outcomeMedia?: OutcomeMedia
  questions: CaseQuestion[]
  source: string
}

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

export interface CaseQuestion {
  id: string
  domain: ClinicalDomain
  prompt: string
  context: string
  options: string[]
  correctIndex: number
  explanation: string
  takeaways: string[]
  evidence: string
}

export interface GrandRoundCase {
  id: string
  cancerType: '肺癌' | '食管癌' | '胃癌'
  shortTitle: string
  title: string
  subtitle: string
  doctor: string
  hospital: string
  difficulty: '进阶' | '挑战'
  minutes: number
  color: 'violet' | 'cyan' | 'rose'
  image: string
  summary: SummaryItem[]
  timeline: TimelineItem[]
  questions: CaseQuestion[]
  source: string
}

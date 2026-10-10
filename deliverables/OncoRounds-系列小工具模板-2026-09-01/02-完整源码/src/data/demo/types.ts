import type { CaseQuestion, GrandRoundCase, PublishedReference, SummaryItem, TimelineItem } from '../types'

export const cancerCategories = ['肺癌', '胃癌', '乳腺癌', '食管癌', 'GEJ腺癌'] as const
export type CancerCategory = (typeof cancerCategories)[number]
export type DisplayQuestion = CaseQuestion & { reference?: PublishedReference }
/** Shared presentation contract. Legacy published types remain unchanged. */
export type DisplayCase = Omit<GrandRoundCase, 'cancerType' | 'questions'> & {
  cancerType: string
  questions: DisplayQuestion[]
  imageAlt?: string
  contentImages?: Array<{ src: string; alt: string; sourceUrl: string }>
}
export type DemoCase = DisplayCase & { category: CancerCategory; demoOnly: true }
export type AnswerLetter = 'A' | 'B' | 'C' | 'D'
export interface ExternalCase {
  schema_version: string
  case_id: string
  cancer_type: string
  difficulty: string
  decision_point_count: number
  image: { src: string; alt: string }
  home: { display_title: string; description: string }
  overview: {
    hero: { title: string; subtitle: string }
    tabs: Array<{
      id: string
      summary_items?: Array<SummaryItem & { order: number }>
      timeline_items?: TimelineItem[]
    }>
  }
}
export interface ExternalQuestionSet {
  case_id: string
  cancer_type: string
  generation_status: string
  question_count: number
  questions: Array<{
    id: string; type: string; phase: string; timepoint: string; question: string
    options: Record<AnswerLetter, string>; answer: AnswerLetter; answer_text: string
    explain: string; keyPoint: string; guidelineRef: PublishedReference
  }>
}

import type { ClinicalDomain } from '../types'
import type { AnswerLetter, CancerCategory, DemoCase, ExternalCase, ExternalQuestionSet } from './types'

const letters: AnswerLetter[] = ['A', 'B', 'C', 'D']
const domains: Array<[RegExp, ClinicalDomain]> = [
  [/不良|毒性|风险|安全|皮疹|胆管/, '不良反应'],
  [/耐药|进展|后线/, '耐药管理'],
  [/分子|基因|标志物|活检|分型|病理|检测/, '分子诊断'],
  [/疗效|影像|缓解/, '疗效评估'],
  [/随访/, '随访管理'],
]

/** Local demonstration import only; deliberately separate from publish validation. */
export function adaptDemoCase(page: ExternalCase, set: ExternalQuestionSet,
  category: CancerCategory, cover: string): DemoCase {
  if (page.case_id !== set.case_id || page.cancer_type !== set.cancer_type ||
    set.generation_status !== 'success' || set.question_count !== 5 ||
    set.questions.length !== 5 || page.decision_point_count !== 5) {
    throw new Error(`演示病例与五题文件不匹配：${page.case_id}`)
  }
  const summary = page.overview.tabs.find(tab => tab.id === 'summary')?.summary_items
  const timeline = page.overview.tabs.find(tab => tab.id === 'timeline')?.timeline_items
  if (!summary?.length || !timeline?.length) throw new Error(`缺少病例摘要或病程：${page.case_id}`)
  return {
    id: page.case_id, cancerType: page.cancer_type, category, demoOnly: true,
    shortTitle: page.home.display_title, title: page.overview.hero.title,
    subtitle: page.overview.hero.subtitle, doctor: '', hospital: '', minutes: 0,
    difficulty: '进阶', color: 'violet', image: cover,
    imageAlt: `${category}病例主题图`, source: page.image.src,
    contentImages: page.image.src.startsWith('https://') ? [{ src: `./assets/case-content/${page.case_id}.png`, alt: page.image.alt, sourceUrl: page.image.src }] : [],
    summary: [...summary].sort((a, b) => a.order - b.order).map(({ label, value }) => ({ label, value })),
    timeline: timeline.map(item => ({ ...item })),
    questions: set.questions.map((q, index) => {
      if (q.id !== `Q${index + 1}` || !letters.includes(q.answer) ||
        Object.keys(q.options).length !== 4 || letters.some(key => !q.options[key]?.trim()) ||
        new Set(Object.values(q.options)).size !== 4 || q.options[q.answer] !== q.answer_text ||
        !q.question.trim() || !q.explain.trim() || !q.keyPoint.trim() ||
        !q.guidelineRef.source_title.trim() || !q.guidelineRef.evidence_summary.trim()) {
        throw new Error(`演示题目格式不完整：${page.case_id}/${q.id}`)
      }
      return {
        id: `${page.case_id}-${q.id}`, domain: domains.find(([pattern]) => pattern.test(q.type))?.[1] ?? '治疗决策',
        prompt: q.question, context: [q.timepoint, q.phase].filter(Boolean).join(' · '),
        options: letters.map(letter => q.options[letter]), correctIndex: letters.indexOf(q.answer),
        explanation: q.explain, takeaways: [q.keyPoint], reference: { ...q.guidelineRef },
        evidence: { sourceTitle: q.guidelineRef.source_title, sourceVersion: q.guidelineRef.source_version,
          evidenceSummary: q.guidelineRef.evidence_summary },
      }
    }),
  }
}

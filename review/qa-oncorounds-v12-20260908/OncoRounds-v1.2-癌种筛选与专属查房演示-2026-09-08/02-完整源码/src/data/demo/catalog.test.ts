import { describe, expect, it } from 'vitest'
import { demoCases, externalDemoPairs, getDemoCase } from './catalog'
import { adaptDemoCase } from './adapter'
import { cancerCategories } from './types'
import { createInitialState, getScore, roundFlowReducer } from '../../state/roundFlow'

describe('local demonstration catalog', () => {
  it('contains nine paired five-question cases in the five requested categories', () => {
    expect(demoCases).toHaveLength(9)
    expect(new Set(demoCases.map(item => item.id)).size).toBe(9)
    expect(cancerCategories.map(category => demoCases.filter(item => item.category === category).length)).toEqual([2, 2, 2, 2, 1])
    expect(demoCases.every(item => item.questions.length === 5 && item.demoOnly)).toBe(true)
    expect(() => getDemoCase('missing')).toThrow('未知演示病例')
  })
  it.each(externalDemoPairs)('preserves every medical field for $page.case_id', ({ page, questions, category, cover }) => {
    const item = adaptDemoCase(page, questions, category, cover)
    expect(item.timeline).toEqual(page.overview.tabs.find(tab => tab.id === 'timeline')!.timeline_items)
    expect(item.summary).toEqual(page.overview.tabs.find(tab => tab.id === 'summary')!.summary_items!.map(({label, value}) => ({label, value})))
    item.questions.forEach((question, index) => {
      const raw = questions.questions[index]
      expect(question.prompt).toBe(raw.question)
      expect(question.explanation).toBe(raw.explain)
      expect(question.takeaways).toEqual([raw.keyPoint])
      expect(question.options[question.correctIndex]).toBe(raw.answer_text)
      expect(question.reference).toEqual(raw.guidelineRef)
    })
    const state = { ...createInitialState(item.id), answers: item.questions.map(q => q.correctIndex), isSubmitted: true }
    expect(getScore(state, 5, item).percent).toBe(100)
    expect(roundFlowReducer(state, {type:'finish-round'}, getDemoCase).screen).toBe('summary')
  })
  it('rejects mismatched pairs and incorrect answer contracts without repairing content', () => {
    const { page, questions, category, cover } = externalDemoPairs[0]
    expect(() => adaptDemoCase(page, {...questions, case_id: 'other'}, category, cover)).toThrow()
    const broken = structuredClone(questions)
    broken.questions[0].answer_text = 'invalid'
    expect(() => adaptDemoCase(page, broken, category, cover)).toThrow()
  })
})

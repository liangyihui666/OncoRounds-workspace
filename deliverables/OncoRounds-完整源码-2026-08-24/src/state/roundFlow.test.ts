import { createInitialState, getScore, roundFlowReducer } from './roundFlow'
import { publishedGrandRoundCases } from '../data/cases'

describe('roundFlowReducer', () => {
  it('moves through the complete round flow and scores submitted answers', () => {
    let state = createInitialState('lung-ros1')

    const publishedCase = publishedGrandRoundCases[0]
    state = roundFlowReducer(state, {
      type: 'select-case',
      caseId: publishedCase.id,
    })
    expect(state.currentCaseId).toBe('lung-ros1')

    state = roundFlowReducer(state, { type: 'open-case' })
    expect(state.screen).toBe('overview')

    state = roundFlowReducer(state, { type: 'start-round' })
    state = roundFlowReducer(state, {
      type: 'select-answer',
      answerIndex: publishedCase.questions[0].correctIndex,
    })
    state = roundFlowReducer(state, { type: 'submit-answer' })
    expect(state.answers).toEqual([publishedCase.questions[0].correctIndex])
    expect(state.isSubmitted).toBe(true)
    expect(getScore(state, 5)).toEqual({ correct: 1, total: 5, percent: 20 })

    state = roundFlowReducer(state, { type: 'next-question', questionCount: 5 })
    expect(state.questionIndex).toBe(1)
    expect(state.isSubmitted).toBe(false)

    state = roundFlowReducer(state, { type: 'select-answer', answerIndex: 1 })
    state = roundFlowReducer(state, { type: 'previous-question' })
    expect(state.questionIndex).toBe(0)
    expect(state.selectedAnswer).toBe(publishedCase.questions[0].correctIndex)
    expect(state.isSubmitted).toBe(true)

    state = roundFlowReducer(state, { type: 'next-question', questionCount: 5 })
    expect(state.questionIndex).toBe(1)
    expect(state.selectedAnswer).toBe(1)
    expect(state.isSubmitted).toBe(false)
  })

  it('guards invalid submissions and supports retry', () => {
    let state = createInitialState('lung-ros1')
    state = roundFlowReducer(state, { type: 'open-case' })
    state = roundFlowReducer(state, { type: 'start-round' })
    state = roundFlowReducer(state, { type: 'submit-answer' })
    expect(state.answers).toHaveLength(0)

    state = roundFlowReducer(state, { type: 'select-answer', answerIndex: 2 })
    state = roundFlowReducer(state, { type: 'submit-answer' })
    state = roundFlowReducer(state, { type: 'finish-round' })
    expect(state.screen).toBe('summary')

    state = roundFlowReducer(state, { type: 'retry' })
    expect(state.screen).toBe('overview')
    expect(state.answers).toHaveLength(0)
  })
})

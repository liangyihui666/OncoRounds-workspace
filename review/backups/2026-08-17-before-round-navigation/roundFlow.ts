import { getCaseById } from '../data/cases'

export type AppScreen = 'home' | 'overview' | 'round' | 'summary'

export interface RoundFlowState {
  screen: AppScreen
  currentCaseId: string
  questionIndex: number
  selectedAnswer: number | null
  answers: number[]
  isSubmitted: boolean
}

export type RoundFlowAction =
  | { type: 'select-case'; caseId: string }
  | { type: 'open-case' }
  | { type: 'go-home' }
  | { type: 'start-round' }
  | { type: 'select-answer'; answerIndex: number }
  | { type: 'submit-answer' }
  | { type: 'next-question'; questionCount: number }
  | { type: 'finish-round' }
  | { type: 'retry' }
  | { type: 'next-case'; caseId: string }

export function createInitialState(currentCaseId: string): RoundFlowState {
  return {
    screen: 'home',
    currentCaseId,
    questionIndex: 0,
    selectedAnswer: null,
    answers: [],
    isSubmitted: false,
  }
}

const resetRound = (state: RoundFlowState): RoundFlowState => ({
  ...state,
  questionIndex: 0,
  selectedAnswer: null,
  answers: [],
  isSubmitted: false,
})

export function roundFlowReducer(
  state: RoundFlowState,
  action: RoundFlowAction,
): RoundFlowState {
  switch (action.type) {
    case 'select-case':
      return resetRound({ ...state, currentCaseId: action.caseId })
    case 'open-case':
      return { ...state, screen: 'overview' }
    case 'go-home':
      return { ...resetRound(state), screen: 'home' }
    case 'start-round':
      return { ...resetRound(state), screen: 'round' }
    case 'select-answer':
      if (state.isSubmitted) return state
      return { ...state, selectedAnswer: action.answerIndex }
    case 'submit-answer':
      if (state.selectedAnswer === null || state.isSubmitted) return state
      return {
        ...state,
        answers: [...state.answers, state.selectedAnswer],
        isSubmitted: true,
      }
    case 'next-question':
      if (!state.isSubmitted || state.questionIndex >= action.questionCount - 1) {
        return state
      }
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        selectedAnswer: null,
        isSubmitted: false,
      }
    case 'finish-round':
      if (!state.isSubmitted) return state
      return { ...state, screen: 'summary' }
    case 'retry':
      return { ...resetRound(state), screen: 'overview' }
    case 'next-case':
      return {
        ...createInitialState(action.caseId),
        screen: 'overview',
      }
    default:
      return state
  }
}

export function getScore(state: RoundFlowState, questionCount: number) {
  const currentCase = getCaseById(state.currentCaseId)
  const correct = state.answers.reduce((total, answer, index) => {
    return total + (currentCase.questions[index]?.correctIndex === answer ? 1 : 0)
  }, 0)
  const total = questionCount
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  }
}

import { demoCases, getDemoCase } from '../data/demo/catalog'
import type { CancerCategory } from '../data/demo/types'
import { createInitialState, roundFlowReducer, type RoundFlowAction, type RoundFlowState } from './roundFlow'

export type HomeTab = 'plaza' | 'mine'
export type DemoOutcome = 'success' | 'upload' | 'parse' | 'generate' | 'timeout'
export interface GenerationTask {
  id: number; caseId: string; stage: number; outcome: DemoOutcome
  status: 'running' | 'success' | 'failed'
}
export interface PrivateRound {
  id: number; caseId: string; status: 'pending' | 'in-progress' | 'completed'
  snapshot: RoundFlowState
}
export interface DemoExperience {
  tab: HomeTab; category: CancerCategory; selectedCaseId: string; round: RoundFlowState
  activeRecordId: number | null; records: PrivateRound[]; task: GenerationTask | null
  sequence: number; completionId: number | null; bannerId: number | null
}
export const createDemoExperience = (): DemoExperience => ({
  tab: 'plaza', category: '肺癌', selectedCaseId: demoCases[0].id,
  round: createInitialState(demoCases[0].id), activeRecordId: null, records: [],
  task: null, sequence: 0, completionId: null, bannerId: null,
})
export type DemoAction =
  | { type: 'tab'; tab: HomeTab }
  | { type: 'category'; category: CancerCategory }
  | { type: 'select'; caseId: string }
  | { type: 'start-public' }
  | { type: 'open-record'; id: number }
  | { type: 'round'; action: RoundFlowAction }
  | { type: 'generate'; caseId: string; outcome: DemoOutcome }
  | { type: 'tick'; taskId: number }
  | { type: 'dismiss-completion' }
  | { type: 'dismiss-banner' }
  | { type: 'dismiss-task' }

export function demoExperienceReducer(state: DemoExperience, action: DemoAction): DemoExperience {
  switch (action.type) {
    case 'tab': return { ...state, tab: action.tab }
    case 'category': return { ...state, category: action.category, selectedCaseId: demoCases.find(item => item.category === action.category)!.id }
    case 'select': {
      const item = getDemoCase(action.caseId)
      return { ...state, category: item.category, selectedCaseId: item.id }
    }
    case 'start-public': return { ...state, activeRecordId: null, round: { ...createInitialState(state.selectedCaseId), screen: 'overview' } }
    case 'open-record': {
      const record = state.records.find(record => record.id === action.id)
      if (!record) return state
      return { ...state, activeRecordId: record.id, round: { ...record.snapshot },
        completionId: null, bannerId: state.bannerId === record.id ? null : state.bannerId }
    }
    case 'round': {
      const record = state.records.find(record => record.id === state.activeRecordId)
      if (action.action.type === 'go-home') {
        return { ...state, tab: record ? 'mine' : state.tab, activeRecordId: null,
          round: createInitialState(state.selectedCaseId) }
      }
      const round = roundFlowReducer(state.round, action.action, getDemoCase)
      return { ...state, round,
        selectedCaseId: record ? state.selectedCaseId : round.currentCaseId,
        records: record ? state.records.map(item => item.id === record.id
          ? { ...item, snapshot: round, status: round.screen === 'summary' ? 'completed' : round.screen === 'round' ? 'in-progress' : 'pending' }
          : item) : state.records,
      }
    }
    case 'generate': {
      if (state.task?.status === 'running') return state
      getDemoCase(action.caseId)
      const id = state.sequence + 1
      return { ...state, sequence: id, completionId: null, task: {
        id, caseId: action.caseId, stage: 0, status: 'running', outcome: action.outcome,
      } }
    }
    case 'tick': {
      const task = state.task
      if (!task || task.id !== action.taskId || task.status !== 'running') return state
      const failAt = { success: 3, upload: 0, parse: 1, generate: 2, timeout: 2 }[task.outcome]
      if (task.outcome !== 'success' && task.stage >= failAt) {
        return { ...state, task: { ...task, status: 'failed' } }
      }
      if (task.stage < 2) return { ...state, task: { ...task, stage: task.stage + 1 } }
      const record: PrivateRound = { id: task.id, caseId: task.caseId, status: 'pending',
        snapshot: { ...createInitialState(task.caseId), screen: 'overview' } }
      return { ...state, task: { ...task, stage: 3, status: 'success' },
        records: [...state.records, record], completionId: task.id, bannerId: task.id }
    }
    case 'dismiss-completion': return { ...state, completionId: null }
    case 'dismiss-banner': return { ...state, bannerId: null }
    case 'dismiss-task': return state.task?.status === 'running' ? state : { ...state, task: null }
  }
}

import { useEffect, useReducer } from 'react'
import { getCaseById, publishedGrandRoundCases } from './data/cases'
import { CaseOverview } from './components/CaseOverview'
import { HomeScreen } from './components/HomeScreen'
import { RoundSession } from './components/RoundSession'
import { RoundSummary } from './components/RoundSummary'
import { createInitialState, roundFlowReducer } from './state/roundFlow'

export default function App() {
  const defaultCase = publishedGrandRoundCases[0]
  const [state, dispatch] = useReducer(
    roundFlowReducer,
    createInitialState(defaultCase.id),
  )
  const currentCase = getCaseById(state.currentCaseId)
  const currentCaseIndex = publishedGrandRoundCases.findIndex(
    (item) => item.id === currentCase.id,
  )
  const nextCase = publishedGrandRoundCases[currentCaseIndex + 1]

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.screen, state.currentCaseId])

  return (
    <div className="app-canvas">
      <div className="aurora aurora-one" aria-hidden="true" />
      <div className="aurora aurora-two" aria-hidden="true" />
      <div className="app-frame">
        {state.screen === 'home' && (
          <HomeScreen
            cases={publishedGrandRoundCases}
            featuredCase={currentCase}
            onSelectCase={(caseId) =>
              dispatch({ type: 'select-case', caseId })
            }
            onStart={() => {
              dispatch({ type: 'open-case' })
            }}
          />
        )}

        {state.screen === 'overview' && (
          <CaseOverview
            clinicalCase={currentCase}
            onBack={() => dispatch({ type: 'go-home' })}
            onStart={() => dispatch({ type: 'start-round' })}
          />
        )}

        {state.screen === 'round' && (
          <RoundSession
            clinicalCase={currentCase}
            state={state}
            dispatch={dispatch}
          />
        )}

        {state.screen === 'summary' && (
          <RoundSummary
            clinicalCase={currentCase}
            state={state}
            onRetry={() => dispatch({ type: 'retry' })}
            onNext={nextCase
              ? () => dispatch({ type: 'next-case', caseId: nextCase.id })
              : undefined}
          />
        )}
      </div>
    </div>
  )
}

import { render, screen } from '@testing-library/react'
import { grandRoundCases } from '../data/cases'
import type { RoundFlowState } from '../state/roundFlow'
import { RoundSummary } from './RoundSummary'

describe('RoundSummary', () => {
  it('shows a single percentage score instead of separate correct and total values', () => {
    const clinicalCase = grandRoundCases[0]
    const state: RoundFlowState = {
      screen: 'summary',
      currentCaseId: clinicalCase.id,
      questionIndex: clinicalCase.questions.length - 1,
      selectedAnswer: clinicalCase.questions.at(-1)?.correctIndex ?? null,
      answers: clinicalCase.questions.map((question, index) =>
        index === 0 ? question.correctIndex : (question.correctIndex + 1) % 4,
      ),
      isSubmitted: true,
    }

    render(
      <RoundSummary
        clinicalCase={clinicalCase}
        state={state}
        onRetry={() => undefined}
        onNext={() => undefined}
      />,
    )

    const score = screen.getByLabelText('查房得分 20分')
    expect(score).toHaveTextContent('20分')
    expect(score).not.toHaveTextContent('/ 5')
    expect(screen.queryByText(/本次查房得分/)).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '得分进度' })).toHaveAttribute(
      'aria-valuenow',
      '20',
    )
    expect(document.querySelector('.score-ring-progress')).toHaveStyle({
      strokeDashoffset: '80',
    })
  })

  it('marks a perfect score as a complete progress ring', () => {
    const clinicalCase = grandRoundCases[0]
    const state: RoundFlowState = {
      screen: 'summary',
      currentCaseId: clinicalCase.id,
      questionIndex: clinicalCase.questions.length - 1,
      selectedAnswer: clinicalCase.questions.at(-1)?.correctIndex ?? null,
      answers: clinicalCase.questions.map((question) => question.correctIndex),
      isSubmitted: true,
    }

    render(
      <RoundSummary
        clinicalCase={clinicalCase}
        state={state}
        onRetry={() => undefined}
        onNext={() => undefined}
      />,
    )

    expect(screen.getByLabelText('查房得分 100分')).toHaveClass('is-complete')
  })

  it('hides the next-case action when only ROS1 is published', () => {
    const clinicalCase = grandRoundCases[0]
    const state: RoundFlowState = {
      screen: 'summary',
      currentCaseId: clinicalCase.id,
      questionIndex: clinicalCase.questions.length - 1,
      selectedAnswer: clinicalCase.questions.at(-1)?.correctIndex ?? null,
      answers: clinicalCase.questions.map((question) => question.correctIndex),
      isSubmitted: true,
    }

    render(
      <RoundSummary
        clinicalCase={clinicalCase}
        state={state}
        onRetry={() => undefined}
      />,
    )

    expect(screen.queryByRole('button', { name: /下一病例/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /再查一次/ })).toBeInTheDocument()
  })
})

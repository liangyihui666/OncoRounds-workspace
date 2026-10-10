import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ClipboardText,
  House,
  Lightbulb,
  Quotes,
  X,
  XCircle,
} from '@phosphor-icons/react'
import { useEffect, useRef, type Dispatch } from 'react'
import type { GrandRoundCase } from '../data/types'
import type { RoundFlowAction, RoundFlowState } from '../state/roundFlow'
import { ActionButton, ScreenFooter } from './Ui'

interface RoundSessionProps {
  clinicalCase: GrandRoundCase
  state: RoundFlowState
  dispatch: Dispatch<RoundFlowAction>
}

export function RoundSession({
  clinicalCase,
  state,
  dispatch,
}: RoundSessionProps) {
  const question = clinicalCase.questions[state.questionIndex]
  const progress = ((state.questionIndex + 1) / clinicalCase.questions.length) * 100
  const isCorrect = state.selectedAnswer === question.correctIndex
  const isLast = state.questionIndex === clinicalCase.questions.length - 1
  const feedbackRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.questionIndex])

  useEffect(() => {
    if (!state.isSubmitted) return
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    feedbackRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [state.isSubmitted, question.id])

  return (
    <main className="screen round-screen">
      <header className="round-header">
        <button
          type="button"
          className="round-home-button"
          onClick={() => dispatch({ type: 'go-home' })}
        >
          <House weight="bold" aria-hidden="true" />
          <span>返回主页</span>
        </button>
        <div className="round-progress-copy">
          <span>{clinicalCase.shortTitle}</span>
          <strong>
            {state.questionIndex + 1} / {clinicalCase.questions.length}
          </strong>
        </div>
        <span className="live-dot" aria-label="模拟查房进行中" />
      </header>

      <div className="progress-track" aria-label={`查房进度 ${Math.round(progress)}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="question-card">
        <div className="question-kicker">
          <span>
            <Quotes weight="fill" /> 主任提问
          </span>
          <span className="domain-chip">{question.domain}</span>
        </div>
        <h1>{question.prompt}</h1>
        <div className="question-context">
          <ClipboardText weight="duotone" />
          <p>{question.context}</p>
        </div>
      </section>

      <fieldset className="answer-list" disabled={state.isSubmitted}>
        <legend>请选择最合适的答案</legend>
        {question.options.map((option, index) => {
          const isSelected = state.selectedAnswer === index
          const isRightOption = state.isSubmitted && question.correctIndex === index
          const isWrongSelection = state.isSubmitted && isSelected && !isCorrect
          return (
            <label
              className={`answer-option${isSelected ? ' is-selected' : ''}${
                isRightOption ? ' is-correct' : ''
              }${isWrongSelection ? ' is-wrong' : ''}`}
              key={option}
            >
              <input
                type="radio"
                name={`answer-${question.id}`}
                checked={isSelected}
                onChange={() =>
                  dispatch({ type: 'select-answer', answerIndex: index })
                }
              />
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-copy">{option}</span>
              <span className="option-state" aria-hidden="true">
                {isRightOption ? (
                  <Check weight="bold" />
                ) : isWrongSelection ? (
                  <X weight="bold" />
                ) : null}
              </span>
            </label>
          )
        })}
      </fieldset>

      {state.isSubmitted && (
        <section
          ref={feedbackRef}
          className={`explanation-panel ${isCorrect ? 'is-correct' : 'is-wrong'}`}
          aria-live="polite"
        >
          <div className="result-line">
            {isCorrect ? (
              <CheckCircle weight="fill" />
            ) : (
              <XCircle weight="fill" />
            )}
            <div>
              <span>{isCorrect ? '回答正确' : '回答错误'}</span>
              <strong>{isCorrect ? '判断很稳，继续保持' : '看一下这一步的临床思路'}</strong>
            </div>
          </div>
          <div className="analysis-copy">
            <h2>主任解析</h2>
            <p>{question.explanation}</p>
          </div>
          <div className="takeaway-box">
            <Lightbulb weight="duotone" />
            <div>
              <strong>临床要点</strong>
              <ul>
                {question.takeaways.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="evidence-line">依据：{question.evidence}</p>
        </section>
      )}

      <ScreenFooter>
        <div className="round-footer-actions">
          <ActionButton
            tone="secondary"
            className="previous-question-button"
            disabled={state.questionIndex === 0}
            onClick={() => dispatch({ type: 'previous-question' })}
          >
            <ArrowLeft weight="bold" aria-hidden="true" /> 上一题
          </ActionButton>
          {!state.isSubmitted ? (
            <ActionButton
              disabled={state.selectedAnswer === null}
              onClick={() => dispatch({ type: 'submit-answer' })}
            >
              提交答案
            </ActionButton>
          ) : isLast ? (
            <ActionButton onClick={() => dispatch({ type: 'finish-round' })} withArrow>
              查看查房总结
            </ActionButton>
          ) : (
            <ActionButton
              onClick={() =>
                dispatch({
                  type: 'next-question',
                  questionCount: clinicalCase.questions.length,
                })
              }
            >
              下一题 <ArrowRight weight="bold" aria-hidden="true" />
            </ActionButton>
          )}
        </div>
      </ScreenFooter>
    </main>
  )
}

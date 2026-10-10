import {
  ArrowClockwise,
  ArrowRight,
  Check,
  House,
  Sparkle,
  TrendUp,
  X,
} from '@phosphor-icons/react'
import type { GrandRoundCase } from '../data/types'
import { getScore, type RoundFlowState } from '../state/roundFlow'
import { ActionButton } from './Ui'

interface RoundSummaryProps {
  clinicalCase: GrandRoundCase
  state: RoundFlowState
  onHome: () => void
  onRetry: () => void
  onNext?: () => void
}

export function RoundSummary({
  clinicalCase,
  state,
  onHome,
  onRetry,
  onNext,
}: RoundSummaryProps) {
  const score = getScore(state, clinicalCase.questions.length)
  const ringGradientId = `score-ring-gradient-${clinicalCase.id}`
  const performance =
    score.percent >= 80
      ? '临床思路清晰，关键节点判断稳健'
      : score.percent >= 60
        ? '整体路径正确，个别节点值得再复盘'
        : '建议沿病程轴重新梳理决策依据'

  const domains = Array.from(
    new Set(clinicalCase.questions.map((question) => question.domain)),
  ).map((domain) => {
    const related = clinicalCase.questions
      .map((question, index) => ({ question, index }))
      .filter((item) => item.question.domain === domain)
    const correct = related.filter(
      (item) => state.answers[item.index] === item.question.correctIndex,
    ).length
    return {
      domain,
      percent: Math.round((correct / related.length) * 100),
    }
  })

  return (
    <main className="screen summary-screen">
      <header className="summary-header">
        <button type="button" className="summary-home-button" onClick={onHome}>
          <House weight="bold" aria-hidden="true" />
          <span>返回主页</span>
        </button>
      </header>

      <section className="score-hero">
        <div
          className={`score-orbit${score.percent === 100 ? ' is-complete' : ''}`}
          style={{ '--score': `${score.percent}%` } as React.CSSProperties}
          aria-label={`查房得分 ${score.percent}分`}
        >
          <svg
            className="score-ring"
            viewBox="0 0 120 120"
            role="progressbar"
            aria-label="得分进度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score.percent}
          >
            <defs>
              <linearGradient id={ringGradientId} x1="16" y1="16" x2="104" y2="104">
                <stop offset="0%" stopColor="#4c8df6" />
                <stop offset="52%" stopColor="#675ee8" />
                <stop offset="100%" stopColor="#2fc6b7" />
              </linearGradient>
            </defs>
            <circle className="score-ring-track" cx="60" cy="60" r="50" pathLength="100" />
            <circle
              className="score-ring-progress"
              cx="60"
              cy="60"
              r="50"
              pathLength="100"
              stroke={`url(#${ringGradientId})`}
              style={{ strokeDashoffset: `${100 - score.percent}` }}
            />
          </svg>
          <div className="score-core">
            <span>{score.percent}</span>
            <small>分</small>
          </div>
          <Sparkle className="score-spark score-spark-one" weight="fill" />
          <Sparkle className="score-spark score-spark-two" weight="fill" />
        </div>
        <h1>查房总结</h1>
        <p>{performance}</p>
      </section>

      <section className="ability-card">
        <div className="summary-section-title">
          <div>
            <h2>能力维度</h2>
          </div>
          <TrendUp weight="duotone" />
        </div>
        <div className="ability-list">
          {domains.map((item) => (
            <div className="ability-item" key={item.domain}>
              <div>
                <span>{item.domain}</span>
                <strong>{item.percent}%</strong>
              </div>
              <div className="ability-track">
                <span style={{ width: `${item.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="review-section">
        <div className="summary-section-title">
          <div>
            <h2>关键决策复盘</h2>
          </div>
        </div>
        <div className="review-list">
          {clinicalCase.questions.map((question, index) => {
            const isCorrect = state.answers[index] === question.correctIndex
            return (
              <article className="review-item" key={question.id}>
                <span className={isCorrect ? 'review-correct' : 'review-wrong'}>
                  {isCorrect ? <Check weight="bold" /> : <X weight="bold" />}
                </span>
                <div>
                  <span>
                    决策 {String(index + 1).padStart(2, '0')} · {question.domain}
                  </span>
                  <p>{question.prompt}</p>
                  <small>正确答案：{question.options[question.correctIndex]}</small>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="summary-actions">
        <ActionButton tone="secondary" onClick={onRetry}>
          <ArrowClockwise weight="bold" /> 再查一次
        </ActionButton>
        {onNext && (
          <ActionButton onClick={onNext}>
            下一病例 <ArrowRight weight="bold" />
          </ActionButton>
        )}
      </div>
      <p className="summary-disclaimer">病例内容经教学化整理 · 请结合规范指南与个体情况决策</p>
    </main>
  )
}

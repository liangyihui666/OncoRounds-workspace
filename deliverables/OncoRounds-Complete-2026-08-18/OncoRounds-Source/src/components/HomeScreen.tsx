import { Fire } from '@phosphor-icons/react'
import { useRef, type KeyboardEvent, type TouchEvent } from 'react'
import type { GrandRoundCase } from '../data/types'
import { ActionButton, BrandLockup } from './Ui'

interface HomeScreenProps {
  cases: GrandRoundCase[]
  featuredCase: GrandRoundCase
  onSelectCase: (caseId: string) => void
  onStart: () => void
}

export function HomeScreen({
  cases,
  featuredCase,
  onSelectCase,
  onStart,
}: HomeScreenProps) {
  const isRos1 = featuredCase.id === 'lung-ros1'
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const activeCaseIndex = Math.max(
    0,
    cases.findIndex((item) => item.id === featuredCase.id),
  )
  const previousCaseIndex =
    cases.length > 0 ? (activeCaseIndex - 1 + cases.length) % cases.length : 0
  const nextCaseIndex =
    cases.length > 0 ? (activeCaseIndex + 1) % cases.length : 0
  const getDisplayTitle = (item: GrandRoundCase) =>
    `${item.shortTitle}${item.id === 'lung-ros1' ? '精准治疗' : ''}`

  const selectRelativeCase = (offset: -1 | 1) => {
    if (cases.length < 2) return
    const nextIndex = (activeCaseIndex + offset + cases.length) % cases.length
    onSelectCase(cases[nextIndex].id)
  }

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (!touch) return
    swipeStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = swipeStart.current
    const touch = event.changedTouches[0]
    swipeStart.current = null
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return
    selectRelativeCase(deltaX < 0 ? 1 : -1)
  }

  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      selectRelativeCase(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      selectRelativeCase(1)
    }
  }

  return (
    <main className="screen home-screen">
      <header className="home-header">
        <BrandLockup home />
      </header>

      <section
        className="featured-case-section"
        aria-labelledby="featured-case-title"
      >
        <div className="featured-case-label">
          <span className="featured-case-label-copy">
            <Fire weight="fill" aria-hidden="true" />
            今日推荐病例
          </span>
        </div>

        <div
          className="featured-case-deck"
          role="group"
          aria-label={`病例轮播：${getDisplayTitle(featuredCase)}`}
          aria-roledescription="病例轮播"
          tabIndex={cases.length > 1 ? 0 : undefined}
          onKeyDown={handleCarouselKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            swipeStart.current = null
          }}
        >
          {cases.length > 1 &&
            cases.map((item, index) => {
              if (index === activeCaseIndex) return null
              const position =
                index === previousCaseIndex
                  ? 'is-previous'
                  : index === nextCaseIndex
                    ? 'is-next'
                    : ''
              if (!position) return null

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`featured-case-preview ${position}`}
                  aria-label={`${position === 'is-previous' ? '查看上一个病例' : '查看下一个病例'}：${getDisplayTitle(item)}`}
                  onClick={() => onSelectCase(item.id)}
                >
                  <img src={item.image} alt="" />
                  <span className="featured-case-preview-copy">
                    <strong>{getDisplayTitle(item)}</strong>
                    <small>{item.cancerType} · {item.difficulty}难度</small>
                  </span>
                </button>
              )
            })}

          <article key={featuredCase.id} className="featured-case-card">
            <div className="featured-case-art">
              <img
                src={featuredCase.image}
                alt={`${featuredCase.shortTitle}病例主题图`}
              />
            </div>
            <div className="featured-case-copy">
              <h2 id="featured-case-title">{getDisplayTitle(featuredCase)}</h2>
              <div className="featured-case-chips" aria-label="病例信息">
                <span>{featuredCase.cancerType}</span>
                <span>{featuredCase.difficulty}难度</span>
              </div>
              <p>{isRos1
                ? '一例 ROS1 融合阳性肺腺癌患者的诊断思路、耐药再活检与靶向治疗决策。'
                : featuredCase.subtitle}</p>
            </div>
          </article>
        </div>
      </section>

      <div className="home-actions">
        <ActionButton onClick={onStart} withArrow>
          开始查房
        </ActionButton>
        <div className="learning-disclaimer">
          <span>基于典型病例 · 训练临床决策</span>
          <span>内容仅用于医学学习</span>
        </div>
      </div>
    </main>
  )
}

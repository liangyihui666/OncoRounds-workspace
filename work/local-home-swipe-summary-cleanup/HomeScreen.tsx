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

  const selectRelativeCase = (offset: -1 | 1) => {
    const nextIndex = activeCaseIndex + offset
    if (nextIndex < 0 || nextIndex >= cases.length) return
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
          {cases.length > 1 && <span className="home-swipe-hint">左右滑动切换</span>}
        </div>

        {cases.length > 1 && (
          <div className="home-case-switcher" role="tablist" aria-label="选择病例">
            {cases.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === featuredCase.id}
                className={item.id === featuredCase.id ? 'is-active' : ''}
                onClick={() => onSelectCase(item.id)}
              >
                {item.cancerType}
              </button>
            ))}
          </div>
        )}

        <article
          key={featuredCase.id}
          className="featured-case-card"
          role="group"
          aria-label={`病例 ${activeCaseIndex + 1}/${cases.length}：${featuredCase.shortTitle}`}
          aria-roledescription="病例轮播"
          tabIndex={cases.length > 1 ? 0 : undefined}
          onKeyDown={handleCarouselKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            swipeStart.current = null
          }}
        >
          <div className="featured-case-art" aria-hidden="true">
            <img src={featuredCase.image} alt="" />
          </div>
          <div className="featured-case-copy">
            <h2 id="featured-case-title">
              {featuredCase.shortTitle}{isRos1 ? '精准治疗' : ''}
            </h2>
            <div className="featured-case-chips" aria-label="病例信息">
              <span>{featuredCase.cancerType}</span>
              <span>{featuredCase.difficulty}难度</span>
            </div>
            <p>{isRos1
              ? '一例 ROS1 融合阳性肺腺癌患者的诊断思路、耐药再活检与靶向治疗决策。'
              : featuredCase.subtitle}</p>
          </div>
        </article>
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

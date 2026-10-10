import { Plus, ArrowRight } from '@phosphor-icons/react'
import { useEffect, useRef, type KeyboardEvent, type TouchEvent } from 'react'
import { cancerCategories, type CancerCategory, type DisplayCase } from '../data/demo/types'
import type { HomeTab } from '../state/demoExperience'
import type { ReactNode } from 'react'
import { ActionButton, BrandLockup } from './Ui'

interface HomeScreenProps {
  cases: DisplayCase[]
  featuredCase: DisplayCase
  category: CancerCategory
  onCategory: (category: CancerCategory) => void
  tab: HomeTab
  onTab: (tab: HomeTab) => void
  onUpload: () => void
  privateContent: ReactNode
  onSelectCase: (caseId: string) => void
  onStart: () => void
}

export function HomeScreen({
  cases,
  featuredCase,
  onSelectCase,
  onStart,
  category, onCategory, tab, onTab, onUpload, privateContent,
}: HomeScreenProps) {
  const isRos1 = featuredCase.id === 'lung-ros1'
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const categoryBar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = categoryBar.current
    const selected = bar?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!bar || !selected) return
    const relativeLeft = selected.getBoundingClientRect().left - bar.getBoundingClientRect().left
    bar.scrollTo?.({ left: bar.scrollLeft + relativeLeft - (bar.clientWidth - selected.offsetWidth) / 2 })
  }, [category, tab])
  const activeCaseIndex = Math.max(
    0,
    cases.findIndex((item) => item.id === featuredCase.id),
  )
  const previousCaseIndex =
    cases.length > 0 ? (activeCaseIndex - 1 + cases.length) % cases.length : 0
  const nextCaseIndex =
    cases.length > 0 ? (activeCaseIndex + 1) % cases.length : 0
  const getDisplayTitle = (item: DisplayCase) =>
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
    <main className="screen home-screen series-home">
      <header className="home-header">
        <BrandLockup home />
      </header>
      <div className="home-tabs" role="tablist" aria-label="首页栏目">
        <button type="button" role="tab" aria-selected={tab === 'plaza'} aria-controls="home-panel"
          id="plaza-tab" onClick={() => onTab('plaza')}>病例广场</button>
        <button type="button" role="tab" aria-selected={tab === 'mine'} aria-controls="home-panel"
          id="mine-tab" onClick={() => onTab('mine')}>专属查房</button>
      </div>
      <div id="home-panel" role="tabpanel" aria-labelledby={tab === 'plaza' ? 'plaza-tab' : 'mine-tab'}>
      {tab === 'plaza' ? <>

      <section
        className="featured-case-section"
        aria-labelledby="featured-case-title"
      >
        <div ref={categoryBar} className="cancer-tabs" role="group" aria-label="按癌种筛选">
          {cancerCategories.map(value => <button key={value} type="button"
            aria-pressed={category === value} onClick={() => onCategory(value)}>{value}</button>)}
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
            (['is-previous', 'is-next'] as const).map(position => {
              const item = cases[position === 'is-previous' ? previousCaseIndex : nextCaseIndex]

              return (
                <button
                  key={position}
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
      <button type="button" className="create-round-entry" onClick={onUpload}>
        <Plus className="create-round-plus" aria-hidden="true" />
        <span><strong>创建专属查房</strong><small>选择病例资料，体验专属查房流程</small></span>
        <ArrowRight aria-hidden="true" />
      </button>
      </> : privateContent}
      </div>
      <p className="demo-footnote">本地交互演示 · 刷新后专属记录清空</p>
    </main>
  )
}

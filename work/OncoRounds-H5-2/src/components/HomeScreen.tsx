import { Fire } from '@phosphor-icons/react'
import type { GrandRoundCase } from '../data/types'
import { ActionButton, BrandLockup } from './Ui'

interface HomeScreenProps {
  featuredCase: GrandRoundCase
  onStart: () => void
}

export function HomeScreen({ featuredCase, onStart }: HomeScreenProps) {
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
          <Fire weight="fill" aria-hidden="true" />
          今日推荐病例
        </div>

        <article className="featured-case-card">
          <div className="featured-case-art" aria-hidden="true">
            <img src={featuredCase.image} alt="" />
          </div>
          <div className="featured-case-copy">
            <h2 id="featured-case-title">
              {featuredCase.shortTitle}精准治疗
            </h2>
            <div className="featured-case-chips" aria-label="病例信息">
              <span>{featuredCase.cancerType}</span>
              <span>{featuredCase.difficulty}难度</span>
              <span>预计 {featuredCase.minutes} 分钟</span>
            </div>
            <p>
              一例 ROS1
              融合阳性肺腺癌患者的诊断思路、耐药再活检与靶向治疗决策。
            </p>
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

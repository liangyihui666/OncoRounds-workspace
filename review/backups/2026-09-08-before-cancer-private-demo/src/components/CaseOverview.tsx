import {
  ArrowLeft,
  BookOpenText,
  FirstAidKit,
} from '@phosphor-icons/react'
import type { GrandRoundCase } from '../data/types'
import { ActionButton, BrandLockup, ScreenFooter } from './Ui'

interface CaseOverviewProps {
  clinicalCase: GrandRoundCase
  onBack: () => void
  onStart: () => void
}

export function CaseOverview({
  clinicalCase,
  onBack,
  onStart,
}: CaseOverviewProps) {
  return (
    <main className="screen overview-screen">
      <header className="inner-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="返回首页">
          <ArrowLeft weight="bold" />
        </button>
        <BrandLockup compact />
        <span className="header-step">病例</span>
      </header>

      <section className={`overview-hero case-${clinicalCase.color}`}>
        <img src={clinicalCase.image} alt="" />
        <div className="overview-hero-shade" />
        <div className="overview-hero-content">
          <div className="hero-badges">
            <span>{clinicalCase.cancerType}</span>
            <span>{clinicalCase.difficulty}</span>
          </div>
          <h1>{clinicalCase.title}</h1>
          <p>{clinicalCase.subtitle}</p>
        </div>
      </section>

      <div className="overview-section-intro">
        <BookOpenText weight="duotone" aria-hidden="true" />
        <div>
          <h2>病例摘要</h2>
          <p>完整治疗路径与后续结局将在完成 5 个决策点后揭晓</p>
        </div>
      </div>

      <section className="summary-list" aria-label="病例摘要">
        {clinicalCase.summary.map((item, index) => (
          <article className="clinical-info-card" key={item.label}>
            <span className="info-index">0{index + 1}</span>
            <div>
              <h2>{item.label}</h2>
              <p>{item.value}</p>
            </div>
          </article>
        ))}
      </section>

      <ScreenFooter>
        <ActionButton onClick={onStart} withArrow>
          开始模拟查房
        </ActionButton>
        <p>
          <FirstAidKit weight="duotone" /> 共 {clinicalCase.questions.length} 个临床决策点
        </p>
      </ScreenFooter>
    </main>
  )
}

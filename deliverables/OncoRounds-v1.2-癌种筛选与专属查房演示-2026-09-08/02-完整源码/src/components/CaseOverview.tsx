import {
  ArrowLeft,
  FirstAidKit,
} from '@phosphor-icons/react'
import type { DisplayCase } from '../data/demo/types'
import { CaseDetails } from './CaseDetails'
import { ActionButton, BrandLockup, ScreenFooter } from './Ui'

interface CaseOverviewProps {
  clinicalCase: DisplayCase
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
        <img src={clinicalCase.image} alt={clinicalCase.imageAlt ?? `${clinicalCase.shortTitle}病例主题图`} />
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

      <CaseDetails clinicalCase={clinicalCase} />

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

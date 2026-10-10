import { useId, useState } from 'react'
import { BookOpenText, CalendarDots } from '@phosphor-icons/react'
import type { DisplayCase } from '../data/demo/types'

export function CaseDetails({ clinicalCase }: { clinicalCase: DisplayCase }) {
  const [tab, setTab] = useState<'summary' | 'timeline'>('summary')
  const id = useId()
  return <>
    <div className="segmented-tabs" role="tablist" aria-label="病例信息">
      {(['summary', 'timeline'] as const).map(value => <button key={value} type="button" role="tab"
        id={id + value} aria-controls={id + '-panel'} aria-selected={tab === value} className={tab === value ? 'is-active' : ''}
        onClick={() => setTab(value)}>
        {value === 'summary' ? <BookOpenText /> : <CalendarDots />}
        {value === 'summary' ? '病例摘要' : '病程轴'}
      </button>)}
    </div>
    <div role="tabpanel" id={id + '-panel'} aria-labelledby={id + tab}>
      {tab === 'summary' ? <>
        <section className="summary-list" aria-label="病例摘要">
          {clinicalCase.summary.map((item, index) => <article className="clinical-info-card" key={item.label}>
            <span className="info-index">{String(index + 1).padStart(2, '0')}</span>
            <div><h2>{item.label}</h2><p>{item.value}</p></div>
          </article>)}
        </section>
        {clinicalCase.contentImages?.map(media => <figure className="case-content-image" key={media.src}>
          <img src={media.src} alt={media.alt} loading="lazy" />
          <figcaption>{media.alt} <a href={media.sourceUrl} target="_blank" rel="noreferrer">原图</a></figcaption>
        </figure>)}
      </> : <section className="timeline" aria-label="病程轴">
        {clinicalCase.timeline.map((item, index) => <article className="timeline-item" key={index}>
          <div className="timeline-marker" aria-hidden="true" />
          <div className="timeline-date">{item.date}</div>
          <div className="timeline-card"><h2>{item.title}</h2><p>{item.detail}</p></div>
        </article>)}
      </section>}
    </div>
  </>
}

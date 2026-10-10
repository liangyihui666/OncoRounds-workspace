import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight, Atom, Sparkle } from '@phosphor-icons/react'

export function BrandLockup({
  compact = false,
  home = false,
}: {
  compact?: boolean
  home?: boolean
}) {
  return (
    <div
      className={`brand-lockup${compact ? ' is-compact' : ''}${home ? ' is-home' : ''}`}
    >
      {home ? (
        <>
          <img
            className="home-brand-mark"
            src="./assets/brand/oncorounds-orb.png"
            alt=""
          />
          <div className="home-brand-copy">
            <h1>肿瘤医生大查房</h1>
            <strong>OncoRounds</strong>
            <span>真实病例 · 指南驱动 · 思维进阶</span>
          </div>
        </>
      ) : (
        <>
          <div className="brand-orb" aria-hidden="true">
            <Atom weight="duotone" />
            <Sparkle className="orb-spark" weight="fill" />
          </div>
          <div>
            <span>{compact ? 'OncoRounds' : 'Oncology Grand Round'}</span>
            {!compact && <strong>精准诊疗 · 临床思维</strong>}
          </div>
        </>
      )}
    </div>
  )
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  tone?: 'primary' | 'secondary' | 'quiet'
  withArrow?: boolean
}

export function ActionButton({
  children,
  tone = 'primary',
  withArrow = false,
  className = '',
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={`action-button action-${tone} ${className}`.trim()}
      {...props}
    >
      <span>{children}</span>
      {withArrow && <ArrowRight weight="bold" aria-hidden="true" />}
    </button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>
}

export function ScreenFooter({ children }: { children: ReactNode }) {
  return <div className="screen-footer">{children}</div>
}

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@phosphor-icons/react'

export function Modal({ title, children, onClose, wide = false }: {
  title: string; children: ReactNode; onClose: () => void; wide?: boolean
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  useEffect(() => {
    const element = dialog.current!
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [])
  return createPortal(
    <dialog ref={dialog} className={`demo-dialog${wide ? ' is-wide' : ''}`} aria-labelledby={headingId}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dialog-surface">
        <header className="dialog-heading">
          <h2 id={headingId}>{title}</h2>
          <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X /></button>
        </header>
        <div className="dialog-content">{children}</div>
      </div>
    </dialog>, document.body,
  )
}

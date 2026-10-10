import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true, value() { this.setAttribute('open', '') },
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true, value() { this.removeAttribute('open') },
})

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn(),
  writable: true,
})

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
  writable: true,
})

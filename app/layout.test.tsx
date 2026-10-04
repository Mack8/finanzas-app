import { Children, isValidElement, type ReactElement } from 'react'
import { expect, it, vi } from 'vitest'

vi.mock('next/font/local', () => ({
  default: () => ({ variable: 'font-satoshi' }),
}))

import RootLayout from './layout'

it('places the application theme on body so portaled dialogs inherit its colors', () => {
  const layout = RootLayout({ children: <main>Contenido</main> }) as ReactElement<{
    children: React.ReactNode
  }>
  const body = Children.toArray(layout.props.children)[0]

  expect(isValidElement(body)).toBe(true)
  expect((body as ReactElement<{ className: string }>).props.className).toContain('calm-ledger')
})

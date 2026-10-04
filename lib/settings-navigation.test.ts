import { expect, it } from 'vitest'
import { resolveSettingsSection } from './settings-navigation'

it.each([undefined, '', 'unknown', ['categories'], null])('usa Ingresos cuando la sección no es válida: %s', value => {
  expect(resolveSettingsSection(value)).toBe('income')
})
it.each(['income', 'categories', 'automation'] as const)('permite un enlace directo a %s', section => {
  expect(resolveSettingsSection(section)).toBe(section)
})

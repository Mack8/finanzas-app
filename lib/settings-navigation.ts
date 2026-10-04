export type SettingsSection = 'income' | 'categories' | 'automation'

export function resolveSettingsSection(value: unknown): SettingsSection {
  return value === 'categories' || value === 'automation' ? value : 'income'
}

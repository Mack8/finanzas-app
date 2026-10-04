export const FINANCIAL_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#86a789', // sage
  '#eab676', // amber
  '#e98973', // coral
  '#a78bfa', // lavender
] as const

export type FinancialPaletteColor = (typeof FINANCIAL_COLOR_PALETTE)[number]

const financialPaletteColorSet: ReadonlySet<string> = new Set(FINANCIAL_COLOR_PALETTE)

export function isFinancialPaletteColor(value: unknown): value is FinancialPaletteColor {
  return typeof value === 'string' && financialPaletteColorSet.has(value)
}

export function chooseBalancedFinancialColor(usedColors: readonly string[]): FinancialPaletteColor {
  const usageCounts = new Map<FinancialPaletteColor, number>(
    FINANCIAL_COLOR_PALETTE.map(color => [color, 0])
  )

  for (const color of usedColors) {
    if (isFinancialPaletteColor(color)) {
      usageCounts.set(color, (usageCounts.get(color) ?? 0) + 1)
    }
  }

  return FINANCIAL_COLOR_PALETTE.reduce((leastUsed, color) =>
    (usageCounts.get(color) ?? 0) < (usageCounts.get(leastUsed) ?? 0) ? color : leastUsed
  )
}

import { roundMoney } from '@/lib/transactions'

type IncomeConfigInput = {
  first_payment_amount: number
  second_payment_amount: number | null
  currency: 'CRC' | 'USD'
}

export function computeMonthlyIncomeCRC(config: IncomeConfigInput, usdToCRC?: number): number {
  const total = config.first_payment_amount + (config.second_payment_amount ?? 0)
  if (config.currency === 'USD') {
    if (!usdToCRC) return 0
    return roundMoney(total * usdToCRC)
  }
  return roundMoney(total)
}

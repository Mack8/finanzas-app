import type { Bank, ParseResult } from '../types'
import { parseBac } from './bac'
import { parseDavibank } from './davibank'
import { parsePromerica } from './promerica'

export function parsePurchase(bank: Bank, text: string): ParseResult {
  switch (bank) {
    case 'bac': return parseBac(text)
    case 'promerica': return parsePromerica(text)
    case 'davibank': return parseDavibank(text)
  }
}

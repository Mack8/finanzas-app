import { expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { FINANCIAL_COLOR_PALETTE } from '@/lib/financial-colors'
import { PaletteColorField } from './PaletteColorField'

function ControlledField({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue)
  return <PaletteColorField id="palette" name="color" value={value} onValueChange={setValue} options={FINANCIAL_COLOR_PALETTE} />
}

it('selectsPaletteColorByKeyboard', async () => {
  const user = userEvent.setup()
  render(<ControlledField initialValue={FINANCIAL_COLOR_PALETTE[0]} />)

  const group = screen.getByRole('radiogroup', { name: 'Color' })
  const first = within(group).getByRole('radio', { name: FINANCIAL_COLOR_PALETTE[0] })
  first.focus()
  await user.keyboard('{ArrowRight}')

  expect(within(group).getByRole('radio', { name: FINANCIAL_COLOR_PALETTE[1] })).toHaveAttribute('aria-checked', 'true')
  expect(document.querySelector('input[name="color"]')).toHaveValue(FINANCIAL_COLOR_PALETTE[1])
})

it('keepsExistingCustomColorUntilUserChangesIt', async () => {
  const user = userEvent.setup()
  render(<ControlledField initialValue="#ff00ff" />)

  const group = screen.getByRole('radiogroup', { name: 'Color' })
  expect(within(group).getByRole('radio', { name: '#ff00ff (actual)' })).toHaveAttribute('aria-checked', 'true')
  await user.click(within(group).getByRole('radio', { name: FINANCIAL_COLOR_PALETTE[0] }))
  expect(document.querySelector('input[name="color"]')).toHaveValue(FINANCIAL_COLOR_PALETTE[0])
})

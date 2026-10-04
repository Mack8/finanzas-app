import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { FormDialog } from './FormDialog'
import { useFormDialogControls } from './form-dialog-context'

function PendingControl() {
  const { setPending } = useFormDialogControls()
  return <button type="button" onClick={() => setPending(true)}>Begin save</button>
}

it('opens from its trigger and exposes an accessible title and description', async () => {
  const user = userEvent.setup()
  render(<FormDialog triggerLabel="Registrar movimiento" title="Nuevo movimiento" description="Ingresá los datos.">
    <label htmlFor="amount">Monto</label><input id="amount" />
  </FormDialog>)

  await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }))

  const dialog = screen.getByRole('dialog', { name: 'Nuevo movimiento' })
  expect(within(dialog).getByText('Ingresá los datos.')).toBeInTheDocument()
  expect(within(dialog).getByRole('textbox', { name: 'Monto' })).toBeInTheDocument()
  expect(within(dialog).getByRole('heading', { name: 'Nuevo movimiento' }).parentElement).toHaveClass('bg-secondary/70')
})

it('closes from its close button, Escape, and backdrop', async () => {
  const user = userEvent.setup()
  render(<FormDialog triggerLabel="Crear" title="Crear registro"><p>Contenido</p></FormDialog>)
  const trigger = screen.getByRole('button', { name: 'Crear' })

  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Crear registro' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(trigger)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(trigger)
  await user.click(document.querySelector('[data-slot="dialog-overlay"]')!)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('bounds long content with a viewport-height scroll region', async () => {
  const user = userEvent.setup()
  render(<FormDialog triggerLabel="Crear" title="Formulario largo"><p>Contenido</p></FormDialog>)
  await user.click(screen.getByRole('button', { name: 'Crear' }))
  const dialog = screen.getByRole('dialog')
  expect(dialog.className).toContain('max-h-[calc(100dvh-2rem)]')
  expect(dialog.className).toContain('overflow-y-auto')
})

it('ignores close button, Escape, and backdrop dismissal while pending', async () => {
  const user = userEvent.setup()
  render(<FormDialog triggerLabel="Crear" title="Crear registro"><PendingControl /></FormDialog>)
  await user.click(screen.getByRole('button', { name: 'Crear' }))
  await user.click(screen.getByRole('button', { name: 'Begin save' }))
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.keyboard('{Escape}')
  await user.click(document.querySelector('[data-slot="dialog-overlay"]')!)
  expect(screen.getByRole('dialog', { name: 'Crear registro' })).toBeInTheDocument()
})

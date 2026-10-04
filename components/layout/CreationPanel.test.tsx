import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, it } from 'vitest'
import { CreationPanel } from './CreationPanel'

function Form() {
  const [error, setError] = useState(false)
  return <form onSubmit={event => { event.preventDefault(); setError(true) }}>
    <label htmlFor="draft-name">Nombre</label><input id="draft-name" />
    <button type="submit">Guardar</button>
    {error && <p role="alert">Revisá el monto</p>}
  </form>
}

it('oculta el formulario inicialmente y conserva borrador y error al plegarlo', async () => {
  const user = userEvent.setup()
  render(<CreationPanel label="Agregar cuenta"><Form /></CreationPanel>)
  const trigger = screen.getByRole('button', { name: 'Agregar cuenta' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox', { name: 'Nombre' })).not.toBeInTheDocument()
  await user.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const panel = document.getElementById(trigger.getAttribute('aria-controls')!)
  expect(panel).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cuenta de prueba')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Revisá el monto')
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await user.click(trigger)
  expect(panel).not.toBeVisible()
  await user.click(trigger)
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Cuenta de prueba')
  expect(screen.getByRole('alert')).toHaveTextContent('Revisá el monto')
})

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

it('abre un diálogo accesible y descarta borrador y error al cerrarlo y reabrirlo', async () => {
  const user = userEvent.setup()
  render(<CreationPanel label="Agregar cuenta" title="Nueva cuenta" description="Datos de la cuenta"><Form /></CreationPanel>)
  const trigger = screen.getByRole('button', { name: 'Agregar cuenta' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByRole('textbox', { name: 'Nombre' })).not.toBeInTheDocument()
  await user.click(trigger)
  expect(screen.getByRole('dialog', { name: 'Nueva cuenta' })).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Cuenta de prueba')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Revisá el monto')
  await user.click(screen.getByRole('button', { name: 'Close' }))
  await user.click(trigger)
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

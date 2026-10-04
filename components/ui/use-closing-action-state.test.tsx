import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useClosingActionState } from './use-closing-action-state'

type FormState = { status: 'idle' | 'success' | 'error' }

const initialState: FormState = { status: 'idle' }

function Harness({ result }: { result: FormState }) {
  const [open, setOpen] = useState(true)
  const [state, formAction, pending] = useClosingActionState(
    async () => result,
    initialState,
    setOpen,
  )

  return (
    <>
      <p>{open ? 'abierto' : 'cerrado'}</p>
      <p data-testid="result">{state.status}</p>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <form action={formAction}>
        <button type="submit" disabled={pending}>Guardar</button>
      </form>
    </>
  )
}

describe('useClosingActionState', () => {
  it('cierra el diálogo cuando la acción termina con éxito', async () => {
    const user = userEvent.setup()
    render(<Harness result={{ status: 'success' }} />)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByText('cerrado')).toBeInTheDocument())
  })

  it('mantiene el diálogo abierto cuando la acción devuelve un error', async () => {
    const user = userEvent.setup()
    render(<Harness result={{ status: 'error' }} />)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('error'))
    await waitFor(() => expect(screen.getByText('abierto')).toBeInTheDocument())
  })

  it('vuelve a cerrar después de reabrir y guardar con el mismo estado de éxito', async () => {
    const user = userEvent.setup()
    render(<Harness result={{ status: 'success' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.getByText('cerrado')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByText('abierto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.getByText('cerrado')).toBeInTheDocument())
  })

  it('no cierra si un nuevo envío falla después de haber guardado correctamente', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness result={{ status: 'success' }} />)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.getByText('cerrado')).toBeInTheDocument())
    rerender(<Harness result={{ status: 'error' }} />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('error'))
    expect(screen.getByText('abierto')).toBeInTheDocument()
  })
})

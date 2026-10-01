import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IngestIssues, type IngestIssue } from './IngestIssues'

const issue: IngestIssue = {
  id: '1', created_at: '2026-09-29T20:00:00Z', bank: 'davibank', status: 'unparsed',
  subject: 'Notificación de transacción', detail: 'DAVIbank: la frase de la transacción no coincide con la plantilla',
}

describe('IngestIssues', () => {
  it('muestra un estado vacío cuando no hay problemas', () => {
    render(<IngestIssues issues={[]} />)
    expect(screen.getByText('No hay correos con problemas.')).toBeInTheDocument()
  })

  it('lista banco, estado, asunto y detalle', () => {
    render(<IngestIssues issues={[issue]} />)
    expect(screen.getByText('DAVIbank')).toBeInTheDocument()
    expect(screen.getByText('No reconocido')).toBeInTheDocument()
    expect(screen.getByText('Notificación de transacción')).toBeInTheDocument()
    expect(screen.getByText(/no coincide con la plantilla/)).toBeInTheDocument()
  })

  it('distingue los errores de los no reconocidos', () => {
    render(<IngestIssues issues={[{ ...issue, id: '2', status: 'error', bank: null, subject: null, detail: null }]} />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Banco desconocido')).toBeInTheDocument()
  })
})

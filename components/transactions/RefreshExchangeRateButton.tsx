'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function RefreshExchangeRateButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  async function handleRefresh() {
    setMessage(null)
    setIsError(false)

    try {
      const response = await fetch('/api/exchange-rate', {
        method: 'GET',
        cache: 'no-store',
      })

      const payload = (await response.json()) as { error?: string; resolvedFrom?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'No se pudo sincronizar el tipo de cambio.')
      }

      setMessage(
        payload.resolvedFrom === 'remote'
          ? 'Tipo de cambio actualizado desde BCCR.'
          : 'Tipo de cambio recuperado desde el cache local.'
      )

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : 'No se pudo sincronizar el tipo de cambio.')
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isPending}
      >
        {isPending ? 'Sincronizando...' : 'Sincronizar tasa'}
      </Button>
      {message && (
        <p className={isError ? 'text-sm text-danger' : 'text-sm text-muted-foreground'}>
          {message}
        </p>
      )}
    </div>
  )
}

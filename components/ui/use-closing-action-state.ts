'use client'

import { useActionState, useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'

type ActionState = { status: string }

type Action<State, Payload> = (
  previousState: State,
  payload: Payload,
) => State | Promise<State>

export function useClosingActionState<State extends ActionState, Payload>(
  action: Action<State, Payload>,
  initialState: State,
  setOpen: (open: boolean) => void,
) {
  const [dismissedState, setDismissedState] = useState<Awaited<State> | null>(null)

  const actionWithClose = useCallback(async (previousState: State, payload: Payload) => {
    const nextState = await action(previousState, payload)
    if (nextState.status === 'success') {
      setOpen(false)
      setDismissedState(nextState as Awaited<State>)
    }
    return nextState
  }, [action, setOpen])

  const [state, formAction, pending] = useActionState(
    actionWithClose as unknown as (
      previousState: Awaited<State>,
      payload: Payload,
    ) => Awaited<State> | Promise<Awaited<State>>,
    initialState as Awaited<State>,
  )

  const latestActionState = useRef(state)
  useEffect(() => {
    latestActionState.current = state
  }, [state])

  const resetActionState = useCallback(() => setDismissedState(latestActionState.current), [])
  const visibleState = state === dismissedState ? initialState as Awaited<State> : state

  return [visibleState, formAction, pending, resetActionState] as const
}

export function useActionStateFormSubmit(formAction: (payload: FormData) => void) {
  const [, startTransition] = useTransition()

  return useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => formAction(formData))
  }, [formAction, startTransition])
}

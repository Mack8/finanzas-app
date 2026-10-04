'use client'

import { useActionState, useCallback, type Dispatch, type SetStateAction } from 'react'

type ActionState = { status: string }

type Action<State, Payload> = (
  previousState: State,
  payload: Payload,
) => State | Promise<State>

export function useClosingActionState<State extends ActionState, Payload>(
  action: Action<State, Payload>,
  initialState: State,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  const actionWithClose = useCallback(async (previousState: State, payload: Payload) => {
    const nextState = await action(previousState, payload)
    if (nextState.status === 'success') setOpen(false)
    return nextState
  }, [action, setOpen])

  return useActionState(
    actionWithClose as unknown as (
      previousState: Awaited<State>,
      payload: Payload,
    ) => Awaited<State> | Promise<Awaited<State>>,
    initialState as Awaited<State>,
  )
}

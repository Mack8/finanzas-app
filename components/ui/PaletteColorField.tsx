'use client'

import type { KeyboardEvent } from 'react'

export function PaletteColorField({
  id,
  name,
  value,
  onValueChange,
  options,
}: {
  id: string
  name: string
  value: string
  onValueChange(value: string): void
  options: readonly string[]
}) {
  const choices = options.map(color => ({ value: color, label: color }))
  if (value && !choices.some(choice => choice.value === value)) {
    choices.push({ value, label: `${value} (actual)` })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % choices.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + choices.length) % choices.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = choices.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    const nextChoice = choices[nextIndex]
    onValueChange(nextChoice.value)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus()
  }

  return (
    <div>
      <div id={id} role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
        {choices.map((choice, index) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-label={choice.label}
            aria-checked={value === choice.value}
            tabIndex={value === choice.value ? 0 : -1}
            onClick={() => onValueChange(choice.value)}
            onKeyDown={event => handleKeyDown(event, index)}
            className="size-9 rounded-full border border-black/10 outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/60 aria-checked:ring-2 aria-checked:ring-offset-2 aria-checked:ring-primary"
            style={{ backgroundColor: choice.value }}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

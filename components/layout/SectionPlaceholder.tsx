'use client'

type SectionPlaceholderProps = {
  title: string
  description: string
}

export function SectionPlaceholder({
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-2xl text-muted-foreground">{description}</p>
    </div>
  )
}

import Link from 'next/link'

export function DecisionAction({ title, reason, impact, href }: { title: string; reason: string; impact: string; href: string }) {
  return (
    <section aria-label="Acción recomendada" className="rounded-2xl border bg-card p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acción recomendada</p>
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
      <p className="mt-3 text-sm font-medium">{impact}</p>
      <Link href={href} className="mt-5 inline-flex rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">Ver detalle <span aria-hidden="true" className="ml-3">→</span></Link>
    </section>
  )
}

export function EvidenceStrip({ pace, driver, commitments }: { pace: string; driver: string; commitments: string }) {
  return (
    <section aria-label="Evidencia del mes" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[['Ritmo de gasto', pace], ['Principal explicación', driver], ['Compromisos pendientes', commitments]].map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl border bg-card p-5">
          <h2 className="text-xs text-muted-foreground">{label}</h2>
          <p className="mt-2 font-semibold">{value}</p>
        </div>
      ))}
    </section>
  )
}

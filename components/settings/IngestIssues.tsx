import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type IngestIssue = {
  id: string
  created_at: string
  bank: string | null
  status: 'unparsed' | 'error'
  subject: string | null
  detail: string | null
}

const bankLabels: Record<string, string> = {
  bac: 'BAC',
  promerica: 'Promerica',
  davibank: 'DAVIbank',
}

const statusLabels: Record<IngestIssue['status'], string> = {
  unparsed: 'No reconocido',
  error: 'Error',
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })
}

export function IngestIssues({ issues }: { issues: IngestIssue[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Correos con problemas</CardTitle>
        <CardDescription>
          Alertas del banco que no se pudieron convertir en un movimiento (últimas 20).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.length === 0 ? (
          <div className="empty-state">No hay correos con problemas.</div>
        ) : (
          issues.map(issue => (
            <div key={issue.id} className="list-row">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {issue.bank ? (bankLabels[issue.bank] ?? issue.bank) : 'Banco desconocido'}
                  </p>
                  <span className={issue.status === 'error' ? 'badge-danger' : 'badge-muted'}>
                    {statusLabels[issue.status]}
                  </span>
                </div>
                {issue.subject && <p className="text-sm text-foreground">{issue.subject}</p>}
                {issue.detail && <p className="text-sm text-muted-foreground">{issue.detail}</p>}
              </div>
              <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {formatWhen(issue.created_at)}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

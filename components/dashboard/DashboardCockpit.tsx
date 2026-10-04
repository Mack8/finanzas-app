import type { CockpitModel } from '@/lib/dashboard-cockpit'
import { FinancialStateHero } from './FinancialStateHero'
import { DecisionAction } from './DecisionAction'
import { EvidenceStrip } from './EvidenceStrip'
import { CommitmentRail, type SavingsView, type DebtView } from './CommitmentRail'

export function DashboardCockpit({ model, savingsFunds, debts }: { model: CockpitModel; savingsFunds: SavingsView[]; debts: DebtView[] }) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <FinancialStateHero position={model.position} />
      <DecisionAction {...model.action} />
      <EvidenceStrip {...model.evidence} />
      <CommitmentRail savingsFunds={savingsFunds} debts={debts} />
    </div>
  )
}

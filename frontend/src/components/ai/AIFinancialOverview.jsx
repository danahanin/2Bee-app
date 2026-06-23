import HiveCard from '../design-system/HiveCard.jsx'
import Hexagon from '../design-system/Hexagon.jsx'
import UserAvatar from '../design-system/UserAvatar.jsx'
import { formatCurrency } from '../../utils/formatCurrency.js'

function AIFinancialOverview({
  balance,
  current,
  partner,
  personalDashboard,
  sharedDashboard,
  overviewSummary,
  isLoading,
}) {
  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--honey-50)]" />
  }

  const personalSpend = personalDashboard?.totalSpendThisMonth ?? 0
  const sharedSpend = sharedDashboard?.totalJointSpendThisMonth ?? balance?.totalSharedSpend ?? 0
  const netBalance = balance?.remainingImbalance > 0.01 ? balance.remainingImbalance : 0
  const owesLabel =
    balance?.suggestedTransfer && balance.remainingImbalance > 0.01
      ? balance.suggestedTransfer.fromUserId === current?.id
        ? 'You owe'
        : `${partner?.firstName || 'Partner'} owes`
      : 'Settled up'

  return (
    <HiveCard className="bg-gradient-to-br from-[var(--honey-50)] to-white p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="hive-eyebrow">AI Financial Overview</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--brown-muted)]">{overviewSummary}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[rgba(61,41,20,0.08)] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Personal</p>
              <p className="mt-1 text-xl font-bold text-[var(--brown-text)]">
                {formatCurrency(personalSpend, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(61,41,20,0.08)] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Shared</p>
              <p className="mt-1 text-xl font-bold text-[var(--brown-text)]">
                {formatCurrency(sharedSpend, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-[rgba(61,41,20,0.08)] bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Net balance</p>
              <p className="mt-1 text-xl font-bold text-[var(--brown-text)]">{formatCurrency(netBalance)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <UserAvatar user={current} size="lg" />
          <Hexagon size={80} variant="filled" className="hex-glow-static">
            <div className="text-center text-white">
              <p className="text-[9px] font-semibold uppercase tracking-wide opacity-90">{owesLabel}</p>
              <p className="text-base font-bold">{formatCurrency(netBalance)}</p>
            </div>
          </Hexagon>
          <UserAvatar user={partner || { firstName: 'Partner', lastName: '' }} size="lg" />
        </div>
      </div>
    </HiveCard>
  )
}

export default AIFinancialOverview

import Hexagon from '../design-system/Hexagon.jsx'
import UserAvatar from '../design-system/UserAvatar.jsx'
import { splitParticipantName } from '../../hooks/useHiveParticipants.js'
import { formatCurrency } from '../../utils/formatCurrency.js'

const TABS = [
  { key: 'shared', label: 'Our Hive' },
  { key: 'personal', label: 'My Expenses' },
  { key: 'balance', label: 'Balance' },
]

function ViewToggle({ active, onChange }) {
  return (
    <div className="inline-flex gap-1 rounded-xl border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            active === tab.key
              ? 'bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] text-white shadow-sm'
              : 'text-[var(--brown-muted)] hover:text-[var(--brown-text)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function HiveBalanceHero({ balance, isLoading, currentUserId }) {
  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center justify-center gap-4 py-8">
        <div className="h-24 w-24 rounded-full bg-[var(--honey-100)]" />
        <div className="h-32 w-32 rounded-full bg-[var(--honey-100)]" />
        <div className="h-24 w-24 rounded-full bg-[var(--honey-100)]" />
      </div>
    )
  }

  const contributions = balance?.contributions || []
  const current = contributions.find((p) => p.userId === currentUserId) || contributions[0]
  const partner = contributions.find((p) => p.userId !== currentUserId) || contributions[1]
  const settlement = balance?.remainingImbalance > 0.01 && balance?.suggestedTransfer
    ? {
        from: {
          isCurrentUser: balance.suggestedTransfer.fromUserId === currentUserId,
          name: contributions.find((c) => c.userId === balance.suggestedTransfer.fromUserId)?.name,
        },
        amount: balance.remainingImbalance,
      }
    : null

  const currentUser = current
    ? { ...splitParticipantName(current.name), avatarUrl: current.avatarUrl }
    : null
  const partnerUser = partner
    ? { ...splitParticipantName(partner.name), avatarUrl: partner.avatarUrl }
    : null

  const centerLabel = settlement
    ? `${settlement.from.isCurrentUser ? 'You owe' : `${settlement.from.name || 'Partner'} owes`}`
    : 'Settled up'
  const centerAmount = settlement ? formatCurrency(settlement.amount) : '₪0'

  return (
    <div className="hive-card bg-gradient-to-br from-[var(--honey-100)] to-[var(--honey-200)] p-6 md:p-8">
      <p className="hive-eyebrow text-center">The Hive</p>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-4 md:gap-8">
        {current ? (
          <div className="flex flex-col items-center gap-2">
            <UserAvatar user={currentUser} size="lg" />
            <p className="text-lg font-bold text-[var(--honey-800)]">
              {formatCurrency(current.paid, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs font-semibold text-[var(--brown-muted)]">You paid</p>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-1">
          <Hexagon size={96} variant="filled" className="hex-glow-static">
            <div className="text-center text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{centerLabel}</p>
              <p className="text-lg font-bold">{centerAmount}</p>
            </div>
          </Hexagon>
          <p className="text-xs text-[var(--brown-muted)]">
            Shared: {formatCurrency(balance?.totalSharedSpend ?? 0, { maximumFractionDigits: 0 })}
          </p>
        </div>

        {partner ? (
          <div className="flex flex-col items-center gap-2">
            <UserAvatar user={partnerUser} size="lg" />
            <p className="text-lg font-bold text-[var(--honey-800)]">
              {formatCurrency(partner.paid, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs font-semibold text-[var(--brown-muted)]">{partner.name} paid</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ViewToggle

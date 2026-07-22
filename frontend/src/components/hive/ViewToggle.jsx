import Hexagon from '../design-system/Hexagon.jsx'
import UserAvatar from '../design-system/UserAvatar.jsx'
import { splitParticipantName } from '../../hooks/useHiveParticipants.js'
import { formatCurrency } from '../../utils/formatCurrency.js'

const TABS = [
  { key: 'shared', label: 'Our Hive', shortLabel: 'Hive' },
  { key: 'personal', label: 'My Expenses', shortLabel: 'Mine' },
  { key: 'balance', label: 'Balance', shortLabel: 'Balance' },
]

function ViewToggle({ active, onChange }) {
  return (
    <div className="flex w-full gap-1 rounded-xl border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] p-1 sm:inline-flex sm:w-auto">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`min-h-10 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:flex-none sm:px-4 sm:text-sm ${
            active === tab.key
              ? 'bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] text-white shadow-sm'
              : 'text-[var(--brown-muted)] hover:text-[var(--brown-text)]'
          }`}
        >
          <span className="sm:hidden">{tab.shortLabel}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

export function HiveBalanceHero({ balance, isLoading, currentUserId }) {
  if (isLoading) {
    return (
      <div className="flex animate-pulse items-center justify-center gap-3 py-6 sm:gap-4 sm:py-8">
        <div className="h-16 w-16 rounded-full bg-[var(--honey-100)] sm:h-24 sm:w-24" />
        <div className="h-24 w-24 rounded-full bg-[var(--honey-100)] sm:h-32 sm:w-32" />
        <div className="h-16 w-16 rounded-full bg-[var(--honey-100)] sm:h-24 sm:w-24" />
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
    <div className="hive-card bg-gradient-to-br from-[var(--honey-100)] to-[var(--honey-200)] p-4 sm:p-6 md:p-8">
      <p className="hive-eyebrow text-center">The Hive</p>
      <div className="mt-4 flex items-end justify-center gap-3 sm:mt-6 sm:gap-4 md:gap-8">
        {current ? (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:flex-none sm:gap-2">
            <UserAvatar user={currentUser} size="md" className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <UserAvatar user={currentUser} size="lg" />
            </span>
            <p className="text-sm font-bold text-[var(--honey-800)] sm:text-lg">
              {formatCurrency(current.paid, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] font-semibold text-[var(--brown-muted)] sm:text-xs">You paid</p>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="sm:hidden">
            <Hexagon size={72} variant="filled" className="hex-glow-static">
              <div className="text-center text-white">
                <p className="px-1 text-[8px] font-semibold uppercase leading-tight tracking-wide opacity-90">{centerLabel}</p>
                <p className="text-sm font-bold">{centerAmount}</p>
              </div>
            </Hexagon>
          </span>
          <span className="hidden sm:inline-flex">
            <Hexagon size={96} variant="filled" className="hex-glow-static">
              <div className="text-center text-white">
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{centerLabel}</p>
                <p className="text-lg font-bold">{centerAmount}</p>
              </div>
            </Hexagon>
          </span>
          <p className="text-[10px] text-[var(--brown-muted)] sm:text-xs">
            Shared: {formatCurrency(balance?.totalSharedSpend ?? 0, { maximumFractionDigits: 0 })}
          </p>
        </div>

        {partner ? (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:flex-none sm:gap-2">
            <UserAvatar user={partnerUser} size="md" className="sm:hidden" />
            <span className="hidden sm:inline-flex">
              <UserAvatar user={partnerUser} size="lg" />
            </span>
            <p className="max-w-full truncate text-sm font-bold text-[var(--honey-800)] sm:text-lg">
              {formatCurrency(partner.paid, { maximumFractionDigits: 0 })}
            </p>
            <p className="max-w-full truncate text-[10px] font-semibold text-[var(--brown-muted)] sm:text-xs">
              {partner.name} paid
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ViewToggle

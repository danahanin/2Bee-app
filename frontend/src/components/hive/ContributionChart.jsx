import UserAvatar from '../design-system/UserAvatar.jsx'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function widthPercent(value, max) {
  if (!max) return '0%'
  return `${Math.max(8, Math.round((value / max) * 100))}%`
}

function ContributionChart({ balance, currentUserId }) {
  if (!balance?.contributions?.length) return null

  const maxPaid = Math.max(...balance.contributions.map((item) => item.paid), balance.equalShare)

  return (
    <div className="space-y-4">
      {balance.contributions.map((item) => {
        const isCurrentUser = item.userId === currentUserId
        return (
          <div key={item.userId} className="space-y-2">
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center gap-2">
                <UserAvatar
                  user={{
                    firstName: isCurrentUser ? 'You' : item.name?.split(' ')[0],
                    lastName: isCurrentUser ? '' : item.name?.split(' ').slice(1).join(' '),
                    avatarUrl: item.avatarUrl,
                  }}
                  size="sm"
                />
                <span className="font-medium text-[var(--brown-text)]">
                  {isCurrentUser ? 'You' : item.name || 'Partner'}
                </span>
              </div>
              <span className="pl-10 text-xs text-[var(--brown-muted)] sm:pl-0 sm:text-sm">
                Paid {formatCurrency(item.paid)} • Remaining {formatCurrency(Math.abs(item.remainingNet))}
              </span>
            </div>

            <div className="space-y-2">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--honey-50)]">
                <div
                  className={`h-full rounded-full ${isCurrentUser ? 'bg-[var(--honey-500)]' : 'bg-[var(--honey-300)]'}`}
                  style={{ width: widthPercent(item.paid, maxPaid) }}
                />
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--honey-50)]">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: widthPercent(balance.equalShare, maxPaid) }}
                />
              </div>
            </div>
          </div>
        )
      })}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--brown-muted)]">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--honey-500)]" />
          Paid so far
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Even split target
        </span>
      </div>
    </div>
  )
}

export default ContributionChart

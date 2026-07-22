import UserAvatar from '../design-system/UserAvatar.jsx'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function ImbalanceBanner({ balance, currentUserId, isLoading, error, onSettle }) {
  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!balance) return null

  const contributions = balance.contributions || []
  const currentContribution = contributions.find((item) => item.userId === currentUserId) || null
  const partnerContribution = contributions.find((item) => item.userId !== currentUserId) || null
  const canSettle = balance.suggestedTransfer?.fromUserId === currentUserId
  const remaining = formatCurrency(balance.remainingImbalance)

  let title = 'Your hive is balanced'
  let description = 'You and your partner are even for now.'

  if (balance.balanceStatus === 'imbalanced' && currentContribution) {
    if (currentContribution.remainingNet > 0) {
      title = `You've covered ${formatCurrency(currentContribution.remainingNet)} more so far`
      description = `A transfer of ${remaining} would bring things back into balance.`
    } else {
      title = `${partnerContribution?.name || 'Your partner'} has covered ${formatCurrency(Math.abs(currentContribution.remainingNet))} more so far`
      description = canSettle
        ? `A transfer of ${remaining} would gently even things out.`
        : 'We are waiting for the next transfer step to even things out.'
    }
  }

  return (
    <section className="hive-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {currentContribution ? (
              <UserAvatar
                user={{
                  firstName: 'You',
                  lastName: '',
                  avatarUrl: currentContribution.avatarUrl,
                }}
                size="md"
              />
            ) : null}
            {partnerContribution ? (
              <UserAvatar
                user={{
                  firstName: partnerContribution.name?.split(' ')[0],
                  lastName: partnerContribution.name?.split(' ').slice(1).join(' '),
                  avatarUrl: partnerContribution.avatarUrl,
                }}
                size="md"
              />
            ) : null}
          </div>
          <p className="hive-eyebrow">Hive balance</p>
          <h2 className="hive-title text-xl">{title}</h2>
          <p className="max-w-2xl text-sm text-[var(--brown-muted)]">{description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--brown-muted)]">
            <span className="rounded-full bg-[var(--honey-50)] px-3 py-1">
              Shared spend: {formatCurrency(balance.totalSharedSpend)}
            </span>
            <span className="rounded-full bg-[var(--honey-50)] px-3 py-1">
              Each share: {formatCurrency(balance.equalShare)}
            </span>
            {balance.completedTransfersTotal > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Transferred already: {formatCurrency(balance.completedTransfersTotal)}
              </span>
            )}
          </div>
        </div>

        {canSettle && balance.balanceStatus === 'imbalanced' && (
          <button
            type="button"
            onClick={onSettle}
            className="hive-btn-primary w-full min-h-11 rounded-xl px-4 py-2.5 text-sm sm:w-auto"
          >
            Start transfer
          </button>
        )}
      </div>
    </section>
  )
}

export default ImbalanceBanner

import HivePanel from './primitives/HivePanel.jsx'
import HiveButton from './primitives/HiveButton.jsx'
import HoneyJar from './primitives/HoneyJar.jsx'

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
    return <div className="hive-skeleton h-28" />
  }

  if (error) {
    return <div className="hive-alert hive-alert-error">{error}</div>
  }

  if (!balance) return null

  const currentContribution = balance.contributions?.find((item) => item.userId === currentUserId) || null
  const canSettle = balance.suggestedTransfer?.fromUserId === currentUserId
  const remaining = formatCurrency(balance.remainingImbalance)
  const isBalanced = balance.balanceStatus === 'balanced'
  const fillPercent = isBalanced ? 95 : 55

  let title = 'Your hive is balanced!'
  let description = 'You and your hive mate are even — all jars level.'

  if (balance.balanceStatus === 'imbalanced' && currentContribution) {
    if (currentContribution.remainingNet > 0) {
      title = `You filled ${formatCurrency(currentContribution.remainingNet)} more`
      description = `A transfer of ${remaining} would even the jars.`
    } else {
      title = `Your partner filled ${formatCurrency(Math.abs(currentContribution.remainingNet))} more`
      description = canSettle
        ? `Transfer ${remaining} to balance the hive.`
        : 'Waiting for the next transfer to even things out.'
    }
  }

  return (
    <HivePanel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <HoneyJar size="sm" label="Balance" value={isBalanced ? 'Even' : remaining} fillPercent={fillPercent} icon="⚖️" />
          <div className="min-w-[12rem] flex-1 space-y-2">
            <p className="hive-panel-eyebrow">Hive balance</p>
            <h2 className="hive-panel-title">{title}</h2>
            <p className="hive-panel-sub">{description}</p>
            <div className="flex flex-wrap gap-2">
              <span className="hive-badge hive-badge-amber">Shared: {formatCurrency(balance.totalSharedSpend)}</span>
              <span className="hive-badge hive-badge-muted">Each share: {formatCurrency(balance.equalShare)}</span>
              {balance.completedTransfersTotal > 0 && (
                <span className="hive-badge hive-badge-green">Transferred: {formatCurrency(balance.completedTransfersTotal)}</span>
              )}
            </div>
          </div>
        </div>

        {canSettle && balance.balanceStatus === 'imbalanced' && (
          <HiveButton type="button" onClick={onSettle}>
            Start transfer
          </HiveButton>
        )}
      </div>
    </HivePanel>
  )
}

export default ImbalanceBanner

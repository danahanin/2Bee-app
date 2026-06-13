import Avatar from '../profile/Avatar.jsx'
import HivePanel from './primitives/HivePanel.jsx'
import HoneyJar, { HoneyJarRow } from './primitives/HoneyJar.jsx'
import { formatBalanceLabel } from '../../lib/dashboardUtils.js'

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function fillPercent(value, max) {
  if (!max) return 12
  return Math.max(12, Math.round((value / max) * 100))
}

function ContributionChart({ balance, currentUserId }) {
  if (!balance?.contributions?.length) return null

  const maxPaid = Math.max(...balance.contributions.map((item) => item.paid), balance.equalShare)

  return (
    <HivePanel className="p-5">
      <div className="mb-4">
        <p className="hive-panel-eyebrow">Contribution view</p>
        <h3 className="hive-panel-title">Honey jars — who filled more</h3>
        <p className="hive-panel-sub">All-time shared expenses (matches Hive balance)</p>
      </div>

      <div className="space-y-6">
        {balance.contributions.map((item) => {
          const isCurrentUser = item.userId === currentUserId
          const balanceLabel = formatBalanceLabel(item.remainingNet)

          return (
            <div key={item.userId} className="hive-contribution-row">
              <div className="flex items-center gap-2">
                <Avatar
                  avatarUrl={item.avatarUrl}
                  firstName={item.firstName}
                  lastName={item.lastName}
                  name={item.name}
                  size="sm"
                />
                <div>
                  <p className="font-bold text-[var(--chamber-accent-dark)]">
                    {isCurrentUser ? 'You' : item.name || 'Your hive mate'}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      balanceLabel.tone === 'credit'
                        ? 'text-emerald-700'
                        : balanceLabel.tone === 'debit'
                          ? 'text-rose-700'
                          : 'text-[var(--chamber-accent-dark)]'
                    }`}
                  >
                    {balanceLabel.text}
                  </p>
                </div>
              </div>

              <HoneyJarRow>
                <HoneyJar
                  size="sm"
                  label="Paid"
                  value={formatCurrency(item.paid)}
                  fillPercent={fillPercent(item.paid, maxPaid)}
                  icon="🍯"
                />
                <HoneyJar
                  size="sm"
                  label="Fair share"
                  value={formatCurrency(balance.equalShare)}
                  fillPercent={fillPercent(balance.equalShare, maxPaid)}
                  icon="⚖️"
                />
              </HoneyJarRow>
            </div>
          )
        })}
      </div>
    </HivePanel>
  )
}

export default ContributionChart

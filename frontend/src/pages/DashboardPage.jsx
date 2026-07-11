import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import HiveCard from '../components/design-system/HiveCard.jsx'
import HivePanel from '../components/design-system/HivePanel.jsx'
import HoneyJar from '../components/design-system/HoneyJar.jsx'
import MetricCell from '../components/design-system/MetricCell.jsx'
import PartnerAvatars from '../components/design-system/PartnerAvatars.jsx'
import HexButton from '../components/design-system/HexButton.jsx'
import UserAvatar from '../components/design-system/UserAvatar.jsx'
import TransferModal from '../components/hive/TransferModal.jsx'
import { useHive, useExpenses, useHiveBalance, useCreateTransfer } from '../hooks/useHive.js'
import { useHiveParticipants } from '../hooks/useHiveParticipants.js'
import { useProfile } from '../hooks/useProfile.js'
import { useInsights } from '../hooks/useAI.js'
import InsightCard from '../components/ai/InsightCard.jsx'
import { fetchPersonalDashboard } from '../services/dashboardService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

const CATEGORY_EMOJI = {
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚗',
  utilities: '💡',
  rent: '🏠',
  entertainment: '🎬',
  health: '💊',
  shopping: '🛍️',
  subscriptions: '📺',
  travel: '✈️',
  education: '📚',
  other: '📌',
}

function DashboardPage() {
  const { currentUser, pairingStatus } = useAuth()
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''
  const { hive } = useHive(hiveId)
  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useHiveBalance(hiveId)
  const { expenses, isLoading: expensesLoading } = useExpenses(hiveId, 'personal')
  const { createTransfer, isSubmitting: isCreatingTransfer } = useCreateTransfer(hiveId)
  const [personalData, setPersonalData] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const { data: insights, fetch: fetchInsights } = useInsights()

  useEffect(() => {
    fetchPersonalDashboard()
      .then(setPersonalData)
      .catch(() => setPersonalData(null))
    fetchInsights()
  }, [fetchInsights])

  const topInsight = insights?.[0] || null

  const { profile } = useProfile()
  const { partner } = useHiveParticipants(balance, currentUser?.id)

  const jarStatus = useMemo(() => {
    if (!balance?.suggestedTransfer || (balance.remainingImbalance ?? 0) <= 0.01) return 'settled'
    if (balance.suggestedTransfer.fromUserId === currentUser?.id) return 'owing'
    return 'owed'
  }, [balance, currentUser?.id])

  const jarAmount = balance?.totalSharedSpend ?? 0
  const recentExpenses = expenses.slice(0, 5)

  async function handleTransferSubmit(data) {
    const result = await createTransfer(data)
    if (!result.ok) {
      window.alert(result.message)
      return
    }
    setTransferOpen(false)
    refetchBalance()
    if (result.payUrl) window.location.assign(result.payUrl)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="hive-eyebrow">Dashboard</p>
        <h1 className="hive-title text-2xl md:text-3xl">
          Welcome back, {currentUser?.firstName || 'there'}
        </h1>
        <p className="mt-1 text-sm text-[var(--brown-muted)]">
          Your hive at a glance — shared balance, recent activity, and quick actions.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <HiveCard className="flex flex-col items-center justify-center py-8">
          <PartnerAvatars
            user={{ ...currentUser, avatarUrl: profile.avatarUrl }}
            partner={partner}
            onTransfer={() => setTransferOpen(true)}
          />
        </HiveCard>

        <HoneyJar
          balance={jarAmount}
          status={jarStatus}
          isLoading={balanceLoading}
          label="Shared balance"
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCell
          label="Personal spend"
          value={formatCurrency(personalData?.totalSpendThisMonth ?? 0, { maximumFractionDigits: 0 })}
          subtitle="This month"
        />
        <MetricCell
          label="Shared spend"
          value={formatCurrency(balance?.totalSharedSpend ?? 0, { maximumFractionDigits: 0 })}
          subtitle={hive ? `${hive.userIds?.length || 2} partners` : 'Hive'}
        />
        <MetricCell
          label="Net balance"
          value={
            balance?.remainingImbalance > 0.01
              ? formatCurrency(balance.remainingImbalance)
              : formatCurrency(0)
          }
          subtitle={balance?.remainingImbalance > 0.01 ? 'Outstanding' : 'All settled'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <HivePanel
          title="Recent expenses"
          subtitle="Your latest personal and shared activity"
          action={
            <Link to="/app/expenses" className="text-sm font-semibold text-[var(--honey-700)] hover:underline">
              View all
            </Link>
          }
        >
          {expensesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--honey-50)]" />
              ))}
            </div>
          ) : recentExpenses.length ? (
            <ul className="space-y-2">
              {recentExpenses.map((expense) => (
                <li
                  key={expense._id}
                  className="flex items-center gap-3 rounded-xl border border-[rgba(61,41,20,0.08)] bg-white px-4 py-3 transition hover:shadow-sm"
                >
                  <div className="relative shrink-0">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--honey-50)] text-base">
                      {CATEGORY_EMOJI[expense.category] || '📌'}
                    </span>
                    <div className="absolute -bottom-1 -right-1">
                      <UserAvatar
                        user={
                          expense.paidBy
                            ? {
                                firstName: expense.paidBy.name?.split(' ')[0],
                                lastName: expense.paidBy.name?.split(' ').slice(1).join(' '),
                                avatarUrl: expense.paidBy.avatarUrl,
                              }
                            : { ...currentUser, avatarUrl: profile.avatarUrl }
                        }
                        size="xs"
                        showHexFrame={false}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--brown-text)]">{expense.description}</p>
                    <p className="text-xs text-[var(--brown-muted)]">
                      {expense.category} ·{' '}
                      {new Date(expense.date).toLocaleDateString('en-IL', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--brown-text)]">
                    {formatCurrency(expense.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--brown-muted)]">No expenses yet. Scan a receipt to get started.</p>
          )}
        </HivePanel>

        <div className="space-y-3">
          {topInsight ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="hive-eyebrow">AI insight</p>
                <Link
                  to="/app/assistant"
                  className="text-xs font-semibold text-[var(--honey-700)] hover:underline"
                >
                  See all
                </Link>
              </div>
              <Link to="/app/assistant" className="block">
                <InsightCard insight={topInsight} variant="compact" />
              </Link>
            </div>
          ) : null}

          <p className="hive-eyebrow">Quick access</p>
          <div className="grid grid-cols-2 gap-3">
            <HexButton to="/app/hive" size="md">
              <span>🍯</span>
              <span>Hive</span>
            </HexButton>
            <HexButton to="/app/expenses" size="md">
              <span>📊</span>
              <span>Expenses</span>
            </HexButton>
            <HexButton to="/app/assistant" size="md">
              <span>✨</span>
              <span>Assistant</span>
            </HexButton>
            <HexButton to="/app/profile" size="md">
              <span>👤</span>
              <span>Profile</span>
            </HexButton>
          </div>
        </div>
      </div>

      {transferOpen ? (
        <TransferModal
          balance={balance}
          onClose={() => setTransferOpen(false)}
          onSubmit={handleTransferSubmit}
          isSubmitting={isCreatingTransfer}
        />
      ) : null}
    </div>
  )
}

export default DashboardPage

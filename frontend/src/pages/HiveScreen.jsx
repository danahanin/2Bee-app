import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ViewToggle from '../components/hive/ViewToggle.jsx'
import ExpenseList from '../components/hive/ExpenseList.jsx'
import ExpenseFormModal from '../components/hive/ExpenseFormModal.jsx'
import ImbalanceBanner from '../components/hive/ImbalanceBanner.jsx'
import ContributionChart from '../components/hive/ContributionChart.jsx'
import TransferTimeline from '../components/hive/TransferTimeline.jsx'
import TransferModal from '../components/hive/TransferModal.jsx'
import HiveNotificationsList from '../components/hive/HiveNotificationsList.jsx'
import HiveLayout from '../components/hive/HiveLayout.jsx'
import HivePanel from '../components/hive/primitives/HivePanel.jsx'
import HoneyJar, { HoneyJarRow } from '../components/hive/primitives/HoneyJar.jsx'
import HiveButton from '../components/hive/primitives/HiveButton.jsx'
import HiveEmptyState from '../components/hive/primitives/HiveEmptyState.jsx'
import Avatar from '../components/profile/Avatar.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'
import {
  useHive,
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useHiveBalance,
  useHiveTransfers,
  useHiveNotifications,
  useCreateTransfer,
  useConnectToHive,
} from '../hooks/useHive.js'

function BalanceHero({ hive, isLoading, profile, partner, balance }) {
  if (isLoading) {
    return <div className="hive-skeleton h-32" />
  }

  if (!hive) {
    return (
      <HivePanel className="p-6 text-center">
        <p className="text-sm font-medium text-[var(--chamber-accent-dark)]">
          No hive connected yet. Pair with your hive mate to open the shared chamber.
        </p>
      </HivePanel>
    )
  }

  const members = balance?.contributions || []

  return (
    <HivePanel className="overflow-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="hive-panel-eyebrow">Shared chamber</p>
          <p className="hive-panel-title text-3xl">The Hive</p>
          <p className="hive-panel-sub">
            {hive.userIds?.length || 0} bees · Created{' '}
            {new Date(hive.createdAt).toLocaleDateString('en-IL', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {members.length > 0
            ? members.map((member) => (
                <div key={member.userId} className="flex flex-col items-center gap-1">
                  <Avatar avatarUrl={member.avatarUrl} firstName={member.firstName} lastName={member.lastName} name={member.name} size="lg" />
                  <span className="text-xs font-semibold text-[var(--chamber-accent-dark)]">
                    {member.userId === profile?.id ? 'You' : member.name?.split(' ')[0] || 'Partner'}
                  </span>
                </div>
              ))
            : (
              <>
                {partner ? <Avatar avatarUrl={partner.avatarUrl} firstName={partner.firstName} lastName={partner.lastName} size="lg" /> : null}
                {profile ? <Avatar avatarUrl={profile.avatarUrl} firstName={profile.firstName} lastName={profile.lastName} size="lg" /> : null}
              </>
            )}
        </div>
      </div>
    </HivePanel>
  )
}

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(amount)
}

function BalancePanel({ balance, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <div className="hive-skeleton h-28" />
        <div className="hive-skeleton h-28" />
      </div>
    )
  }

  if (error) {
    return <div className="hive-alert hive-alert-error">{error}</div>
  }

  if (!balance) {
    return <HiveEmptyState message="No balance data yet — log shared nectar to fill the ledger." icon="🍯" />
  }

  return (
    <section className="space-y-4">
      <HoneyJarRow className="justify-center">
        <HoneyJar
          label="Shared spend"
          icon="🍯"
          value={formatCurrency(balance.totalSharedSpend)}
          sublabel={`Split equally: ${formatCurrency(balance.splitAmount)} each`}
        />
        <HivePanel className="p-4">
          <p className="hive-panel-eyebrow">Balance</p>
          {balance.settlements?.length ? (
            <div className="mt-2 space-y-2">
              {balance.settlements.map((settlement) => (
                <p key={`${settlement.from.id}-${settlement.to.id}`} className="text-sm font-semibold text-[var(--chamber-accent-dark)]">
                  {settlement.from.isCurrentUser ? 'You' : settlement.from.name} owe{' '}
                  {settlement.to.isCurrentUser ? 'you' : settlement.to.name}{' '}
                  {formatCurrency(settlement.amount)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-emerald-700">Everyone is settled up.</p>
          )}
        </HivePanel>
      </HoneyJarRow>

      <div className="space-y-2">
        {balance.participants?.map((participant) => (
          <HivePanel key={participant.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar
                avatarUrl={participant.avatarUrl}
                firstName={participant.firstName}
                lastName={participant.lastName}
                name={participant.name}
                size="sm"
              />
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  {participant.isCurrentUser ? 'You' : participant.name}
                </p>
                <p className="text-xs text-amber-800/70">
                  Paid {formatCurrency(participant.paid)} · share {formatCurrency(participant.share)}
                </p>
              </div>
            </div>
            <span className={`text-sm font-bold ${participant.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {participant.balance >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(participant.balance))}
            </span>
          </HivePanel>
        ))}
      </div>
    </section>
  )
}

function HiveScreen() {
  const { currentUser, pairingStatus } = useAuth()
  const { profile } = useProfile()
  const { partner } = usePartnerProfile()
  const [view, setView] = useState('shared')
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''
  const { hive, isLoading: hiveLoading } = useHive(hiveId)
  const { expenses, isLoading: expLoading, error, refetch } = useExpenses(hiveId, view)
  const { create, isSubmitting: isCreating } = useCreateExpense(hiveId)
  const { update, isSubmitting: isUpdating } = useUpdateExpense(hiveId)
  const { remove } = useDeleteExpense(hiveId)
  const { balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useHiveBalance(hiveId)
  const { transfers, isLoading: transfersLoading, error: transfersError, refetch: refetchTransfers } = useHiveTransfers(hiveId)
  const {
    notifications,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications,
  } = useHiveNotifications(hiveId)
  const { createTransfer, isSubmitting: isCreatingTransfer } = useCreateTransfer(hiveId)
  const { connectToHive } = useConnectToHive(hiveId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  useEffect(() => {
    if (view !== 'shared') return undefined
    const handle = window.setInterval(() => {
      refetchBalance()
      refetchTransfers()
      refetchNotifications()
    }, 15000)
    return () => window.clearInterval(handle)
  }, [refetchBalance, refetchNotifications, refetchTransfers, view])

  function handleAdd() {
    setEditingExpense(null)
    setModalOpen(true)
  }

  function handleEdit(expense) {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  async function handleDelete(expenseId) {
    if (!window.confirm('Are you sure you want to delete this expense?')) return
    const result = await remove(expenseId)
    if (result.ok) {
      refetch()
      refetchBalance()
    }
  }

  async function handleSubmit(data) {
    let result
    if (editingExpense) {
      result = await update(editingExpense._id, data)
    } else {
      result = await create(data)
    }
    if (result.ok) {
      setModalOpen(false)
      setEditingExpense(null)
      refetch()
      refetchBalance()
    }
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditingExpense(null)
  }

  function handleOpenTransferModal() {
    setTransferModalOpen(true)
  }

  function handleCloseTransferModal() {
    setTransferModalOpen(false)
  }

  async function handleTransferSubmit(data) {
    const result = await createTransfer(data)
    if (!result.ok) {
      window.alert(result.message)
      return
    }

    setTransferModalOpen(false)
    refetchTransfers()
    refetchNotifications()
    refetchBalance()
    if (result.payUrl) {
      window.location.assign(result.payUrl)
    }
  }

  async function handleConnectToHive(expense) {
    const result = await connectToHive(expense._id)
    if (result.ok) {
      refetch()
      refetchBalance()
    } else {
      window.alert(result.message)
    }
  }

  return (
    <HiveLayout
      title="Shared Expenses"
      subtitle="Balance, transfers & hive activity"
      chamberName="Explore Chamber"
      theme="explore"
      profile={profile}
      partner={partner}
      actions={
        <HiveButton type="button" onClick={handleAdd}>
          + Drop nectar
        </HiveButton>
      }
    >
      <div className="space-y-6">
      <BalanceHero hive={hive} isLoading={hiveLoading} profile={profile} partner={partner} balance={balance} />

        {view === 'shared' && (
          <ImbalanceBanner
            balance={balance}
            currentUserId={currentUser?.id}
            isLoading={balanceLoading}
            error={balanceError}
            onSettle={handleOpenTransferModal}
          />
        )}

        <div className="flex items-center justify-between">
          <ViewToggle active={view} onChange={setView} />
          <div className="flex gap-2">
            {view === 'shared' && balance?.suggestedTransfer?.fromUserId === currentUser?.id && (
              <HiveButton type="button" onClick={handleOpenTransferModal}>
                Settle up
              </HiveButton>
            )}
          </div>
        </div>

        {view === 'shared' ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <ContributionChart balance={balance} currentUserId={currentUser?.id} />
              <TransferTimeline
                transfers={transfers}
                isLoading={transfersLoading}
                error={transfersError}
                currentUserId={currentUser?.id}
              />
              <ExpenseList
                expenses={expenses}
                isLoading={expLoading}
                error={error}
                onEdit={handleEdit}
                onDelete={handleDelete}
                showHiveBadge={false}
                title="Shared wax ledger"
              />
            </div>

            <div>
              <HiveNotificationsList
                notifications={notifications}
                isLoading={notificationsLoading}
                error={notificationsError}
              />
            </div>
          </div>
        ) : view === 'balance' ? (
          <BalancePanel balance={balance} isLoading={balanceLoading} error={balanceError} />
        ) : (
          <>
            <HivePanel className="px-4 py-3">
              <p className="text-sm text-[var(--chamber-accent-dark)]">
                🐝 <strong>My Expenses</strong> — personal and shared nectar. Tap the hive icon on personal items to add them to the shared ledger.
              </p>
            </HivePanel>
            <ExpenseList
              expenses={expenses}
              isLoading={expLoading}
              error={error}
              onEdit={undefined}
              onDelete={undefined}
              onConnectToHive={handleConnectToHive}
              title="My nectar log"
            />
          </>
        )}
      </div>

      {modalOpen && (
        <ExpenseFormModal
          expense={editingExpense}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          isSubmitting={isCreating || isUpdating}
        />
      )}

      {transferModalOpen && (
        <TransferModal
          balance={balance}
          onClose={handleCloseTransferModal}
          onSubmit={handleTransferSubmit}
          isSubmitting={isCreatingTransfer}
        />
      )}
    </HiveLayout>
  )
}

export default HiveScreen

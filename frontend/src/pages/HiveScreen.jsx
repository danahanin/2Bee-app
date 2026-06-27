import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ViewToggle, { HiveBalanceHero } from '../components/hive/ViewToggle.jsx'
import HivePanel from '../components/design-system/HivePanel.jsx'
import HexButton from '../components/design-system/HexButton.jsx'
import ExpenseList from '../components/hive/ExpenseList.jsx'
import ExpenseFormModal from '../components/hive/ExpenseFormModal.jsx'
import ScanReceiptModal from '../components/receipt/ScanReceiptModal.jsx'
import ImbalanceBanner from '../components/hive/ImbalanceBanner.jsx'
import ContributionChart from '../components/hive/ContributionChart.jsx'
import TransferTimeline from '../components/hive/TransferTimeline.jsx'
import TransferModal from '../components/hive/TransferModal.jsx'
import HiveNotificationsList from '../components/hive/HiveNotificationsList.jsx'
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
import { useHiveParticipants } from '../hooks/useHiveParticipants.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function BalancePanel({ balance, isLoading, error, currentUserId }) {
  const { participants } = useHiveParticipants(balance, currentUserId)

  if (isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-[var(--honey-50)]" />
        <div className="h-24 animate-pulse rounded-xl bg-[var(--honey-50)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!balance) {
    return (
      <div className="hive-card p-8 text-center">
        <p className="text-sm text-[var(--brown-muted)]">No balance data yet.</p>
      </div>
    )
  }

  const fromUser = participants.find((p) => p.id === balance.suggestedTransfer?.fromUserId)
  const toUser = participants.find((p) => p.id === balance.suggestedTransfer?.toUserId)
  const hasImbalance = balance.remainingImbalance > 0.01 && balance.suggestedTransfer

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <article className="hive-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Shared spend</p>
          <p className="mt-2 text-2xl font-bold text-[var(--brown-text)]">
            {formatCurrency(balance.totalSharedSpend)}
          </p>
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            Split equally: {formatCurrency(balance.equalShare)} each
          </p>
        </article>
        <article className="hive-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Balance</p>
          {hasImbalance ? (
            <p className="mt-2 text-sm font-semibold text-[var(--brown-text)]">
              {fromUser?.isCurrentUser ? 'You' : fromUser?.firstName || 'Partner'} owe{' '}
              {toUser?.isCurrentUser ? 'you' : toUser?.firstName || 'partner'}{' '}
              {formatCurrency(balance.remainingImbalance)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-emerald-700">Everyone is settled up.</p>
          )}
        </article>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div key={participant.id} className="hive-card px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--brown-text)]">
                  {participant.isCurrentUser ? 'You' : `${participant.firstName} ${participant.lastName}`.trim()}
                </p>
                <p className="text-xs text-[var(--brown-muted)]">
                  Paid {formatCurrency(participant.paid)} · share {formatCurrency(balance.equalShare)}
                </p>
              </div>
              <span className={`text-sm font-bold ${(participant.balance ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {(participant.balance ?? 0) >= 0 ? '+' : '-'}
                {formatCurrency(Math.abs(participant.balance ?? 0))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HiveScreen() {
  const [searchParams] = useSearchParams()
  const { currentUser, pairingStatus } = useAuth()
  const initialView = searchParams.get('tab') === 'balance' ? 'balance' : 'shared'
  const [view, setView] = useState(initialView)
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
  const [scanModalOpen, setScanModalOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'settle') {
      setView('shared')
      setTransferModalOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (view !== 'shared') return undefined

    function poll() {
      if (document.visibilityState !== 'visible') return
      refetchBalance()
      refetchTransfers()
      refetchNotifications()
    }

    const handle = window.setInterval(poll, 60000)
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

  function handleOpenTransferModal() {
    setTransferModalOpen(true)
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
    if (result.payUrl) window.location.assign(result.payUrl)
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
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="hive-eyebrow">The Hive</p>
        <h1 className="hive-title text-2xl md:text-3xl">Shared money with your partner</h1>
        {hive ? (
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            {hive.userIds?.length || 0} partners · Created{' '}
            {new Date(hive.createdAt).toLocaleDateString('en-IL', { month: 'short', year: 'numeric' })}
          </p>
        ) : (
          <p className="mt-1 text-sm text-amber-800">
            No Hive connected. Run seed in backend and set twobee_hive_id in localStorage.
          </p>
        )}
      </header>

      <HiveBalanceHero balance={balance} isLoading={balanceLoading || hiveLoading} currentUserId={currentUser?.id} />

      {view === 'shared' && (
        <ImbalanceBanner
          balance={balance}
          currentUserId={currentUser?.id}
          isLoading={balanceLoading}
          error={balanceError}
          onSettle={handleOpenTransferModal}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle active={view} onChange={setView} />
        <div className="flex gap-2">
          {view === 'shared' && balance?.suggestedTransfer?.fromUserId === currentUser?.id && (
            <button
              type="button"
              onClick={handleOpenTransferModal}
              className="rounded-xl border border-[var(--honey-300)] bg-[var(--honey-50)] px-4 py-2 text-sm font-semibold text-[var(--honey-800)] transition hover:bg-[var(--honey-100)]"
            >
              Settle up
            </button>
          )}
          {view === 'shared' && (
            <HexButton onClick={handleAdd} size="sm">
              <span>+</span>
              <span>Add</span>
            </HexButton>
          )}
          {view === 'personal' && (
            <HexButton onClick={() => setScanModalOpen(true)} size="sm">
              <span>📷</span>
              <span>Scan</span>
            </HexButton>
          )}
        </div>
      </div>

      {view === 'shared' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <HivePanel title="Shared expenses" subtitle="Recent hive activity" className="lg:col-span-2">
            <ExpenseList
              expenses={expenses}
              isLoading={expLoading}
              error={error}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showHiveBadge={false}
            />
          </HivePanel>

          <div className="space-y-6">
            <HivePanel title="Transfers" subtitle="Settlement history">
              <TransferTimeline
                transfers={transfers}
                isLoading={transfersLoading}
                error={transfersError}
                currentUserId={currentUser?.id}
              />
            </HivePanel>
            <HiveNotificationsList
              notifications={notifications}
              isLoading={notificationsLoading}
              error={notificationsError}
            />
          </div>

          <HivePanel title="Monthly overview" subtitle="Contribution breakdown" className="lg:col-span-3">
            <ContributionChart balance={balance} currentUserId={currentUser?.id} />
          </HivePanel>
        </div>
      ) : view === 'balance' ? (
        <BalancePanel balance={balance} isLoading={balanceLoading} error={balanceError} currentUserId={currentUser?.id} />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--honey-200)] bg-[var(--honey-50)] px-4 py-3 text-sm text-[var(--honey-800)]">
            Personal and shared expenses. Hover personal items to add them to the Hive.
          </div>
          <ExpenseList
            expenses={expenses}
            isLoading={expLoading}
            error={error}
            onConnectToHive={handleConnectToHive}
          />
        </>
      )}

      {modalOpen && (
        <ExpenseFormModal
          expense={editingExpense}
          onSubmit={handleSubmit}
          onClose={() => {
            setModalOpen(false)
            setEditingExpense(null)
          }}
          isSubmitting={isCreating || isUpdating}
        />
      )}

      {scanModalOpen && (
        <ScanReceiptModal onClose={() => setScanModalOpen(false)} onSaved={refetch} />
      )}

      {transferModalOpen && (
        <TransferModal
          balance={balance}
          onClose={() => setTransferModalOpen(false)}
          onSubmit={handleTransferSubmit}
          isSubmitting={isCreatingTransfer}
        />
      )}
    </div>
  )
}

export default HiveScreen

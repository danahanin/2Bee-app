import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import ViewToggle from '../components/hive/ViewToggle.jsx'
import ExpenseList from '../components/hive/ExpenseList.jsx'
import ExpenseFormModal from '../components/hive/ExpenseFormModal.jsx'
import {
  useHive,
  useHiveBalance,
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '../hooks/useHive.js'

function BalanceHero({ hive, isLoading }) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white">
        <div className="h-4 w-24 rounded bg-white/30" />
        <div className="mt-3 h-8 w-36 rounded bg-white/30" />
      </div>
    )
  }

  if (!hive) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">
          No Hive connected yet. Run <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">npm run seed</code> in the backend
          and save the Hive ID to localStorage key <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">twobee_hive_id</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
      <p className="text-sm font-medium uppercase tracking-wider text-indigo-200">The Hive</p>
      <p className="mt-1 text-3xl font-bold">Shared Account</p>
      <p className="mt-2 text-sm text-indigo-200">
        {hive.userIds?.length || 0} partners &middot; Created{' '}
        {new Date(hive.createdAt).toLocaleDateString('en-IL', { month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

function formatCurrency(value) {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('en-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(amount)
}

function BalancePanel({ balance, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="grid gap-3">
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No balance data yet.</p>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shared spend</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(balance.totalSharedSpend)}</p>
          <p className="mt-1 text-sm text-slate-600">Split equally: {formatCurrency(balance.splitAmount)} each</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance</p>
          {balance.settlements?.length ? (
            <div className="mt-2 space-y-2">
              {balance.settlements.map((settlement) => (
                <p key={`${settlement.from.id}-${settlement.to.id}`} className="text-sm font-semibold text-slate-900">
                  {settlement.from.isCurrentUser ? 'You' : settlement.from.name} owe{' '}
                  {settlement.to.isCurrentUser ? 'you' : settlement.to.name}{' '}
                  {formatCurrency(settlement.amount)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-emerald-700">Everyone is settled up.</p>
          )}
        </article>
      </div>

      <div className="space-y-2">
        {balance.participants?.map((participant) => (
          <div key={participant.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {participant.isCurrentUser ? 'You' : participant.name}
                </p>
                <p className="text-xs text-slate-500">
                  Paid {formatCurrency(participant.paid)} · share {formatCurrency(participant.share)}
                </p>
              </div>
              <span className={`text-sm font-bold ${participant.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {participant.balance >= 0 ? '+' : '-'}
                {formatCurrency(Math.abs(participant.balance))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HiveScreen() {
  const { logout, pairingStatus } = useAuth()
  const [view, setView] = useState('shared')
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''
  const { hive, isLoading: hiveLoading } = useHive(hiveId)
  const { expenses, isLoading: expLoading, error, refetch } = useExpenses(hiveId, view)
  const { balance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useHiveBalance(hiveId)
  const { create, isSubmitting: isCreating } = useCreateExpense(hiveId)
  const { update, isSubmitting: isUpdating } = useUpdateExpense(hiveId)
  const { remove } = useDeleteExpense(hiveId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

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

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              &larr; Back
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">2Bee</p>
              <h1 className="text-xl font-semibold text-slate-900">Hive</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log out
          </button>
        </header>

        <BalanceHero hive={hive} isLoading={hiveLoading} />

        <div className="flex items-center justify-between">
          <ViewToggle active={view} onChange={setView} />
          {view === 'shared' && (
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              + Add Expense
            </button>
          )}
        </div>

        {view === 'personal' ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            This list includes your personal expenses and shared Hive expenses. Shared rows are marked clearly.
          </div>
        ) : null}

        {view === 'balance' ? (
          <BalancePanel balance={balance} isLoading={balanceLoading} error={balanceError} />
        ) : (
          <ExpenseList
            expenses={expenses}
            isLoading={expLoading}
            error={error}
            onEdit={view === 'shared' ? handleEdit : undefined}
            onDelete={view === 'shared' ? handleDelete : undefined}
          />
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
    </main>
  )
}

export default HiveScreen

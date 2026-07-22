import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import BudgetFormModal from '../components/budget/BudgetFormModal.jsx'
import BudgetProgressBar from '../components/budget/BudgetProgressBar.jsx'
import BudgetAlertBanner from '../components/budget/BudgetAlertBanner.jsx'
import GoalFormModal from '../components/goals/GoalFormModal.jsx'
import GoalList from '../components/goals/GoalList.jsx'
import HivePanel from '../components/design-system/HivePanel.jsx'
import MetricCell from '../components/design-system/MetricCell.jsx'
import ExpenseList from '../components/hive/ExpenseList.jsx'
import ScanReceiptModal from '../components/receipt/ScanReceiptModal.jsx'
import DateRangePicker from '../components/analytics/DateRangePicker.jsx'
import SpendingPieChart from '../components/analytics/SpendingPieChart.jsx'
import TrendLineChart from '../components/analytics/TrendLineChart.jsx'
import ComparisonBarChart from '../components/analytics/ComparisonBarChart.jsx'
import { useExpenses } from '../hooks/useHive.js'
import { createBudget, deleteBudget, updateBudget } from '../services/budgetService.js'
import { createGoal, fetchGoals } from '../services/goalService.js'
import { fetchPersonalDashboard } from '../services/dashboardService.js'
import { buildPresetRange } from '../utils/dateRangePresets.js'
import {
  fetchComparison,
  fetchSpendingBreakdown,
  fetchTrends,
} from '../services/analyticsService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'expenses', label: 'All expenses' },
]

function PersonalExpensesPage() {
  const { pairingStatus } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''

  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [budgetModal, setBudgetModal] = useState(null)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all')
  const [presetId, setPresetId] = useState('this-month')
  const [range, setRange] = useState(() => buildPresetRange('this-month'))
  const [breakdown, setBreakdown] = useState(null)
  const [trends, setTrends] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const { expenses, isLoading: expensesLoading, error: expensesError, refetch } = useExpenses(hiveId, 'personal')

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const result = await fetchPersonalDashboard()
      setDashboardData(result)
    } catch {
      setDashboardData(null)
    } finally {
      setDashboardLoading(false)
    }
  }, [])

  const loadGoals = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setGoalsLoading(true)
    try {
      const nextGoals = await fetchGoals('personal')
      setGoals(nextGoals)
    } catch (err) {
      setActionError(err.message || 'Failed to load goals')
    } finally {
      if (showLoading) setGoalsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
    loadGoals()
  }, [loadDashboard, loadGoals])

  async function handleBudgetSubmit(payload) {
    setIsSaving(true)
    setActionError('')
    setActionMessage('')
    try {
      if (budgetModal?.mode === 'edit') {
        await updateBudget(budgetModal.budget.id, {
          limit: payload.limit,
          period: payload.period,
        })
        setActionMessage('Budget updated.')
      } else {
        await createBudget(payload)
        setActionMessage('Budget created.')
      }
      setBudgetModal(null)
      await loadDashboard()
    } catch (err) {
      setActionError(err.message || 'Failed to save budget')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleBudgetDelete(budgetId) {
    if (!window.confirm('Delete this budget?')) return
    setActionError('')
    setActionMessage('')
    try {
      await deleteBudget(budgetId)
      setActionMessage('Budget deleted.')
      await loadDashboard()
    } catch (err) {
      setActionError(err.message || 'Failed to delete budget')
    }
  }

  async function handleGoalSubmit(payload) {
    setIsSaving(true)
    setActionError('')
    setActionMessage('')
    try {
      const created = await createGoal(payload)
      setGoalModalOpen(false)
      setActionMessage('Goal created.')
      if (created?.id && !created.hiveId) {
        setGoals((prev) => {
          if (prev.some((goal) => goal.id === created.id)) return prev
          return [...prev, created]
        })
      }
      await loadGoals({ showLoading: false })
    } catch (err) {
      setActionError(err.message || 'Failed to create goal')
    } finally {
      setIsSaving(false)
    }
  }

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const [breakdownData, trendsData, comparisonData] = await Promise.all([
        fetchSpendingBreakdown({ type: 'personal', from: range.from, to: range.to }),
        fetchTrends({ type: 'personal', from: range.from, to: range.to, months: range.months }),
        fetchComparison({ type: 'personal' }),
      ])
      setBreakdown(breakdownData)
      setTrends(trendsData)
      setComparison(comparisonData)
    } catch {
      setBreakdown(null)
      setTrends(null)
      setComparison(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [range.from, range.to, range.months])

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, loadAnalytics])

  const categories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses
    return expenses.filter((e) => e.category === categoryFilter)
  }, [expenses, categoryFilter])

  function setTab(tab) {
    setSearchParams(tab === 'overview' ? {} : { tab })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="hive-eyebrow">Personal Expenses</p>
          <h1 className="hive-title text-xl sm:text-2xl md:text-3xl">Your spending dashboard</h1>
          <p className="mt-1 text-sm text-[var(--brown-muted)]">
            Track categories, analyze trends, and manage personal expenses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="hive-btn-primary min-h-11 w-full rounded-xl px-4 py-2.5 text-sm sm:w-auto"
        >
          + Add expense
        </button>
      </header>

      <div className="flex w-full gap-1 rounded-xl border border-[rgba(61,41,20,0.1)] bg-[var(--honey-50)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`min-h-10 flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] text-white shadow-md'
                : 'text-[var(--brown-text)] hover:bg-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      {activeTab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <MetricCell
              label="Monthly spend"
              value={
                dashboardLoading
                  ? '...'
                  : formatCurrency(dashboardData?.totalSpendThisMonth ?? 0, { maximumFractionDigits: 0 })
              }
              subtitle="Personal expenses"
            />
            <MetricCell
              label="Top category"
              value={dashboardData?.topCategory?.category || 'N/A'}
              subtitle={
                dashboardData?.topCategory
                  ? formatCurrency(dashboardData.topCategory.amount)
                  : 'No spending yet'
              }
            />
            <MetricCell
              label="Budgets"
              value={String(dashboardData?.budgetStatus?.length || 0)}
              subtitle="Tracked this month"
            />
          </section>

          <BudgetAlertBanner budgetStatus={dashboardData?.budgetStatus || []} />

          <HivePanel
            title="Savings goals"
            subtitle="Track what you are saving toward"
            action={
              <button
                type="button"
                onClick={() => setGoalModalOpen(true)}
                className="w-full rounded-xl bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
              >
                Add goal
              </button>
            }
          >
            <GoalList goals={goals} isLoading={goalsLoading} onAddGoal={() => setGoalModalOpen(true)} />
          </HivePanel>

          <HivePanel
            title="Budget status"
            subtitle="Personal budget tracking"
            action={
              <button
                type="button"
                onClick={() => setBudgetModal({ mode: 'create' })}
                className="w-full rounded-xl bg-gradient-to-r from-[var(--honey-400)] to-[var(--honey-600)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
              >
                Add budget
              </button>
            }
          >
            {dashboardLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[var(--honey-50)]" />
            ) : dashboardData?.budgetStatus?.length ? (
              <div className="space-y-3">
                {dashboardData.budgetStatus.map((item) => {
                  const isWarning = item.alertLevel === 'warning'
                  const isCritical = item.alertLevel === 'critical'
                  const rowBorder = isCritical
                    ? 'border-rose-200'
                    : isWarning
                      ? 'border-[var(--honey-300)]'
                      : 'border-[rgba(61,41,20,0.08)]'
                  const rowBg = isCritical
                    ? 'bg-rose-50'
                    : isWarning
                      ? 'bg-[var(--honey-50)]'
                      : 'bg-white'

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border ${rowBorder} ${rowBg} p-3`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold capitalize text-[var(--brown-text)]">{item.category}</p>
                        <div className="flex items-center gap-2">
                          {isWarning || isCritical ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-[var(--honey-100)] text-[var(--honey-800)]'
                              }`}
                            >
                              {isCritical ? 'Limit reached' : 'Near limit'}
                            </span>
                          ) : null}
                          <p className="text-sm text-[var(--brown-muted)]">{item.percentUsed}% used</p>
                          <button
                            type="button"
                            onClick={() => setBudgetModal({ mode: 'edit', budget: item })}
                            className="text-xs font-semibold text-[var(--honey-800)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBudgetDelete(item.id)}
                            className="text-xs font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-[var(--brown-muted)]">
                        {formatCurrency(item.spent)} / {formatCurrency(item.limit)} ({item.period})
                      </p>
                      <div className="mt-3">
                        <BudgetProgressBar percentUsed={item.percentUsed} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--brown-muted)]">No personal budgets yet.</p>
            )}
          </HivePanel>
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <DateRangePicker
            presetId={presetId}
            from={range.from}
            to={range.to}
            onPresetChange={(id) => {
              setPresetId(id)
              setRange(buildPresetRange(id))
            }}
            onCustomRangeChange={({ from, to }) => {
              setPresetId('custom')
              setRange((prev) => ({ ...prev, from: from || prev.from, to: to || prev.to }))
            }}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <HivePanel title="Spending breakdown" subtitle="By category" className="min-w-0">
              {analyticsLoading ? (
                <div className="h-56 animate-pulse rounded-xl bg-[var(--honey-50)] sm:h-72" />
              ) : (
                <SpendingPieChart breakdown={breakdown?.breakdown} total={breakdown?.total} />
              )}
            </HivePanel>
            <HivePanel title="Monthly trends" subtitle="Top categories over time" className="min-w-0">
              {analyticsLoading ? (
                <div className="h-56 animate-pulse rounded-xl bg-[var(--honey-50)] sm:h-72" />
              ) : (
                <TrendLineChart months={trends?.months} series={trends?.series} />
              )}
            </HivePanel>
          </div>
          <HivePanel title="Month comparison" subtitle="Current vs previous month" className="min-w-0">
            {analyticsLoading ? (
              <div className="h-56 animate-pulse rounded-xl bg-[var(--honey-50)] sm:h-72" />
            ) : (
              <ComparisonBarChart
                categories={comparison?.categories}
                currentLabel={comparison?.currentMonth?.key ?? 'Current'}
                previousLabel={comparison?.previousMonth?.key ?? 'Previous'}
              />
            )}
          </HivePanel>
        </>
      )}

      {activeTab === 'expenses' && (
        <HivePanel
          title="All personal expenses"
          subtitle="Filter by category"
          action={
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition ${
                    categoryFilter === cat
                      ? 'bg-[var(--honey-400)] text-white'
                      : 'bg-[var(--honey-50)] text-[var(--brown-muted)] hover:bg-[var(--honey-100)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          }
        >
          <ExpenseList
            expenses={filteredExpenses}
            isLoading={expensesLoading}
            error={expensesError}
            showHiveBadge
          />
        </HivePanel>
      )}

      {scanOpen ? (
        <ScanReceiptModal
          onClose={() => setScanOpen(false)}
          onSaved={() => {
            refetch()
            loadDashboard()
          }}
        />
      ) : null}

      {budgetModal ? (
        <BudgetFormModal
          budget={budgetModal.mode === 'edit' ? budgetModal.budget : null}
          budgetType="personal"
          onSubmit={handleBudgetSubmit}
          onClose={() => setBudgetModal(null)}
          isSubmitting={isSaving}
        />
      ) : null}

      {goalModalOpen ? (
        <GoalFormModal
          onSubmit={handleGoalSubmit}
          onClose={() => setGoalModalOpen(false)}
          isSubmitting={isSaving}
        />
      ) : null}
    </div>
  )
}

export default PersonalExpensesPage

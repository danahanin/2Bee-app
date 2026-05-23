import { useEffect, useState } from 'react'

const CATEGORY_ICONS = {
  groceries: 'GR',
  rent: 'RE',
  utilities: 'UT',
  dining: 'DI',
  transport: 'TR',
  entertainment: 'EN',
  travel: 'TV',
  health: 'HE',
  subscriptions: 'SU',
  shopping: 'SH',
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function SharedCategoriesSettings({ availableCategories, selectedCategories, loading, isSaving, onSave }) {
  const [selected, setSelected] = useState(selectedCategories || [])

  useEffect(() => {
    setSelected(selectedCategories || [])
  }, [selectedCategories])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  async function toggleCategory(category) {
    if (isSaving) return

    const previous = selected
    const next = previous.includes(category)
      ? previous.filter((item) => item !== category)
      : [...previous, category]

    setSelected(next)
    const result = await onSave(next)
    if (!result.ok) {
      setSelected(previous)
      return
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">Shared Expense Categories</h3>
      <p className="text-sm text-slate-600">
        Expenses in these categories will be automatically suggested as shared.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {availableCategories.map((category) => {
          const isSelected = selected.includes(category)
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              disabled={isSaving}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
              }`}
            >
              <span className="mr-1.5 inline-flex min-w-6 justify-center rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold">
                {CATEGORY_ICONS[category] || '--'}
              </span>
              {titleCase(category)}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">Changes are saved automatically.</span>
      </div>
    </section>
  )
}

export default SharedCategoriesSettings

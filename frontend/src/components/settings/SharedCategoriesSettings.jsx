import { useEffect, useState } from 'react'

const CATEGORY_EMOJI = {
  groceries: '🛒', rent: '🏠', utilities: '💡', dining: '🍽️', transport: '🚗',
  entertainment: '🎬', travel: '✈️', health: '💊', subscriptions: '📺', shopping: '🛍️',
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="hive-skeleton h-12" />
        ))}
      </div>
    )
  }

  async function toggleCategory(category) {
    if (isSaving) return
    const previous = selected
    const next = previous.includes(category) ? previous.filter((item) => item !== category) : [...previous, category]
    setSelected(next)
    const result = await onSave(next)
    if (!result.ok) setSelected(previous)
  }

  return (
    <section className="space-y-3">
      <p className="hive-panel-sub">Tap categories that should default to shared in the hive.</p>
      <div className="hive-chip-grid">
        {availableCategories.map((category) => {
          const isSelected = selected.includes(category)
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              disabled={isSaving}
              className={`hive-chip ${isSelected ? 'hive-chip-active' : ''}`}
            >
              <span>{CATEGORY_EMOJI[category] || '📌'}</span>
              {titleCase(category)}
            </button>
          )
        })}
      </div>
      <p className="text-xs opacity-60">Changes save automatically.</p>
    </section>
  )
}

export default SharedCategoriesSettings

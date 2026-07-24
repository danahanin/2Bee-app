import { useEffect } from 'react'
import HivePanel from '../design-system/HivePanel.jsx'
import { useNeedsReview } from '../../hooks/useAI.js'
import NeedsReviewItem from './NeedsReviewItem.jsx'

// Bank-synced expenses are saved right away so nothing is ever dropped, but their
// AI-guessed category/type sit here as "needsReview" until the user confirms them.
function NeedsReviewPanel() {
  const { items, loading, fetch, resolve } = useNeedsReview()

  useEffect(() => {
    fetch()
  }, [fetch])

  if (!loading && items.length === 0) return null

  return (
    <HivePanel
      title="Needs your review"
      subtitle="Bank-synced expenses the AI classified — confirm or correct them"
    >
      {loading && items.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--honey-50)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((expense) => (
            <NeedsReviewItem key={expense._id} expense={expense} onResolve={resolve} />
          ))}
        </div>
      )}
    </HivePanel>
  )
}

export default NeedsReviewPanel

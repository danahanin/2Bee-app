const TONE_CLASSES = {
  default: 'bg-[var(--honey-50)] text-[var(--honey-800)]',
  personal: 'bg-emerald-50 text-emerald-800',
  shared: 'bg-indigo-50 text-indigo-800',
}

// A small "AI suggests: X" pill with an explicit Apply action. Suggestions are
// never applied to a form automatically — the user always has to click Apply.
function SuggestionBadge({ label, confidence, tone = 'default', onApply, applyLabel = 'Use' }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone] || TONE_CLASSES.default}`}>
      <span aria-hidden="true">✨</span>
      <span>{label}</span>
      {confidence != null && <span className="opacity-70">({Math.round(confidence * 100)}%)</span>}
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="ml-0.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold hover:bg-white"
        >
          {applyLabel}
        </button>
      )}
    </span>
  )
}

export default SuggestionBadge

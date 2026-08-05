const TONE_CLASSES = {
  default: 'bg-[var(--honey-50)] text-[var(--honey-800)]',
  personal: 'bg-emerald-50 text-emerald-800',
  shared: 'bg-indigo-50 text-indigo-800',
  fallback: 'bg-amber-100 text-amber-800',
}

// A single self-contained suggestion pill: icon, label, confidence, and an explicit
// Apply action. Tone and icon should reflect whether the value came from the AI
// model or a rule-based fallback — never pair this with a second badge that repeats
// or contradicts that signal.
function SuggestionBadge({ label, confidence, tone = 'default', icon = '✨', onApply, applyLabel = 'Use' }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone] || TONE_CLASSES.default}`}>
      <span aria-hidden="true">{icon}</span>
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

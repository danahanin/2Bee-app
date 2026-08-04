import { isFallback } from '../../utils/aiSource.js'

function SourceBadge({ source }) {
  if (!source) return null

  const fallback = isFallback(source)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        fallback ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
      }`}
    >
      {fallback ? 'AI unavailable' : 'AI model'}
    </span>
  )
}

export default SourceBadge

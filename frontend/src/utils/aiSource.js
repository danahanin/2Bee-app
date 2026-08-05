function isFallback(source) {
  return source === 'fallback'
}

function cleanReasoning(text) {
  if (!text) return text
  return text.replace(/^\[fallback\]\s*/, '')
}

function suggestionLabel(source, value) {
  return isFallback(source) ? `AI unavailable: ${value}` : `AI suggests: ${value}`
}

function suggestionIcon(source) {
  return isFallback(source) ? '⚠️' : '✨'
}

function suggestionTone(source) {
  return isFallback(source) ? 'fallback' : 'default'
}

export { isFallback, cleanReasoning, suggestionLabel, suggestionIcon, suggestionTone }

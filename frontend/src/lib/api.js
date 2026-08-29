export const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  if (!path.startsWith('/')) {
    return `${API_BASE}/${path}`
  }
  return `${API_BASE}${path}`
}

// Bundled assets such as /avatars/builtin ship inside the app and must stay
// relative. Only files the backend serves need the API origin prepended.
export function assetUrl(path) {
  if (!path) return path
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  if (path.startsWith('/uploads/')) return apiUrl(path)
  return path
}

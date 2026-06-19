import { apiUrl } from '../lib/api.js'

function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth')
  if (stored) {
    const { token } = JSON.parse(stored)
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      search.set(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function fetchAnalytics(path, params) {
  const res = await fetch(apiUrl(`${path}${buildQuery(params)}`), {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = body?.error?.message || `Failed to fetch analytics (${res.status})`
    throw new Error(message)
  }
  return res.json()
}

export function fetchSpendingBreakdown({ type, from, to }) {
  return fetchAnalytics('/analytics/spending-breakdown', { type, from, to })
}

export function fetchTrends({ type, from, to, months }) {
  return fetchAnalytics('/analytics/trends', { type, from, to, months })
}

export function fetchComparison({ type }) {
  return fetchAnalytics('/analytics/comparison', { type })
}

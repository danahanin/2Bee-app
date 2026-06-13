import { apiUrl } from '../lib/api.js'

function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth')
  if (stored) {
    const parsed = JSON.parse(stored)
    const token = parsed.accessToken || parsed.token
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  }
  return {}
}

async function fetchDashboard(path, period = 'month') {
  const params = new URLSearchParams({ period })
  const res = await fetch(apiUrl(`${path}?${params}`), { headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard data (${res.status})`)
  }
  return res.json()
}

export function fetchPersonalDashboard(period = 'month') {
  return fetchDashboard('/dashboard/personal', period)
}

export function fetchSharedDashboard(period = 'month') {
  return fetchDashboard('/dashboard/shared', period)
}

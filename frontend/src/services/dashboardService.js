import { apiUrl } from '../lib/api.js'

function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth')
  if (stored) {
    const { token } = JSON.parse(stored)
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

async function fetchDashboard(path) {
  const res = await fetch(apiUrl(path), { headers: getAuthHeaders() })
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard data (${res.status})`)
  }
  return res.json()
}

export function fetchPersonalDashboard() {
  return fetchDashboard('/dashboard/personal')
}

export function fetchSharedDashboard() {
  return fetchDashboard('/dashboard/shared')
}

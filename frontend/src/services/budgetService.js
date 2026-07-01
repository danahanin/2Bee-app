import { apiUrl } from '../lib/api.js'

function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth')
  if (stored) {
    const { token } = JSON.parse(stored)
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

async function request(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error?.message || `Budget request failed (${res.status})`)
  }
  return body
}

export function fetchBudgets(type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : ''
  return request(`/budgets${query}`)
}

export function createBudget(payload) {
  return request('/budgets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBudget(id, payload) {
  return request(`/budgets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteBudget(id) {
  return request(`/budgets/${id}`, {
    method: 'DELETE',
  })
}

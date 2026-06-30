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
    throw new Error(body?.error?.message || `Goal request failed (${res.status})`)
  }
  return body
}

function parseGoalsList(body) {
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.goals)) return body.goals
  return []
}

export function fetchGoals(scope = 'personal') {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return request(`/goals${query}`).then(parseGoalsList)
}

export function createGoal(payload) {
  return request('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function goalFromSuggestion(suggestion) {
  const deadline = new Date()
  deadline.setUTCMonth(deadline.getUTCMonth() + 6)

  return {
    title: suggestion.title,
    targetAmount: suggestion.targetAmount,
    currentAmount: 0,
    deadline: deadline.toISOString(),
    category: suggestion.category || undefined,
  }
}

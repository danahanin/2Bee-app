import { apiUrl } from '../lib/api.js'

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function generatePairCode(token) {
  const res = await fetch(apiUrl('/api/pair/generate'), {
    method: 'POST',
    headers: getAuthHeaders(token),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to generate pair code')
  }

  return data
}

export async function joinPairCode(token, code) {
  const res = await fetch(apiUrl('/api/pair/join'), {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ code }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to join pair code')
  }

  return data
}

export async function fetchPairStatus(token) {
  const res = await fetch(apiUrl('/api/pair/status'), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch pair status')
  }

  return data
}

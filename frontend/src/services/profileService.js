import { apiUrl } from '../lib/api.js'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function getProfile(token) {
  const res = await fetch(apiUrl('/api/profile'), {
    method: 'GET',
    headers: authHeaders(token),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to load profile')
  }

  return data
}

export async function updateProfile(token, profile) {
  const res = await fetch(apiUrl('/api/profile'), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(profile),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to update profile')
  }

  return data.user
}

export async function connectBank(token, redirectUrl) {
  const res = await fetch(apiUrl('/api/bank/connect'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ redirectUrl }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to connect bank account')
  }

  return data
}

export async function disconnectBank(token) {
  const res = await fetch(apiUrl('/api/bank'), {
    method: 'DELETE',
    headers: authHeaders(token),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to disconnect bank account')
  }

  return data
}

export async function confirmBankConnection(token, { connectionId, status } = {}) {
  const body = {}
  if (connectionId) body.connectionId = connectionId
  if (status) body.status = status

  const res = await fetch(apiUrl('/api/bank/confirm'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to confirm bank connection')
  }

  return data
}

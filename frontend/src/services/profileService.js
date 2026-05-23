import { apiUrl } from '../lib/api.js'

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
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

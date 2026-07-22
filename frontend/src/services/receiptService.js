import { apiUrl } from '../lib/api.js'

function authHeaders(token, { json = false } = {}) {
  const headers = { Authorization: `Bearer ${token}` }
  if (json) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

async function requestData(url, options, fallbackMessage) {
  const res = await fetch(url, options)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error?.message || fallbackMessage)
  }
  return body?.data
}

export async function scanReceipt(token, file) {
  const formData = new FormData()
  formData.append('image', file)

  return requestData(
    apiUrl('/receipts/scan'),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    },
    'Failed to scan receipt',
  )
}

export async function classifyFromReceipt(token, extracted) {
  return requestData(
    apiUrl('/ai/classify-from-receipt'),
    {
      method: 'POST',
      headers: authHeaders(token, { json: true }),
      body: JSON.stringify(extracted),
    },
    'Failed to classify receipt',
  )
}

export async function confirmReceipt(token, payload) {
  return requestData(
    apiUrl('/receipts/confirm'),
    {
      method: 'POST',
      headers: authHeaders(token, { json: true }),
      body: JSON.stringify(payload),
    },
    'Failed to save receipt expense',
  )
}

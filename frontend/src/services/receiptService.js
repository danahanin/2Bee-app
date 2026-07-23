// Temporary local uploader for the receipt-scan flow. Replace with Michelle's
// shared receiptService/useReceiptScan module when it lands.

async function parseApiError(res, fallbackMessage) {
  const body = await res.json().catch(() => null)
  return body?.error?.message || fallbackMessage
}

export async function scanReceipt(token, file) {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch('/receipts/scan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to scan receipt'))
  }

  const body = await res.json()
  return body.data
}

export async function classifyFromReceipt(token, extracted) {
  const res = await fetch('/ai/classify-from-receipt', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(extracted),
  })

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to classify receipt'))
  }

  const body = await res.json()
  return body.data
}

export async function confirmReceipt(token, payload) {
  const res = await fetch('/receipts/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to save receipt expense'))
  }

  const body = await res.json()
  return body.data
}

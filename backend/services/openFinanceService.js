const { AppError } = require('../utils/appError')

const OPEN_FINANCE_API_URL = process.env.OPEN_FINANCE_API_URL || 'https://api.open-finance.ai'
const OPEN_FINANCE_CLIENT_ID = process.env.OPEN_FINANCE_CLIENT_ID || ''
const OPEN_FINANCE_CLIENT_SECRET = process.env.OPEN_FINANCE_CLIENT_SECRET || ''
const OPEN_FINANCE_USER_ID = process.env.OPEN_FINANCE_USER_ID || ''
const OPEN_FINANCE_SYNC_INTERVAL_MS = Number(process.env.OPEN_FINANCE_SYNC_INTERVAL_MS || 15000)

let cachedToken = null

function isConfigured() {
  return Boolean(OPEN_FINANCE_CLIENT_ID && OPEN_FINANCE_CLIENT_SECRET && OPEN_FINANCE_USER_ID)
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new AppError(
      503,
      'OPEN_FINANCE_NOT_CONFIGURED',
      'Open Finance credentials are missing. Set OPEN_FINANCE_CLIENT_ID, OPEN_FINANCE_CLIENT_SECRET, and OPEN_FINANCE_USER_ID.'
    )
  }
}

async function parseJson(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

async function requestAccessToken() {
  ensureConfigured()

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }

  const response = await fetch(`${OPEN_FINANCE_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: OPEN_FINANCE_USER_ID,
      clientId: OPEN_FINANCE_CLIENT_ID,
      clientSecret: OPEN_FINANCE_CLIENT_SECRET,
    }),
  })

  const payload = await parseJson(response)
  if (!response.ok || !payload?.accessToken) {
    throw new AppError(
      502,
      'OPEN_FINANCE_TOKEN_ERROR',
      payload?.message || 'Failed to retrieve Open Finance access token.'
    )
  }

  cachedToken = {
    value: payload.accessToken,
    expiresAt: Date.now() + (Number(payload.expiresIn || 3600) * 1000),
  }

  return cachedToken.value
}

async function openFinanceFetch(path, options = {}) {
  const token = await requestAccessToken()
  const response = await fetch(`${OPEN_FINANCE_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new AppError(
      502,
      'OPEN_FINANCE_REQUEST_FAILED',
      payload?.message || payload?.error_description || 'Open Finance request failed.',
      payload
    )
  }

  return payload
}

function normalizeTransferStatus(providerStatus) {
  switch (providerStatus) {
    case 'ACCC':
    case 'ACSC':
      return 'completed'
    case 'RJCT':
    case 'ERROR':
      return 'failed'
    case 'CANC':
      return 'cancelled'
    default:
      return 'pending'
  }
}

async function createPayment({
  amount,
  description,
  providerId,
  psuId,
  debtorAccountType,
  debtorAccountNumber,
  debtorName,
  creditorAccountType,
  creditorAccountNumber,
  creditorName,
  includeFakeProviders = false,
  redirectUrl,
}) {
  const payload = await openFinanceFetch('/v2/payments', {
    method: 'POST',
    body: JSON.stringify({
      providerIds: providerId ? [providerId] : undefined,
      psuId,
      includeFakeProviders,
      redirectUrl,
      paymentInformation: {
        amount,
        currency: 'ILS',
        description,
        debtorAccountType,
        debtorAccountNumber,
        debtorName,
        creditorAccountType,
        creditorAccountNumber,
        creditorName,
      },
    }),
  })

  return {
    paymentId: payload.id,
    payUrl: payload.payUrl,
    providerStatus: payload.status || 'INIT',
  }
}

async function getPaymentStatus(paymentId) {
  const payload = await openFinanceFetch(`/v2/payments/${paymentId}`, { method: 'GET' })
  return {
    providerStatus: payload?.status || payload?.paymentStatus || 'PENDING',
    providerMessage: payload?.message || payload?.paymentError?.message || '',
    raw: payload,
  }
}

async function fetchAccountTransactions(accountId, { from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('dateFrom', from)
  if (to) params.set('dateTo', to)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const payload = await openFinanceFetch(`/v2/accounts/${accountId}/transactions${qs}`, {
    method: 'GET',
  })

  const raw = payload?.transactions || payload?.booked || payload || []
  return Array.isArray(raw) ? raw : []
}

module.exports = {
  OPEN_FINANCE_SYNC_INTERVAL_MS,
  createPayment,
  getPaymentStatus,
  fetchAccountTransactions,
  isConfigured,
  normalizeTransferStatus,
}

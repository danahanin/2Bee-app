const { AppError } = require('../utils/appError')

const OPEN_FINANCE_API_URL = process.env.OPEN_FINANCE_API_URL || 'https://api.open-finance.ai'
const OPEN_FINANCE_CLIENT_ID = process.env.OPEN_FINANCE_CLIENT_ID || ''
const OPEN_FINANCE_CLIENT_SECRET = process.env.OPEN_FINANCE_CLIENT_SECRET || ''
const OPEN_FINANCE_SYNC_INTERVAL_MS = Number(process.env.OPEN_FINANCE_SYNC_INTERVAL_MS || 15000)

/** @type {Map<string, { value: string, expiresAt: number }>} */
const tokenCacheByUserId = new Map()

function isConfigured() {
  return Boolean(OPEN_FINANCE_CLIENT_ID && OPEN_FINANCE_CLIENT_SECRET)
}

function ensureConfigured() {
  if (!isConfigured()) {
    throw new AppError(
      503,
      'OPEN_FINANCE_NOT_CONFIGURED',
      'Open Finance credentials are missing. Set OPEN_FINANCE_CLIENT_ID and OPEN_FINANCE_CLIENT_SECRET.',
    )
  }
}

function resolveOpenFinanceUserId(openFinanceUserId) {
  const value = typeof openFinanceUserId === 'string' ? openFinanceUserId.trim() : ''
  if (!value) {
    throw new AppError(
      400,
      'OPEN_FINANCE_USER_REQUIRED',
      'A user email is required to authenticate with Open Finance.',
    )
  }
  return value
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

async function requestAccessToken(openFinanceUserId) {
  ensureConfigured()
  const userId = resolveOpenFinanceUserId(openFinanceUserId)

  const cachedToken = tokenCacheByUserId.get(userId)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }

  const response = await fetch(`${OPEN_FINANCE_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      clientId: OPEN_FINANCE_CLIENT_ID,
      clientSecret: OPEN_FINANCE_CLIENT_SECRET,
    }),
  })

  const payload = await parseJson(response)
  if (!response.ok || !payload?.accessToken) {
    throw new AppError(
      502,
      'OPEN_FINANCE_TOKEN_ERROR',
      payload?.message || 'Failed to retrieve Open Finance access token.',
    )
  }

  tokenCacheByUserId.set(userId, {
    value: payload.accessToken,
    expiresAt: Date.now() + Number(payload.expiresIn || 3600) * 1000,
  })

  return payload.accessToken
}

async function openFinanceFetch(path, options = {}) {
  const { openFinanceUserId, ...fetchOptions } = options
  const token = await requestAccessToken(openFinanceUserId)
  const response = await fetch(`${OPEN_FINANCE_API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(fetchOptions.headers || {}),
    },
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new AppError(
      502,
      'OPEN_FINANCE_REQUEST_FAILED',
      payload?.message || payload?.error_description || 'Open Finance request failed.',
      payload,
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
  openFinanceUserId,
}) {
  const payload = await openFinanceFetch('/v2/payments', {
    openFinanceUserId,
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

async function createBankConnection({ redirectUrl, openFinanceUserId } = {}) {
  const payload = await openFinanceFetch('/v2/connections', {
    openFinanceUserId,
    method: 'POST',
    body: JSON.stringify({
      includeFakeProviders: true,
      language: 'en',
      redirectUrl: redirectUrl || undefined,
    }),
  })

  return {
    connectionId: payload.id,
    connectUrl: payload.connectUrl || payload.payUrl || '',
  }
}

async function getPaymentStatus(paymentId, { openFinanceUserId } = {}) {
  const payload = await openFinanceFetch(`/v2/payments/${paymentId}`, {
    openFinanceUserId,
    method: 'GET',
  })
  return {
    providerStatus: payload?.status || payload?.paymentStatus || 'PENDING',
    providerMessage: payload?.message || payload?.paymentError?.message || '',
    raw: payload,
  }
}

async function fetchAccounts({ openFinanceUserId } = {}) {
  const payload = await openFinanceFetch('/v2/data/accounts', {
    openFinanceUserId,
    method: 'GET',
  })

  // Real response shape is `{ nextPage, items: Account[] }` — Account has no
  // "bank name" field, only `providerId` (e.g. "open-finance-sandbox") and an
  // optional `accountName`.
  const raw = payload?.items || payload?.accounts || payload || []
  const list = Array.isArray(raw) ? raw : []
  return list.map((account) => ({
    accountId: account.id || account.accountId || account.resourceId || null,
    bankName: account.accountName || account.providerId || account.institutionName || '',
    accountType: account.accountType || null,
    raw: account,
  }))
}

// The provider's real schema nests everything (amount/description/date), so
// normalize each transaction into the flat shape the rest of the app expects.
function normalizeTransaction(tx) {
  return {
    transactionId: tx.id || tx.SK || null,
    amount: tx.amount?.originalAmount?.amount ?? tx.amount?.chargedAmount?.amount ?? 0,
    currency: tx.amount?.originalAmount?.currency || tx.amount?.chargedAmount?.currency || 'ILS',
    description: tx.description?.description || tx.merchantName || tx.description?.additionalInfo || '',
    category: tx.category?.main || tx.category?.sub || '',
    bookingDate: tx.date?.bookingDate || tx.date?.valueDate || tx.date?.transactionDate || null,
    valueDate: tx.date?.valueDate || null,
    raw: tx,
  }
}

async function fetchAccountTransactions(accountId, { from, to, openFinanceUserId } = {}) {
  const params = new URLSearchParams()
  if (accountId) params.set('accountId', accountId)
  // dateFrom/dateTo and limit are mutually exclusive on this endpoint.
  if (from) params.set('dateFrom', from)
  if (to) params.set('dateTo', to)
  const qs = params.toString() ? `?${params.toString()}` : ''

  const payload = await openFinanceFetch(`/v2/data/transactions${qs}`, {
    openFinanceUserId,
    method: 'GET',
  })

  const raw = payload?.items || payload?.transactions || payload?.booked || payload || []
  const list = Array.isArray(raw) ? raw : []
  return list.map(normalizeTransaction)
}

module.exports = {
  OPEN_FINANCE_SYNC_INTERVAL_MS,
  createPayment,
  createBankConnection,
  getPaymentStatus,
  fetchAccounts,
  fetchAccountTransactions,
  isConfigured,
  normalizeTransferStatus,
}

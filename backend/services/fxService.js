/**
 * Foreign exchange rate service — Dana Hanin
 *
 * Rates are always expressed as "1 BASE_CURRENCY = rate[CODE] CODE", matching
 * the shape returned by https://www.exchangerate-api.com (open.er-api.com).
 *
 * The live API is fetched at most once per CACHE_TTL_MS and cached in memory.
 * If the fetch fails (offline, rate-limited, bad response) we fall back to a
 * static table so the app never breaks because of a network hiccup.
 */

const BASE_CURRENCY = 'ILS'
const RATES_URL = `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// Approximate fallback rates (1 ILS in each currency), used when the live
// API is unreachable. Close enough to keep aggregates meaningful; not meant
// to be exact.
const STATIC_RATES = {
  ILS: 1,
  USD: 0.27,
  EUR: 0.25,
}

let cache = {
  rates: STATIC_RATES,
  fetchedAt: 0,
}

function isCacheFresh() {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

async function fetchRates() {
  const response = await fetch(RATES_URL)
  if (!response.ok) {
    throw new Error(`FX API responded with status ${response.status}`)
  }

  const body = await response.json()
  if (!body?.rates || typeof body.rates !== 'object') {
    throw new Error('FX API response missing rates')
  }

  return { ...STATIC_RATES, ...body.rates }
}

async function getRates() {
  if (isCacheFresh()) {
    return cache.rates
  }

  try {
    const rates = await fetchRates()
    cache = { rates, fetchedAt: Date.now() }
  } catch (error) {
    console.error('[fxService] Falling back to static rates:', error.message)
    cache = { rates: STATIC_RATES, fetchedAt: Date.now() }
  }

  return cache.rates
}

async function getRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1

  const rates = await getRates()
  const fromRate = rates[fromCurrency] ?? STATIC_RATES[fromCurrency] ?? 1
  const toRate = rates[toCurrency] ?? STATIC_RATES[toCurrency] ?? 1

  // rates[code] is "1 BASE = rates[code] CODE", so converting from->to goes
  // through BASE: amount / fromRate gives BASE, times toRate gives target.
  return toRate / fromRate
}

async function convert(amount, fromCurrency, toCurrency) {
  const rate = await getRate(fromCurrency, toCurrency)
  return Number(amount) * rate
}

module.exports = {
  BASE_CURRENCY,
  STATIC_RATES,
  getRates,
  getRate,
  convert,
}

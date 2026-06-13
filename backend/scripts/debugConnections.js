const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const OPEN_FINANCE_API_URL = process.env.OPEN_FINANCE_API_URL || 'https://api.open-finance.ai'
const OPEN_FINANCE_CLIENT_ID = process.env.OPEN_FINANCE_CLIENT_ID || ''
const OPEN_FINANCE_CLIENT_SECRET = process.env.OPEN_FINANCE_CLIENT_SECRET || ''

const DEMO_USERS = ['user_demo_1', 'user_demo_2']

async function getAccessToken(userId) {
  const response = await fetch(`${OPEN_FINANCE_API_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      clientId: OPEN_FINANCE_CLIENT_ID,
      clientSecret: OPEN_FINANCE_CLIENT_SECRET,
    }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload?.message || 'Token error')
  return payload.accessToken
}

async function getConnections(userId) {
  const token = await getAccessToken(userId)
  const response = await fetch(`${OPEN_FINANCE_API_URL}/v2/connections`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

async function getAccounts(userId) {
  const token = await getAccessToken(userId)
  const response = await fetch(`${OPEN_FINANCE_API_URL}/v2/data/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

async function getTransactions(userId) {
  const token = await getAccessToken(userId)
  const response = await fetch(`${OPEN_FINANCE_API_URL}/v2/data/transactions?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

async function main() {
  for (const userId of DEMO_USERS) {
    console.log(`\n=== ${userId} ===`)
    
    try {
      const connections = await getConnections(userId)
      console.log('Connections:', JSON.stringify(connections, null, 2))
    } catch (e) {
      console.log('Connections error:', e.message)
    }

    try {
      const accounts = await getAccounts(userId)
      console.log('Accounts:', JSON.stringify(accounts, null, 2))
    } catch (e) {
      console.log('Accounts error:', e.message)
    }

    try {
      const transactions = await getTransactions(userId)
      console.log('Transactions:', JSON.stringify(transactions, null, 2))
    } catch (e) {
      console.log('Transactions error:', e.message)
    }
  }
}

main().catch(console.error)

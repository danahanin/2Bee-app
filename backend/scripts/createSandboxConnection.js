const path = require('path')
// Look for .env in backend/ first, then fall back to the repo root.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const OPEN_FINANCE_API_URL = process.env.OPEN_FINANCE_API_URL || 'https://api.open-finance.ai'
const OPEN_FINANCE_CLIENT_ID = process.env.OPEN_FINANCE_CLIENT_ID || ''
const OPEN_FINANCE_CLIENT_SECRET = process.env.OPEN_FINANCE_CLIENT_SECRET || ''

const SANDBOX_PROVIDER = 'open-finance-sandbox'
const SANDBOX_PSU_IDS = ['043510023', '321547416']

const DEMO_USERS = [
  { id: 'user_demo_1', email: 'demo@2bee.app', psuId: SANDBOX_PSU_IDS[0] },
  { id: 'user_demo_2', email: 'partner@2bee.app', psuId: SANDBOX_PSU_IDS[1] },
]

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
  if (!response.ok || !payload?.accessToken) {
    throw new Error(payload?.message || 'Failed to get access token')
  }
  return payload.accessToken
}

async function createConnection(userId) {
  const token = await getAccessToken(userId)

  const response = await fetch(`${OPEN_FINANCE_API_URL}/v2/connections`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeFakeProviders: true,
      providerIds: [SANDBOX_PROVIDER],
      language: 'en',
      redirectUrl: 'http://localhost:5173',
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to create connection')
  }
  return payload
}

async function initConnection(userId, connectionId, psuId) {
  const token = await getAccessToken(userId)

  const response = await fetch(`${OPEN_FINANCE_API_URL}/v2/connect/open-banking-init`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      providerId: SANDBOX_PROVIDER,
      connectionId,
      psuId,
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message || JSON.stringify(payload) || 'Failed to init connection')
  }
  return payload
}

async function main() {
  if (!OPEN_FINANCE_CLIENT_ID || !OPEN_FINANCE_CLIENT_SECRET) {
    console.error('Missing OPEN_FINANCE_CLIENT_ID or OPEN_FINANCE_CLIENT_SECRET')
    console.error('Get these from https://dashboard.open-finance.ai')
    process.exit(1)
  }

  console.log('Creating sandbox connections for demo users...\n')

  for (const user of DEMO_USERS) {
    console.log(`=== ${user.email} (PSU: ${user.psuId}) ===`)
    try {
      const conn = await createConnection(user.id)
      console.log(`Connection ID: ${conn.id}`)
      
      const init = await initConnection(user.id, conn.id, user.psuId)
      
      if (init.scaOAuth) {
        console.log(`\nAuthorization URL (open in browser):`)
        console.log(init.scaOAuth)
      } else if (init.connection?.status === 'ACTIVE') {
        console.log(`Connection is ACTIVE - no browser authorization needed!`)
      } else {
        console.log(`Connect URL: ${conn.connectUrl}`)
        console.log(`Connection status: ${init.connection?.status || 'unknown'}`)
      }
    } catch (err) {
      console.error(`Failed: ${err.message}`)
      console.log('You may need to complete connection manually.')
    }
    console.log('')
  }

  console.log('=== Next Steps ===')
  console.log('1. If you got scaOAuth URLs above, open them in your browser')
  console.log('2. Complete the bank authorization (sandbox auto-approves)')
  console.log('3. Run: npm run seed:real')
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})

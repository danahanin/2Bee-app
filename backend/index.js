const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}

  if (email === 'demo@2bee.app' && password === '123456') {
    return res.json({
      token: 'demo-jwt-token',
      user: {
        id: 'user_demo_1',
        name: 'Demo User',
        email,
      },
    })
  }

  return res.status(401).json({ error: 'Invalid email or password' })
})

app.listen(port, () => {
  console.log(`2Bee backend running on http://localhost:${port}`)
})

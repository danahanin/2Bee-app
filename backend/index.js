const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const aiRoutes = require('./src/routes/ai.routes')
const authRoutes = require('./routes/auth')
const profileRouter = require('./routes/profile')
const hiveRoutes = require('./routes/hive')
const expensesRoutes = require('./routes/expenses')
const dashboardRoutes = require('./routes/dashboard')

const app = express()
const port = process.env.PORT || 4000
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'

app.use(cors())
app.use(express.json())
app.use('/ai', aiRoutes)
app.use('/auth', authRoutes)

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true, mongo: mongoose.connection.readyState === 1 })
})

app.use('/hive', hiveRoutes)
app.use('/expenses', expensesRoutes)
app.use('/dashboard', dashboardRoutes)

// ---------------------------------------------------------------------------
// Profile & Settings — Dana Hanin (stubs)
// ---------------------------------------------------------------------------
app.use('/api', profileRouter)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } })
})

function startServer({ mongoReady }) {
  app.listen(port, () => {
    if (mongoReady) {
      console.log('Connected to MongoDB')
    } else {
      console.warn('MongoDB not connected — running in offline mode. Some features may be unavailable.')
    }
    console.log(`2Bee backend running on http://localhost:${port}`)
  })
}

mongoose
  .connect(mongoUri)
  .then(() => {
    startServer({ mongoReady: true })
  })
  .catch((err) => {
    console.warn('MongoDB connection error:', err.message)
    startServer({ mongoReady: false })
  })

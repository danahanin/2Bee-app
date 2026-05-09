const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const aiRoutes = require('./src/routes/ai.routes')
const authRoutes = require('./routes/auth')
const profileRouter = require('./routes/profile')
const pairRouter = require('./routes/pair')
const hiveRoutes = require('./routes/hive')
const expensesRoutes = require('./routes/expenses')
const dashboardRoutes = require('./routes/dashboard')
const { AppError } = require('./utils/appError')

function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use('/ai', aiRoutes)
  app.use('/auth', authRoutes)

  app.get('/health', (_req, res) => {
    res.json({ ok: true, mongo: mongoose.connection.readyState === 1 })
  })

  app.use('/hive', hiveRoutes)
  app.use('/expenses', expensesRoutes)
  app.use('/dashboard', dashboardRoutes)
  app.use('/api', profileRouter)
  app.use('/api', pairRouter)

  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) {
      return res
        .status(err.statusCode)
        .json({ error: { code: err.code, message: err.message, details: err.details ?? null } })
    }

    console.error(err.stack)
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } })
  })

  return app
}

module.exports = { createApp }

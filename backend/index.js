const express = require('express');
const cors = require('cors');
const aiRoutes = require('./src/routes/ai.routes');

const profileRouter = require('./routes/profile')
const mongoose = require('mongoose')
const hiveRoutes = require('./routes/hive')
const expensesRoutes = require('./routes/expenses')

const app = express()
const port = process.env.PORT || 4000
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/twobee'

app.use(cors());
app.use(express.json());
app.use('/ai', aiRoutes);

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Auth (placeholder — Bar Cohen, Sprint 1)
// ---------------------------------------------------------------------------
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (email === 'demo@2bee.app' && password === '123456') {
    return res.json({
      token: 'demo-jwt-token',
      user: {
        id: 'user_demo_1',
        name: 'Demo User',
        email,
      },
    });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

app.use('/hive', hiveRoutes)
app.use('/expenses', expensesRoutes)

app.use((err, _req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error' } })
})

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(port, () => {
      console.log(`2Bee backend running on http://localhost:${port}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  })
// ---------------------------------------------------------------------------
// Profile & Settings — Dana Hanin (PR 1: stubs)
// ---------------------------------------------------------------------------
app.use('/api', profileRouter)

// ---------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`2Bee backend running on http://localhost:${port}`);
});

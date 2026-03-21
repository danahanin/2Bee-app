const express = require('express');
const cors = require('cors');
const aiRoutes = require('./src/routes/ai.routes');

const profileRouter = require('./routes/profile')

const app = express()
const port = process.env.PORT || 4000

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

// ---------------------------------------------------------------------------
// Profile & Settings — Dana Hanin (PR 1: stubs)
// ---------------------------------------------------------------------------
app.use('/api', profileRouter)

// ---------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`2Bee backend running on http://localhost:${port}`);
});

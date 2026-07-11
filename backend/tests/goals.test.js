const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const tokenContexts = {
  'token-user-a': {
    userId: 'user_a',
    email: 'a@test.app',
    firstName: 'User',
    lastName: 'A',
    pairId: 'user_b',
    hiveId: null,
  },
  'token-user-b': {
    userId: 'user_b',
    email: 'b@test.app',
    firstName: 'User',
    lastName: 'B',
    pairId: 'user_a',
    hiveId: null,
  },
}

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      })
    }

    const token = header.slice(7).trim()
    const context = tokenContexts[token]
    if (!context) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' },
      })
    }

    req.user = { ...context }
    return next()
  }
})

const { createApp } = require('../app')
const Hive = require('../models/Hive')
const Goal = require('../models/Goal')

describe('Goals API', () => {
  let mongoServer
  let app
  let hiveId

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
    app = createApp()
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  beforeEach(async () => {
    await Promise.all([Hive.deleteMany({}), Goal.deleteMany({})])

    const hive = await Hive.create({ userIds: ['user_a', 'user_b'], isActive: true })
    hiveId = hive._id.toString()
    tokenContexts['token-user-a'].hiveId = hiveId
    tokenContexts['token-user-b'].hiveId = hiveId

    const nextYear = new Date()
    nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1)

    await Goal.create([
      {
        userId: 'user_a',
        hiveId: null,
        title: 'Emergency fund',
        targetAmount: 5000,
        currentAmount: 500,
        deadline: nextYear,
        category: 'other',
      },
      {
        userId: 'user_a',
        hiveId,
        title: 'Vacation fund',
        targetAmount: 8000,
        currentAmount: 1200,
        deadline: nextYear,
        category: 'travel',
      },
    ])
  })

  it('lists personal goals', async () => {
    const response = await request(app)
      .get('/goals')
      .query({ scope: 'personal' })
      .set('Authorization', 'Bearer token-user-a')

    expect(response.status).toBe(200)
    expect(response.body.goals).toHaveLength(1)
    expect(response.body.goals[0].title).toBe('Emergency fund')
  })

  it('lists shared hive goals for partner B', async () => {
    const response = await request(app)
      .get('/goals')
      .query({ scope: 'shared' })
      .set('Authorization', 'Bearer token-user-b')

    expect(response.status).toBe(200)
    expect(response.body.goals).toHaveLength(1)
    expect(response.body.goals[0].title).toBe('Vacation fund')
  })

  it('creates a personal goal', async () => {
    const deadline = new Date()
    deadline.setUTCMonth(deadline.getUTCMonth() + 6)

    const response = await request(app)
      .post('/goals')
      .set('Authorization', 'Bearer token-user-a')
      .send({
        title: 'New laptop',
        targetAmount: 3000,
        currentAmount: 0,
        deadline: deadline.toISOString(),
        category: 'shopping',
      })

    expect(response.status).toBe(201)
    expect(response.body.title).toBe('New laptop')
    expect(response.body.progressPercent).toBe(0)
    expect(response.body.hiveId).toBeNull()

    const listResponse = await request(app)
      .get('/goals')
      .query({ scope: 'personal' })
      .set('Authorization', 'Bearer token-user-a')

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.goals.some((goal) => goal.title === 'New laptop')).toBe(true)
  })

  it('creates a shared hive goal', async () => {
    const deadline = new Date()
    deadline.setUTCFullYear(deadline.getUTCFullYear() + 1)

    const response = await request(app)
      .post('/goals')
      .set('Authorization', 'Bearer token-user-b')
      .send({
        title: 'Home repair',
        targetAmount: 4000,
        deadline: deadline.toISOString(),
        hiveId,
      })

    expect(response.status).toBe(201)
    expect(response.body.hiveId).toBe(hiveId)
  })

  it('rejects invalid goal payload', async () => {
    const response = await request(app)
      .post('/goals')
      .set('Authorization', 'Bearer token-user-a')
      .send({
        title: '',
        targetAmount: 0,
        deadline: 'not-a-date',
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

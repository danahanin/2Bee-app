const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const tokenContexts = {
  'token-user-1': {
    userId: 'user_demo_1',
    email: 'demo1@2bee.app',
    firstName: 'Dana',
    lastName: 'Hanin',
    pairId: null,
    hiveId: null,
  },
  'token-user-2': {
    userId: 'user_demo_2',
    email: 'demo2@2bee.app',
    firstName: 'Maya',
    lastName: 'Levi',
    pairId: null,
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
const User = require('../models/User')
const Hive = require('../models/Hive')

describe('Pairing API', () => {
  let mongoServer
  let app

  async function createBaseUsers() {
    await User.create([
      {
        _id: 'user_demo_1',
        email: 'demo1@2bee.app',
        emailLower: 'demo1@2bee.app',
        passwordHash: 'hash1',
        firstName: 'Dana',
        lastName: 'Hanin',
        bio: '',
      },
      {
        _id: 'user_demo_2',
        email: 'demo2@2bee.app',
        emailLower: 'demo2@2bee.app',
        passwordHash: 'hash2',
        firstName: 'Maya',
        lastName: 'Levi',
        bio: '',
      },
    ])
  }

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
    await Promise.all([User.deleteMany({}), Hive.deleteMany({})])
    await createBaseUsers()

    tokenContexts['token-user-1'].pairId = null
    tokenContexts['token-user-1'].hiveId = null
    tokenContexts['token-user-2'].pairId = null
    tokenContexts['token-user-2'].hiveId = null
  })

  it('POST /api/pair/generate creates a code with expiry', async () => {
    const response = await request(app)
      .post('/api/pair/generate')
      .set('Authorization', 'Bearer token-user-1')

    expect(response.status).toBe(201)
    expect(response.body.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(response.body.expiresAt).toBeTruthy()
  })

  it('POST /api/pair/join joins users and makes code one-time', async () => {
    const generated = await request(app)
      .post('/api/pair/generate')
      .set('Authorization', 'Bearer token-user-1')

    const joinResponse = await request(app)
      .post('/api/pair/join')
      .set('Authorization', 'Bearer token-user-2')
      .send({ code: generated.body.code })

    expect(joinResponse.status).toBe(200)
    expect(joinResponse.body.success).toBe(true)
    expect(joinResponse.body.hiveId).toBeTruthy()

    const [userA, userB] = await Promise.all([
      User.findById('user_demo_1').lean(),
      User.findById('user_demo_2').lean(),
    ])

    expect(userA.pairId).toBe('user_demo_2')
    expect(userB.pairId).toBe('user_demo_1')
    expect(userA.hiveId).toBeTruthy()
    expect(userB.hiveId).toBeTruthy()
    expect(userA.pairCode).toBeNull()
    expect(userA.pairCodeUsedAt).toBeTruthy()

    const reusedCodeResponse = await request(app)
      .post('/api/pair/join')
      .set('Authorization', 'Bearer token-user-2')
      .send({ code: generated.body.code })

    expect(reusedCodeResponse.status).toBe(409)
    expect(reusedCodeResponse.body.error.code).toBe('ALREADY_PAIRED')
  })

  it('POST /api/pair/join rejects expired code', async () => {
    await User.findByIdAndUpdate('user_demo_1', {
      pairCode: 'ABC123',
      pairCodeExpiresAt: new Date(Date.now() - 60_000),
      pairCodeUsedAt: null,
    })

    const response = await request(app)
      .post('/api/pair/join')
      .set('Authorization', 'Bearer token-user-2')
      .send({ code: 'ABC123' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('PAIR_CODE_NOT_FOUND')
  })

  it('GET /api/pair/status reflects relationship state', async () => {
    const generated = await request(app)
      .post('/api/pair/generate')
      .set('Authorization', 'Bearer token-user-1')

    const preJoinStatus = await request(app)
      .get('/api/pair/status')
      .set('Authorization', 'Bearer token-user-1')
    expect(preJoinStatus.status).toBe(200)
    expect(preJoinStatus.body.paired).toBe(false)
    expect(preJoinStatus.body.code).toBe(generated.body.code)

    await request(app)
      .post('/api/pair/join')
      .set('Authorization', 'Bearer token-user-2')
      .send({ code: generated.body.code })

    tokenContexts['token-user-1'].pairId = 'user_demo_2'
    const userA = await User.findById('user_demo_1').lean()
    tokenContexts['token-user-1'].hiveId = userA.hiveId

    const postJoinStatus = await request(app)
      .get('/api/pair/status')
      .set('Authorization', 'Bearer token-user-1')

    expect(postJoinStatus.status).toBe(200)
    expect(postJoinStatus.body.paired).toBe(true)
    expect(postJoinStatus.body.pairId).toBe('user_demo_2')
    expect(postJoinStatus.body.hiveId).toBeTruthy()
    expect(postJoinStatus.body.code).toBeNull()
  })
})

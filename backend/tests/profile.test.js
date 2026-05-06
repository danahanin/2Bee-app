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

describe('Profile & Settings API', () => {
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
        pairCode: 'ABC123',
      },
      {
        _id: 'user_demo_2',
        email: 'demo2@2bee.app',
        emailLower: 'demo2@2bee.app',
        passwordHash: 'hash2',
        firstName: 'Maya',
        lastName: 'Levi',
        bio: '',
        pairCode: 'XYZ789',
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

  describe('GET /api/profile', () => {
    it('returns 200 with user data', async () => {
      const response = await request(app).get('/api/profile').set('Authorization', 'Bearer token-user-1')
      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        id: 'user_demo_1',
        firstName: 'Dana',
        lastName: 'Hanin',
        email: 'demo1@2bee.app',
      })
    })

    it('returns 401 without token', async () => {
      const response = await request(app).get('/api/profile')
      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/profile', () => {
    it('updates name successfully', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', 'Bearer token-user-1')
        .send({ firstName: 'Danielle', lastName: 'Cohen' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.user.firstName).toBe('Danielle')
      expect(response.body.user.lastName).toBe('Cohen')
    })

    it('rejects invalid avatarUrl', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', 'Bearer token-user-1')
        .send({ avatarUrl: 'not-a-url' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('rejects firstName longer than 50 chars', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', 'Bearer token-user-1')
        .send({ firstName: 'A'.repeat(51) })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Privacy settings', () => {
    it('GET /api/settings/privacy returns current settings', async () => {
      const response = await request(app)
        .get('/api/settings/privacy')
        .set('Authorization', 'Bearer token-user-1')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        hidePersonalIncome: false,
        hidePersonalExpenses: false,
        hidePersonalBalance: false,
      })
    })

    it('PUT /api/settings/privacy updates a boolean field', async () => {
      const response = await request(app)
        .put('/api/settings/privacy')
        .set('Authorization', 'Bearer token-user-1')
        .send({ hidePersonalIncome: true })

      expect(response.status).toBe(200)
      expect(response.body.privacySettings.hidePersonalIncome).toBe(true)
    })

    it('PUT /api/settings/privacy rejects non-boolean values', async () => {
      const response = await request(app)
        .put('/api/settings/privacy')
        .set('Authorization', 'Bearer token-user-1')
        .send({ hidePersonalIncome: 'yes' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Notification settings', () => {
    it('GET /api/settings/notifications returns current settings', async () => {
      const response = await request(app)
        .get('/api/settings/notifications')
        .set('Authorization', 'Bearer token-user-1')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        budgetAlerts: true,
        imbalanceAlerts: true,
        newExpenseAlerts: true,
        weeklyDigest: false,
      })
    })

    it('PUT /api/settings/notifications updates notification setting', async () => {
      const response = await request(app)
        .put('/api/settings/notifications')
        .set('Authorization', 'Bearer token-user-1')
        .send({ weeklyDigest: true })

      expect(response.status).toBe(200)
      expect(response.body.notificationSettings.weeklyDigest).toBe(true)
    })

    it('PUT /api/settings/notifications rejects unknown field', async () => {
      const response = await request(app)
        .put('/api/settings/notifications')
        .set('Authorization', 'Bearer token-user-1')
        .send({ unknownFlag: true })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Shared categories', () => {
    it('updates categories array', async () => {
      const response = await request(app)
        .put('/api/settings/shared-categories')
        .set('Authorization', 'Bearer token-user-1')
        .send({ categories: ['groceries', 'travel'] })

      expect(response.status).toBe(200)
      expect(response.body.sharedCategories).toEqual(['groceries', 'travel'])
    })

    it('rejects unknown category', async () => {
      const response = await request(app)
        .put('/api/settings/shared-categories')
        .set('Authorization', 'Bearer token-user-1')
        .send({ categories: ['invalid-category'] })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('rejects non-array categories', async () => {
      const response = await request(app)
        .put('/api/settings/shared-categories')
        .set('Authorization', 'Bearer token-user-1')
        .send({ categories: 'groceries' })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Pair management', () => {
    it('DELETE /api/pair unlinks users and archives hive', async () => {
      const hive = await Hive.create({ userIds: ['user_demo_1', 'user_demo_2'], isActive: true })
      await User.findByIdAndUpdate('user_demo_1', { pairId: 'user_demo_2', hiveId: hive._id.toString() })
      await User.findByIdAndUpdate('user_demo_2', { pairId: 'user_demo_1', hiveId: hive._id.toString() })

      tokenContexts['token-user-1'].pairId = 'user_demo_2'
      tokenContexts['token-user-1'].hiveId = hive._id.toString()

      const response = await request(app).delete('/api/pair').set('Authorization', 'Bearer token-user-1')
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      const [userA, userB, archivedHive] = await Promise.all([
        User.findById('user_demo_1').lean(),
        User.findById('user_demo_2').lean(),
        Hive.findById(hive._id).lean(),
      ])

      expect(userA.pairId).toBeNull()
      expect(userA.hiveId).toBeNull()
      expect(userB.pairId).toBeNull()
      expect(userB.hiveId).toBeNull()
      expect(archivedHive.isActive).toBe(false)
    })

    it('DELETE /api/pair returns 409 if not paired', async () => {
      const response = await request(app).delete('/api/pair').set('Authorization', 'Bearer token-user-1')
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('NOT_PAIRED')
    })

    it('POST /api/pair/reconnect creates pair and hive', async () => {
      const response = await request(app)
        .post('/api/pair/reconnect')
        .set('Authorization', 'Bearer token-user-1')
        .send({ partnerCode: 'XYZ789' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.hiveId).toBeDefined()

      const [userA, userB] = await Promise.all([
        User.findById('user_demo_1').lean(),
        User.findById('user_demo_2').lean(),
      ])

      expect(userA.pairId).toBe('user_demo_2')
      expect(userB.pairId).toBe('user_demo_1')
      expect(userA.hiveId).toBeTruthy()
      expect(userB.hiveId).toBeTruthy()
    })

    it('POST /api/pair/reconnect returns 404 for invalid partner code', async () => {
      const response = await request(app)
        .post('/api/pair/reconnect')
        .set('Authorization', 'Bearer token-user-1')
        .send({ partnerCode: 'AAAAAA' })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('PARTNER_NOT_FOUND')
    })
  })
})

const request = require('supertest')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const { createApp } = require('../app')
const User = require('../models/User')
const Session = require('../models/Session')
const RefreshToken = require('../models/RefreshToken')

describe('Auth API', () => {
  let mongoServer
  let app

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
    await Promise.all([User.deleteMany({}), Session.deleteMany({}), RefreshToken.deleteMany({})])
  })

  async function register(overrides = {}) {
    return request(app)
      .post('/auth/register')
      .send({
        firstName: 'Dana',
        lastName: 'Hanin',
        email: 'dana@2bee.app',
        password: 'password123',
        ...overrides,
      })
  }

  it('registers a user in Mongo without leaking the password hash', async () => {
    const response = await register()

    expect(response.status).toBe(201)
    expect(response.body.user).toEqual(
      expect.objectContaining({ email: 'dana@2bee.app', firstName: 'Dana', lastName: 'Hanin' }),
    )
    expect(response.body.user.passwordHash).toBeUndefined()
    expect(response.body.user.emailLower).toBeUndefined()

    const stored = await User.findOne({ emailLower: 'dana@2bee.app' }).lean()
    expect(stored).toBeTruthy()
    expect(stored.passwordHash).not.toBe('password123')
  })

  it('rejects registering the same email twice', async () => {
    await register()
    const response = await register()

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('EMAIL_IN_USE')
  })

  it('logs in with correct credentials and rejects incorrect ones', async () => {
    await register()

    const badLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'wrong-password' })
    expect(badLogin.status).toBe(401)
    expect(badLogin.body.error.code).toBe('INVALID_CREDENTIALS')

    const goodLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'password123' })
    expect(goodLogin.status).toBe(200)
    expect(goodLogin.body.accessToken).toBeTruthy()
    expect(goodLogin.body.refreshToken).toBeTruthy()
    expect(goodLogin.body.user.email).toBe('dana@2bee.app')
  })

  it('accepts the access token on a protected route end-to-end', async () => {
    await register()
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'password123' })

    const profile = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)

    expect(profile.status).toBe(200)
    expect(profile.body.firstName).toBe('Dana')

    const unauthorized = await request(app).get('/api/profile')
    expect(unauthorized.status).toBe(401)
  })

  it('logout revokes the session so the access token stops working', async () => {
    await register()
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'password123' })

    const logout = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(logout.status).toBe(200)

    const profile = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(profile.status).toBe(401)
  })

  it('refresh rotates the refresh token and issues a new access token', async () => {
    await register()
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'password123' })

    const refreshed = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
    expect(refreshed.status).toBe(200)
    expect(refreshed.body.accessToken).toBeTruthy()
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken)

    const reused = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
    expect(reused.status).toBe(401)
  })

  it('treats an expired session as unauthorized', async () => {
    await register()
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'dana@2bee.app', password: 'password123' })

    await Session.updateOne({ token: login.body.accessToken }, { expiresAt: new Date(Date.now() - 1000) })

    const profile = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(profile.status).toBe(401)
  })
})

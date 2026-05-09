const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000);

const MS_PER_DAY = 86400000;

const tokenContexts = {
  'token-ai-member': {
    userId: 'user_ai_member',
    email: 'member@test.app',
    firstName: 'Member',
    lastName: 'User',
    pairId: null,
    hiveId: null,
  },
  'token-ai-outsider': {
    userId: 'user_ai_outsider',
    email: 'outsider@test.app',
    firstName: 'Outside',
    lastName: 'User',
    pairId: null,
    hiveId: null,
  },
};

jest.mock('../middleware/auth', () => {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' },
      });
    }

    const token = header.slice(7).trim();
    const context = tokenContexts[token];
    if (!context) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token expired or invalid' },
      });
    }

    req.user = { ...context };
    return next();
  };
});

const { createApp } = require('../app');
const Hive = require('../models/Hive');
const Expense = require('../models/Expense');

function daysAgoUtc(days) {
  return new Date(Date.now() - days * MS_PER_DAY);
}

async function seedPersonalForecastExpense(userId) {
  await Expense.create({
    userId,
    hiveId: null,
    amount: 90,
    category: 'groceries',
    description: 'forecast integration personal',
    type: 'personal',
    date: daysAgoUtc(5),
    isDeleted: false,
  });
}

async function seedSharedForecastExpenses(hiveId, memberId) {
  await Expense.create({
    hiveId,
    userId: memberId,
    amount: 300,
    category: 'utilities',
    description: 'forecast shared one month aggregate',
    type: 'shared',
    date: daysAgoUtc(8),
    isDeleted: false,
  });
}

async function seedImbalanceSharedExpenses(hiveId, partnerId, memberId) {
  await Expense.create({
    hiveId,
    userId: memberId,
    amount: 900,
    category: 'rent',
    description: 'imbalance current member',
    type: 'shared',
    date: daysAgoUtc(10),
    isDeleted: false,
  });
  await Expense.create({
    hiveId,
    userId: partnerId,
    amount: 100,
    category: 'rent',
    description: 'imbalance current partner',
    type: 'shared',
    date: daysAgoUtc(11),
    isDeleted: false,
  });
  await Expense.create({
    hiveId,
    userId: memberId,
    amount: 250,
    category: 'groceries',
    description: 'imbalance prev member',
    type: 'shared',
    date: daysAgoUtc(45),
    isDeleted: false,
  });
  await Expense.create({
    hiveId,
    userId: partnerId,
    amount: 250,
    category: 'groceries',
    description: 'imbalance prev partner',
    type: 'shared',
    date: daysAgoUtc(46),
    isDeleted: false,
  });
}

function expectForecastItemShape(row) {
  expect(row).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      period: expect.any(String),
      predictedAmount: expect.any(Number),
      confidence: expect.any(Number),
      category: expect.any(String),
      createdAt: expect.any(String),
    })
  );
}

describe('AI forecast & imbalance API', () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Hive.deleteMany({}),
      Expense.deleteMany({}),
    ]);
  });

  describe('GET /ai/forecast', () => {
    it('returns 401 without Authorization', async () => {
      const response = await request(app).get('/ai/forecast');
      expect(response.status).toBe(401);
      expect(response.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 when scope is invalid', async () => {
      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'invalid' })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(400);
      expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when scope is shared but hiveId is missing', async () => {
      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'shared' })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(400);
      expect(response.body.error?.message).toMatch(/hiveId is required/i);
    });

    it('returns 200 with forecast rows from personal expenses', async () => {
      await seedPersonalForecastExpense('user_ai_member');

      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'personal' })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(expectForecastItemShape);
      const groceries = response.body.data.find((r) => r.category === 'groceries');
      expect(groceries).toBeDefined();
      expect(groceries.predictedAmount).toBe(30);
    });

    it('returns 404 for shared scope when hive does not exist', async () => {
      const missingId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'shared', hiveId: missingId })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(404);
      expect(response.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 404 for shared scope when user is not a hive member', async () => {
      const hive = await Hive.create({
        userIds: ['user_ai_member', 'user_ai_partner'],
        isActive: true,
      });

      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'shared', hiveId: hive._id.toString() })
        .set('Authorization', 'Bearer token-ai-outsider');

      expect(response.status).toBe(404);
      expect(response.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 200 with forecast rows from shared hive expenses when member', async () => {
      const hive = await Hive.create({
        userIds: ['user_ai_member', 'user_ai_partner'],
        isActive: true,
      });
      await seedSharedForecastExpenses(hive._id, 'user_ai_member');

      const response = await request(app)
        .get('/ai/forecast')
        .query({ scope: 'shared', hiveId: hive._id.toString() })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(expectForecastItemShape);
      const utilities = response.body.data.find((r) => r.category === 'utilities');
      expect(utilities).toBeDefined();
      expect(utilities.predictedAmount).toBe(100);
    });
  });

  describe('GET /ai/imbalance', () => {
    it('returns 401 without Authorization', async () => {
      const response = await request(app).get('/ai/imbalance');
      expect(response.status).toBe(401);
      expect(response.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 when hiveId is missing', async () => {
      const response = await request(app)
        .get('/ai/imbalance')
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(400);
      expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when hive not found or caller not a member', async () => {
      const hive = await Hive.create({
        userIds: ['user_ai_member', 'user_ai_partner'],
        isActive: true,
      });

      const response = await request(app)
        .get('/ai/imbalance')
        .query({ hiveId: hive._id.toString() })
        .set('Authorization', 'Bearer token-ai-outsider');

      expect(response.status).toBe(404);
      expect(response.body.error?.code).toBe('NOT_FOUND');
    });

    it('returns 200 with imbalance payload computed from Expense aggregates', async () => {
      const hive = await Hive.create({
        userIds: ['user_ai_member', 'user_ai_partner'],
        isActive: true,
      });
      await seedImbalanceSharedExpenses(hive._id, 'user_ai_partner', 'user_ai_member');

      const response = await request(app)
        .get('/ai/imbalance')
        .query({ hiveId: hive._id.toString() })
        .set('Authorization', 'Bearer token-ai-member');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          id: 'imb_001',
          createdAt: expect.any(String),
          isImbalanced: expect.any(Boolean),
          delta: expect.any(Number),
          trend: expect.any(String),
          message: expect.any(String),
          contributions: expect.any(Array),
        })
      );
      expect(response.body.data.isImbalanced).toBe(true);
      expect(response.body.data.message.length).toBeGreaterThan(0);
    });
  });
});

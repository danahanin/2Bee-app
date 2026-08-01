jest.mock('../feedback', () => ({
  recordExpenseConfirmationFeedback: jest.fn(async () => ({ personalOrShared: true, hive: false })),
}))

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const Expense = require('../../../../models/Expense')
const ExpenseGroup = require('../../../../models/ExpenseGroup')
const { recordExpenseConfirmationFeedback } = require('../feedback')
const { listNeedsReview, resolveNeedsReview } = require('../reviewService')

describe('reviewService', () => {
  let mongoServer

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) await mongoServer.stop()
  })

  afterEach(async () => {
    await Expense.deleteMany({})
    await ExpenseGroup.deleteMany({})
    jest.clearAllMocks()
  })

  async function makePendingExpense(overrides = {}) {
    return Expense.create({
      userId: 'user_1',
      amount: 42,
      category: 'groceries',
      description: 'SHUFERSAL',
      type: 'personal',
      source: 'bank_sync',
      date: new Date(),
      classifiedBy: 'ai',
      needsReview: true,
      aiSuggestion: {
        category: { value: 'groceries', confidence: 0.8 },
        type: { value: 'personal', confidence: 0.6, reasoning: 'no hive context' },
        hive: null,
      },
      ...overrides,
    })
  }

  describe('listNeedsReview', () => {
    it('returns only pending, non-deleted expenses for the user', async () => {
      await makePendingExpense()
      await makePendingExpense({ needsReview: false })
      await makePendingExpense({ isDeleted: true })
      await makePendingExpense({ userId: 'user_2' })

      const result = await listNeedsReview('user_1')

      expect(result).toHaveLength(1)
      expect(result[0].needsReview).toBe(true)
    })
  })

  describe('resolveNeedsReview', () => {
    it('returns null for an invalid id', async () => {
      const result = await resolveNeedsReview('user_1', 'not-an-id', {})
      expect(result).toBeNull()
    })

    it('returns null when the expense does not belong to the user', async () => {
      const expense = await makePendingExpense()
      const result = await resolveNeedsReview('someone_else', String(expense._id), {})
      expect(result).toBeNull()
    })

    it('accepts the suggestion as-is and keeps classifiedBy ai', async () => {
      const expense = await makePendingExpense()

      const resolved = await resolveNeedsReview('user_1', String(expense._id), {})

      expect(resolved.needsReview).toBe(false)
      expect(resolved.classifiedBy).toBe('ai')
      expect(resolved.category).toBe('groceries')
      expect(recordExpenseConfirmationFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expense._id }),
        { expenseGroup: null },
      )
    })

    it('marks classifiedBy user when the category is corrected', async () => {
      const expense = await makePendingExpense()

      const resolved = await resolveNeedsReview('user_1', String(expense._id), { category: 'dining' })

      expect(resolved.classifiedBy).toBe('user')
      expect(resolved.category).toBe('dining')
    })

    it('clears hiveId and expenseGroupId when corrected to personal', async () => {
      const hiveId = new mongoose.Types.ObjectId()
      const expenseGroupId = new mongoose.Types.ObjectId()
      const expense = await makePendingExpense({ type: 'shared', hiveId, expenseGroupId })

      const resolved = await resolveNeedsReview('user_1', String(expense._id), { type: 'personal' })

      expect(resolved.type).toBe('personal')
      expect(resolved.hiveId).toBeNull()
      expect(resolved.expenseGroupId).toBeNull()
      expect(resolved.classifiedBy).toBe('user')
    })

    it('sets hiveId when corrected from personal to shared', async () => {
      const hiveId = new mongoose.Types.ObjectId()
      const expense = await makePendingExpense({ type: 'personal' })

      const resolved = await resolveNeedsReview('user_1', String(expense._id), {
        type: 'shared',
        hiveId: String(hiveId),
      })

      expect(resolved.type).toBe('shared')
      expect(String(resolved.hiveId)).toBe(String(hiveId))
    })

    it('passes the expense group to the feedback recorder when one is set', async () => {
      const hiveId = new mongoose.Types.ObjectId()
      const group = await ExpenseGroup.create({ hiveId, name: 'Household', userIds: ['user_1', 'user_2'] })
      const expense = await makePendingExpense({ type: 'shared', hiveId, expenseGroupId: group._id })

      await resolveNeedsReview('user_1', String(expense._id), {})

      expect(recordExpenseConfirmationFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expense._id }),
        { expenseGroup: expect.objectContaining({ name: 'Household' }) },
      )
    })
  })
})

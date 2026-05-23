const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.setTimeout(60000)

const Hive = require('../models/Hive')
const Expense = require('../models/Expense')
const Transfer = require('../models/Transfer')
const { calculateHiveBalance } = require('../services/hiveService')

describe('calculateHiveBalance', () => {
  let mongoServer
  let hiveId

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await mongoose.connect(mongoServer.getUri())
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) await mongoServer.stop()
  })

  beforeEach(async () => {
    await Promise.all([Hive.deleteMany({}), Expense.deleteMany({}), Transfer.deleteMany({})])
    const hive = await Hive.create({ userIds: ['userA', 'userB'] })
    hiveId = hive._id.toString()
  })

  it('returns balanced when there are no expenses', async () => {
    const result = await calculateHiveBalance(hiveId)
    expect(result.balanceStatus).toBe('balanced')
    expect(result.totalSharedSpend).toBe(0)
    expect(result.remainingImbalance).toBe(0)
    expect(result.suggestedTransfer).toBeNull()
    expect(result.contributions).toHaveLength(2)
  })

  it('returns balanced when both partners spend equally', async () => {
    await Expense.create([
      { hiveId, userId: 'userA', amount: 100, category: 'groceries', description: 'A', type: 'shared', date: new Date() },
      { hiveId, userId: 'userB', amount: 100, category: 'dining', description: 'B', type: 'shared', date: new Date() },
    ])

    const result = await calculateHiveBalance(hiveId)
    expect(result.balanceStatus).toBe('balanced')
    expect(result.totalSharedSpend).toBe(200)
    expect(result.equalShare).toBe(100)
    expect(result.suggestedTransfer).toBeNull()
  })

  it('detects imbalance and suggests transfer to the user who paid more', async () => {
    await Expense.create([
      { hiveId, userId: 'userA', amount: 300, category: 'groceries', description: 'Big shop', type: 'shared', date: new Date() },
      { hiveId, userId: 'userB', amount: 100, category: 'dining', description: 'Coffee', type: 'shared', date: new Date() },
    ])

    const result = await calculateHiveBalance(hiveId)
    expect(result.balanceStatus).toBe('imbalanced')
    expect(result.totalSharedSpend).toBe(400)
    expect(result.equalShare).toBe(200)
    expect(result.suggestedTransfer.fromUserId).toBe('userB')
    expect(result.suggestedTransfer.toUserId).toBe('userA')
    expect(result.suggestedTransfer.amount).toBe(100)
  })

  it('excludes soft-deleted expenses from balance calculation', async () => {
    await Expense.create([
      { hiveId, userId: 'userA', amount: 200, category: 'groceries', description: 'Active', type: 'shared', date: new Date() },
      { hiveId, userId: 'userA', amount: 500, category: 'rent', description: 'Deleted', type: 'shared', date: new Date(), isDeleted: true },
    ])

    const result = await calculateHiveBalance(hiveId)
    expect(result.totalSharedSpend).toBe(200)
  })

  it('excludes personal expenses from balance calculation', async () => {
    await Expense.create([
      { hiveId, userId: 'userA', amount: 100, category: 'groceries', description: 'Shared', type: 'shared', date: new Date() },
      { userId: 'userA', amount: 500, category: 'shopping', description: 'Personal', type: 'personal', date: new Date() },
    ])

    const result = await calculateHiveBalance(hiveId)
    expect(result.totalSharedSpend).toBe(100)
  })

  it('accounts for completed transfers in remaining imbalance', async () => {
    await Expense.create([
      { hiveId, userId: 'userA', amount: 400, category: 'rent', description: 'Rent', type: 'shared', date: new Date() },
    ])

    await Transfer.create({
      hiveId,
      fromUserId: 'userB',
      toUserId: 'userA',
      initiatedByUserId: 'userB',
      amount: 100,
      currency: 'ILS',
      status: 'completed',
      source: 'open_finance',
      date: new Date(),
      providerId: 'test-provider',
      providerTransferId: 'test-transfer-1',
      completedAt: new Date(),
    })

    const result = await calculateHiveBalance(hiveId)
    expect(result.completedTransfersTotal).toBe(100)
    const userB = result.contributions.find((c) => c.userId === 'userB')
    expect(userB.settled).toBe(100)
    expect(userB.remainingNet).toBe(-100)
    expect(result.suggestedTransfer.amount).toBe(100)
  })

  it('returns null for non-existent hive', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const result = await calculateHiveBalance(fakeId)
    expect(result).toBeNull()
  })

  it('handles single expense from one user correctly', async () => {
    await Expense.create({
      hiveId,
      userId: 'userA',
      amount: 200,
      category: 'utilities',
      description: 'Electric',
      type: 'shared',
      date: new Date(),
    })

    const result = await calculateHiveBalance(hiveId)
    expect(result.balanceStatus).toBe('imbalanced')
    expect(result.equalShare).toBe(100)
    expect(result.suggestedTransfer.fromUserId).toBe('userB')
    expect(result.suggestedTransfer.toUserId).toBe('userA')
    expect(result.suggestedTransfer.amount).toBe(100)
  })

  it('returns balanced after full settlement via transfer', async () => {
    await Expense.create({
      hiveId,
      userId: 'userA',
      amount: 200,
      category: 'groceries',
      description: 'Shop',
      type: 'shared',
      date: new Date(),
    })

    await Transfer.create({
      hiveId,
      fromUserId: 'userB',
      toUserId: 'userA',
      initiatedByUserId: 'userB',
      amount: 100,
      currency: 'ILS',
      status: 'completed',
      source: 'open_finance',
      date: new Date(),
      providerId: 'test-provider',
      providerTransferId: 'test-transfer-2',
      completedAt: new Date(),
    })

    const result = await calculateHiveBalance(hiveId)
    expect(result.balanceStatus).toBe('balanced')
    expect(result.suggestedTransfer).toBeNull()
  })
})

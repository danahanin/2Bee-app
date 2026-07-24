jest.mock('../../src/ai/classification', () => ({
  classifyExpense: jest.fn(),
  fromBankTransaction: jest.requireActual('../../src/ai/classification/expenseSignal').fromBankTransaction,
}))

jest.mock('../../src/ai/classifier', () => ({
  classifyExpenseRuleBased: jest.fn(),
}))

const { classifyExpense } = require('../../src/ai/classification')
const { classifyExpenseRuleBased } = require('../../src/ai/classifier')
const { classifyTransaction, mapCategory } = require('../transactionSync')

describe('mapCategory', () => {
  it('maps known raw categories', () => {
    expect(mapCategory('supermarket')).toBe('groceries')
    expect(mapCategory('restaurant')).toBe('dining')
  })

  it('defaults unknown categories to other', () => {
    expect(mapCategory('mystery')).toBe('other')
    expect(mapCategory(undefined)).toBe('other')
  })
})

describe('classifyTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks an AI classification as a pending suggestion needing review', async () => {
    classifyExpense.mockResolvedValue({
      category: { value: 'groceries', confidence: 0.8, source: 'ai' },
      personalOrShared: { value: 'shared', confidence: 0.9, reasoning: 'household groceries', retrieved: [], source: 'ai' },
      hive: { expenseGroupId: 'group-1', groupName: 'Household', confidence: 0.7, reasoning: 'x', alternatives: [], source: 'ai' },
    })

    const result = await classifyTransaction(
      { description: 'SHUFERSAL', amount: -152, category: 'supermarket' },
      { userId: 'u1', hiveId: 'hive-1', userSharedCategories: [] },
    )

    expect(result).toEqual({
      category: 'groceries',
      type: 'shared',
      expenseGroupId: 'group-1',
      classifiedBy: 'ai',
      needsReview: true,
      aiSuggestion: {
        category: { value: 'groceries', confidence: 0.8 },
        type: { value: 'shared', confidence: 0.9, reasoning: 'household groceries' },
        hive: { expenseGroupId: 'group-1', groupName: 'Household', confidence: 0.7 },
      },
    })
    expect(classifyExpenseRuleBased).not.toHaveBeenCalled()
  })

  it('stores no hive snapshot when the expense is personal', async () => {
    classifyExpense.mockResolvedValue({
      category: { value: 'health', confidence: 0.7, source: 'ai' },
      personalOrShared: { value: 'personal', confidence: 0.9, reasoning: 'solo haircut', retrieved: [], source: 'ai' },
      hive: null,
    })

    const result = await classifyTransaction(
      { description: 'BARBER SHOP', amount: -80 },
      { userId: 'u1', hiveId: 'hive-1' },
    )

    expect(result.expenseGroupId).toBeNull()
    expect(result.aiSuggestion.hive).toBeNull()
    expect(result.needsReview).toBe(true)
  })

  it('falls back to the rule-based classifier without needsReview when classification throws', async () => {
    classifyExpense.mockRejectedValue(new Error('unexpected failure'))
    classifyExpenseRuleBased.mockReturnValue({ label: 'personal', confidence: 0.5, reasoning: 'default' })

    const result = await classifyTransaction(
      { description: 'UNKNOWN VENDOR', amount: -20 },
      { userId: 'u1', hiveId: 'hive-1', userSharedCategories: [] },
    )

    expect(result).toEqual({
      category: 'other',
      type: 'personal',
      expenseGroupId: null,
      classifiedBy: 'user',
      needsReview: false,
      aiSuggestion: null,
    })
  })
})

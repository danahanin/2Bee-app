jest.mock('../classifyCategory', () => ({
  classifyCategory: jest.fn(),
}))

jest.mock('../classifyPersonalOrShared', () => ({
  classifyPersonalOrShared: jest.fn(),
}))

jest.mock('../../phase2/suggestHive', () => ({
  suggestHive: jest.fn(),
}))

const { classifyCategory } = require('../classifyCategory')
const { classifyPersonalOrShared } = require('../classifyPersonalOrShared')
const { suggestHive } = require('../../phase2/suggestHive')
const { classifyExpense } = require('../classifyExpense')
const { fromManualExpense, fromBankTransaction } = require('../expenseSignal')

describe('classifyExpense', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('skips the hive task when the expense is personal', async () => {
    classifyCategory.mockResolvedValue({ value: 'health', confidence: 0.8, source: 'ai' })
    classifyPersonalOrShared.mockResolvedValue({
      value: 'personal',
      confidence: 0.9,
      reasoning: 'solo haircut',
      retrieved: [],
      source: 'ai',
    })

    const signal = fromManualExpense({ description: 'Haircut', amount: 80, category: 'health' })
    const result = await classifyExpense(signal, { userId: 'u1', hiveId: 'hive-1' })

    expect(result.hive).toBeNull()
    expect(suggestHive).not.toHaveBeenCalled()
    expect(result.category.value).toBe('health')
    expect(result.personalOrShared.value).toBe('personal')
  })

  it('runs the hive task and tags an AI-derived hive suggestion as source ai', async () => {
    classifyCategory.mockResolvedValue({ value: 'groceries', confidence: 0.8, source: 'ai' })
    classifyPersonalOrShared.mockResolvedValue({
      value: 'shared',
      confidence: 0.85,
      reasoning: 'household groceries',
      retrieved: [],
      source: 'ai',
    })
    suggestHive.mockResolvedValue({
      expenseGroupId: 'group-1',
      groupName: 'Household',
      confidence: 0.8,
      reasoning: 'Matches household spending pattern',
      alternatives: [],
    })

    const signal = fromBankTransaction({ description: 'SHUFERSAL', amount: -152 }, { category: 'groceries' })
    const result = await classifyExpense(signal, { userId: 'u1', hiveId: 'hive-1' })

    expect(suggestHive).toHaveBeenCalledWith(signal, { hiveId: 'hive-1', userId: 'u1', k: 5 })
    expect(result.hive).toEqual(
      expect.objectContaining({ expenseGroupId: 'group-1', groupName: 'Household', source: 'ai' }),
    )
  })

  it('tags a fallback hive suggestion as source fallback', async () => {
    classifyCategory.mockResolvedValue({ value: 'other', confidence: 0.5, source: 'fallback' })
    classifyPersonalOrShared.mockResolvedValue({
      value: 'shared',
      confidence: 0.6,
      reasoning: '[fallback] Matched shared keywords',
      retrieved: [],
      source: 'fallback',
    })
    suggestHive.mockResolvedValue({
      expenseGroupId: 'group-1',
      groupName: 'Partner',
      confidence: 0.55,
      reasoning: '[fallback] The model was unavailable, so a default group was suggested.',
      alternatives: [],
    })

    const result = await classifyExpense(
      fromManualExpense({ description: 'Something unusual', amount: 50 }),
      { userId: 'u1', hiveId: 'hive-1' },
    )

    expect(result.hive.source).toBe('fallback')
  })
})

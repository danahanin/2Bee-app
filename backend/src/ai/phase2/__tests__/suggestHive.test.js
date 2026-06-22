const mongoose = require('mongoose')

const {
  AUTO_ACCEPT_CONFIDENCE,
  buildHivePrompt,
  parseHiveSuggestion,
  shouldAutoAcceptSuggestion,
} = require('../suggestHive')

describe('suggestHive helpers', () => {
  const groups = [
    { _id: new mongoose.Types.ObjectId(), name: 'Partner' },
    { _id: new mongoose.Types.ObjectId(), name: 'Work' },
  ]

  it('builds a prompt with available groups and retrieved examples', () => {
    const prompt = buildHivePrompt(
      {
        vendor: 'Cafe Aroma',
        amount: 68,
        currency: 'ILS',
        category: 'dining',
        date: '2026-06-13',
        lineItems: [{ description: 'Coffee', amount: 18 }],
      },
      groups,
      [{ text: 'client lunch', metadata: { groupName: 'Work' } }],
    )

    expect(prompt).toContain('Cafe Aroma')
    expect(prompt).toContain('Work')
    expect(prompt).toContain('client lunch')
    expect(prompt).toContain('"alternatives"')
  })

  it('normalizes parsed hive suggestions to known groups', () => {
    const suggestion = parseHiveSuggestion(
      JSON.stringify({
        expenseGroupId: String(groups[1]._id),
        confidence: 1.4,
        reasoning: 'Looks like a work meal',
        alternatives: [{ groupId: String(groups[0]._id), name: 'Partner', score: 0.4 }],
      }),
      groups,
    )

    expect(suggestion).toEqual(
      expect.objectContaining({
        expenseGroupId: String(groups[1]._id),
        groupName: 'Work',
        confidence: 1,
        reasoning: 'Looks like a work meal',
      }),
    )
    expect(suggestion.alternatives).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ groupId: String(groups[1]._id), name: 'Work' }),
        expect.objectContaining({ groupId: String(groups[0]._id), name: 'Partner' }),
      ]),
    )
  })

  it('auto-accepts only confident suggestions with a group id', () => {
    expect(
      shouldAutoAcceptSuggestion({ expenseGroupId: String(groups[0]._id), confidence: AUTO_ACCEPT_CONFIDENCE }),
    ).toBe(true)
    expect(shouldAutoAcceptSuggestion({ expenseGroupId: String(groups[0]._id), confidence: 0.4 })).toBe(false)
    expect(shouldAutoAcceptSuggestion({ expenseGroupId: null, confidence: 0.99 })).toBe(false)
  })
})

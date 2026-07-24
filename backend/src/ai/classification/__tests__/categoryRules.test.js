const { classifyCategoryRuleBased } = require('../categoryRules')

describe('classifyCategoryRuleBased', () => {
  it('matches a groceries keyword', () => {
    const result = classifyCategoryRuleBased('Weekly shop at Shufersal supermarket')
    expect(result.value).toBe('groceries')
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('matches shopping for personal-care terms like haircuts', () => {
    const result = classifyCategoryRuleBased('Got a haircut at the barber')
    expect(result.value).toBe('shopping')
  })

  it('matches health for medical terms', () => {
    const result = classifyCategoryRuleBased('Checkup at the dentist')
    expect(result.value).toBe('health')
  })

  it('defaults to other when nothing matches', () => {
    const result = classifyCategoryRuleBased('completely unrecognizable text 12345')
    expect(result.value).toBe('other')
    expect(result.confidence).toBeLessThan(0.5)
  })
})

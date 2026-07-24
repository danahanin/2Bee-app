/**
 * Golden set for the model evaluation harness (evalClassifier.js). Hand-labelled and
 * kept separate from scripts/classificationExamplesData.js (the seed data fed into the
 * vector store) on purpose — mixing them would let the harness "cheat" via near-exact
 * retrieval matches instead of measuring how a model generalizes to new descriptions.
 */

/**
 * @typedef {Object} CategoryGoldenItem
 * @property {string} id
 * @property {import('../classification/expenseSignal').ExpenseSignal} signal
 * @property {string} expectedCategory
 */

/** @type {CategoryGoldenItem[]} */
const CATEGORY_GOLDEN_SET = [
  { id: 'cat-001', signal: { description: 'Weekly Shufersal grocery run', amount: 340 }, expectedCategory: 'groceries' },
  { id: 'cat-002', signal: { description: 'Rami Levy bulk shopping', amount: 210 }, expectedCategory: 'groceries' },
  { id: 'cat-003', signal: { description: 'שופרסל קניות שבועיות', amount: 280 }, expectedCategory: 'groceries' },
  { id: 'cat-004', signal: { description: 'Fresh produce and eggs at the corner store', amount: 65 }, expectedCategory: 'groceries' },

  { id: 'cat-005', signal: { description: 'Dinner at Cafe Aroma with friends', amount: 145 }, expectedCategory: 'dining' },
  { id: 'cat-006', signal: { description: 'Sushi takeout order', amount: 98 }, expectedCategory: 'dining' },
  { id: 'cat-007', signal: { description: 'ארוחת בוקר בבית קפה', amount: 60 }, expectedCategory: 'dining' },
  { id: 'cat-008', signal: { description: 'Burger and fries at the mall food court', amount: 52 }, expectedCategory: 'dining' },

  { id: 'cat-009', signal: { description: 'Gett taxi ride home', amount: 38 }, expectedCategory: 'transport' },
  { id: 'cat-010', signal: { description: 'Monthly Rav-Kav bus pass top-up', amount: 225 }, expectedCategory: 'transport' },
  { id: 'cat-011', signal: { description: 'Paz gas station fill-up', amount: 300 }, expectedCategory: 'transport' },
  { id: 'cat-012', signal: { description: 'חניה בחניון העירייה', amount: 20 }, expectedCategory: 'transport' },

  { id: 'cat-013', signal: { description: 'Israel Electric Corporation bimonthly bill', amount: 480 }, expectedCategory: 'utilities' },
  { id: 'cat-014', signal: { description: 'Municipal water and sewage bill', amount: 210 }, expectedCategory: 'utilities' },
  { id: 'cat-015', signal: { description: 'Bezeq home internet subscription', amount: 99 }, expectedCategory: 'utilities' },
  { id: 'cat-016', signal: { description: 'חשבון גז ביתי', amount: 150 }, expectedCategory: 'utilities' },

  { id: 'cat-017', signal: { description: 'Monthly apartment rent transfer', amount: 5200 }, expectedCategory: 'rent' },
  { id: 'cat-018', signal: { description: 'שכר דירה לחודש יולי', amount: 4800 }, expectedCategory: 'rent' },

  { id: 'cat-019', signal: { description: 'Movie tickets at Cinema City', amount: 90 }, expectedCategory: 'entertainment' },
  { id: 'cat-020', signal: { description: 'Concert tickets for the weekend show', amount: 320 }, expectedCategory: 'entertainment' },
  { id: 'cat-021', signal: { description: 'Bowling night with friends', amount: 80 }, expectedCategory: 'entertainment' },

  { id: 'cat-022', signal: { description: 'Dentist appointment copay', amount: 250 }, expectedCategory: 'health' },
  { id: 'cat-023', signal: { description: 'Pharmacy prescription pickup', amount: 75 }, expectedCategory: 'health' },
  { id: 'cat-024', signal: { description: 'Haircut and beard trim at the barber', amount: 90 }, expectedCategory: 'health' },
  { id: 'cat-025', signal: { description: 'תור לרופא שיניים', amount: 300 }, expectedCategory: 'health' },

  { id: 'cat-026', signal: { description: 'New running shoes at the mall', amount: 420 }, expectedCategory: 'shopping' },
  { id: 'cat-027', signal: { description: 'Winter jacket from Zara', amount: 350 }, expectedCategory: 'shopping' },
  { id: 'cat-028', signal: { description: 'Amazon order for a phone case', amount: 45 }, expectedCategory: 'shopping' },

  { id: 'cat-029', signal: { description: 'Netflix monthly subscription', amount: 55 }, expectedCategory: 'subscriptions' },
  { id: 'cat-030', signal: { description: 'Spotify Premium family plan', amount: 40 }, expectedCategory: 'subscriptions' },
  { id: 'cat-031', signal: { description: 'Gym membership monthly charge', amount: 180 }, expectedCategory: 'subscriptions' },

  { id: 'cat-032', signal: { description: 'Flight tickets to Athens for the weekend', amount: 1800 }, expectedCategory: 'travel' },
  { id: 'cat-033', signal: { description: 'Hotel booking for a family trip', amount: 950 }, expectedCategory: 'travel' },
  { id: 'cat-034', signal: { description: 'כרטיסי טיסה לחופשה', amount: 2200 }, expectedCategory: 'travel' },

  { id: 'cat-035', signal: { description: 'Online course tuition for a coding bootcamp', amount: 1200 }, expectedCategory: 'education' },
  { id: 'cat-036', signal: { description: 'Textbooks for the semester', amount: 260 }, expectedCategory: 'education' },

  { id: 'cat-037', signal: { description: 'Miscellaneous payment with no clear category', amount: 30 }, expectedCategory: 'other' },
  { id: 'cat-038', signal: { description: 'Bank service fee', amount: 15 }, expectedCategory: 'other' },
]

/**
 * @typedef {Object} PersonalOrSharedGoldenItem
 * @property {string} id
 * @property {import('../classification/expenseSignal').ExpenseSignal} signal
 * @property {'personal'|'shared'} expectedType
 */

/** @type {PersonalOrSharedGoldenItem[]} */
const PERSONAL_OR_SHARED_GOLDEN_SET = [
  // Strong personal signals — the case the user explicitly called out as high-value
  // (individual grooming/treats/hobbies with a very low probability of being shared).
  { id: 'ps-001', signal: { description: 'Haircut at the barber shop', amount: 90 }, expectedType: 'personal' },
  { id: 'ps-002', signal: { description: 'Manicure and pedicure appointment', amount: 140 }, expectedType: 'personal' },
  { id: 'ps-003', signal: { description: 'Solo lunch during a work break', amount: 45 }, expectedType: 'personal' },
  { id: 'ps-004', signal: { description: 'Personal gym membership renewal', amount: 180 }, expectedType: 'personal' },
  { id: 'ps-005', signal: { description: 'New pair of running shoes for myself', amount: 380 }, expectedType: 'personal' },
  { id: 'ps-006', signal: { description: 'Birthday gift for a coworker', amount: 100 }, expectedType: 'personal' },
  { id: 'ps-007', signal: { description: 'Video game purchased on Steam', amount: 60 }, expectedType: 'personal' },
  { id: 'ps-008', signal: { description: 'Massage therapy session', amount: 220 }, expectedType: 'personal' },
  { id: 'ps-009', signal: { description: 'תספורת במספרה', amount: 85 }, expectedType: 'personal' },
  { id: 'ps-010', signal: { description: 'Personal skincare products', amount: 130 }, expectedType: 'personal' },
  { id: 'ps-011', signal: { description: 'Book bought for personal reading', amount: 55 }, expectedType: 'personal' },
  { id: 'ps-012', signal: { description: 'Coffee grabbed alone on the way to work', amount: 18 }, expectedType: 'personal' },
  { id: 'ps-013', signal: { description: 'Parking ticket fine', amount: 250 }, expectedType: 'personal' },
  { id: 'ps-014', signal: { description: 'Subscription to a personal fitness app', amount: 25 }, expectedType: 'personal' },
  { id: 'ps-015', signal: { description: 'ארוחת צהריים לבד בעבודה', amount: 40 }, expectedType: 'personal' },

  // Strong shared signals.
  { id: 'ps-016', signal: { description: 'Full weekly grocery shop for the household', amount: 320 }, expectedType: 'shared' },
  { id: 'ps-017', signal: { description: 'Electricity bill for the apartment', amount: 460 }, expectedType: 'shared' },
  { id: 'ps-018', signal: { description: 'Rent payment for the shared apartment', amount: 5200 }, expectedType: 'shared' },
  { id: 'ps-019', signal: { description: 'Dinner date with partner at a restaurant', amount: 210 }, expectedType: 'shared' },
  { id: 'ps-020', signal: { description: 'Household cleaning supplies', amount: 70 }, expectedType: 'shared' },
  { id: 'ps-021', signal: { description: 'Joint Netflix family subscription', amount: 55 }, expectedType: 'shared' },
  { id: 'ps-022', signal: { description: 'Baby diapers and formula', amount: 180 }, expectedType: 'shared' },
  { id: 'ps-023', signal: { description: 'Home internet bill', amount: 99 }, expectedType: 'shared' },
  { id: 'ps-024', signal: { description: 'Vet visit for the family dog', amount: 350 }, expectedType: 'shared' },
  { id: 'ps-025', signal: { description: 'Weekend trip hotel booked for both of us', amount: 900 }, expectedType: 'shared' },
  { id: 'ps-026', signal: { description: 'קניות שבועיות למשק בית', amount: 300 }, expectedType: 'shared' },
  { id: 'ps-027', signal: { description: 'Furniture for the shared living room', amount: 1400 }, expectedType: 'shared' },
  { id: 'ps-028', signal: { description: 'Building maintenance fee (vaad bayit)', amount: 120 }, expectedType: 'shared' },
  { id: 'ps-029', signal: { description: 'Car insurance for the shared family car', amount: 480 }, expectedType: 'shared' },
  { id: 'ps-030', signal: { description: 'Anniversary dinner with my partner', amount: 260 }, expectedType: 'shared' },

  // Ambiguous/tricky cases — genuinely testing judgment, not just keyword matching.
  { id: 'ps-031', signal: { description: 'Coffee for two at a cafe with my partner', amount: 36 }, expectedType: 'shared' },
  { id: 'ps-032', signal: { description: 'Solo weekend trip flight ticket', amount: 650 }, expectedType: 'personal' },
  { id: 'ps-033', signal: { description: 'Gift bought for my partner\'s birthday', amount: 300 }, expectedType: 'personal' },
  { id: 'ps-034', signal: { description: 'Work conference travel expense reimbursed later', amount: 900 }, expectedType: 'personal' },
  { id: 'ps-035', signal: { description: 'Shared Uber ride to a joint event', amount: 42 }, expectedType: 'shared' },
]

module.exports = { CATEGORY_GOLDEN_SET, PERSONAL_OR_SHARED_GOLDEN_SET }

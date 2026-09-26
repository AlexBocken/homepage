const CATEGORY_EMOJI = {
  groceries: '🛒',
  shopping: '🛍️',
  travel: '🚆',
  holidays: '🏖️',
  restaurant: '🍽️',
  utilities: '⚡',
  fun: '🎉',
  settlement: '🤝'
} as const;

export type PaymentCategory = keyof typeof CATEGORY_EMOJI;

export function getCategoryEmoji(category: PaymentCategory) {
  return CATEGORY_EMOJI[category] || CATEGORY_EMOJI.groceries;
}

export const PAYMENT_CATEGORIES = {
  groceries: {
    name: 'Groceries',
    emoji: '🛒'
  },
  shopping: {
    name: 'Shopping', 
    emoji: '🛍️'
  },
  travel: {
    name: 'Travel',
    emoji: '🚆'
  },
  restaurant: {
    name: 'Restaurant',
    emoji: '🍽️'
  },
  utilities: {
    name: 'Utilities',
    emoji: '⚡'
  },
  fun: {
    name: 'Fun',
    emoji: '🎉'
  }
} as const;

export type PaymentCategory = keyof typeof PAYMENT_CATEGORIES;

export function getCategoryInfo(category: PaymentCategory) {
  return PAYMENT_CATEGORIES[category] || PAYMENT_CATEGORIES.groceries;
}

export function getCategoryEmoji(category: PaymentCategory) {
  return getCategoryInfo(category).emoji;
}

export function getCategoryName(category: PaymentCategory) {
  return getCategoryInfo(category).name;
}

export function getCategoryOptions() {
  return Object.entries(PAYMENT_CATEGORIES).map(([key, value]) => ({
    value: key as PaymentCategory,
    label: `${value.emoji} ${value.name}`,
    emoji: value.emoji,
    name: value.name
  }));
}
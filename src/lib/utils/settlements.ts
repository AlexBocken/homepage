// Utility functions for identifying and handling settlement payments

/**
 * Identifies if a payment is a settlement payment based on category
 */
export function isSettlementPayment(payment: any): boolean {
  if (!payment) return false;
  
  // Check if category is settlement
  return payment.category === 'settlement';
}

/**
 * Gets the settlement icon for settlement payments
 */
export function getSettlementIcon(): string {
  return '🤝'; // Handshake emoji for settlements
}

/**
 * Gets appropriate styling classes for settlement payments
 */
export function getSettlementClasses(payment: any): string[] {
  if (!isSettlementPayment(payment)) {
    return [];
  }
  
  return ['settlement-payment'];
}

/**
 * Gets settlement-specific display text
 */
export function getSettlementDisplayText(payment: any): string {
  if (!isSettlementPayment(payment)) {
    return '';
  }
  
  return 'Settlement';
}

/**
 * Gets the other user in a settlement (the one who didn't pay)
 */
export function getSettlementReceiver(payment: any): string {
  if (!isSettlementPayment(payment) || !payment.splits) {
    return '';
  }
  
  // Find the user who has a positive amount (the receiver)
  const receiver = payment.splits.find(split => split.amount > 0);
  if (receiver && receiver.username) {
    return receiver.username;
  }
  
  // Fallback: find the user who is not the payer
  const otherUser = payment.splits.find(split => split.username !== payment.paidBy);
  if (otherUser && otherUser.username) {
    return otherUser.username;
  }
  
  return '';
}
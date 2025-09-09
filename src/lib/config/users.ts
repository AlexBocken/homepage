// Predefined users configuration for Cospend
// When this array has exactly 2 users, the system will always split between them
// For more users, manual selection is allowed

export const PREDEFINED_USERS = [
  'alexander',
  'anna'
];

export function isPredefinedUsersMode(): boolean {
  return PREDEFINED_USERS.length === 2;
}

export function getAvailableUsers(): string[] {
  return [...PREDEFINED_USERS];
}
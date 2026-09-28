import { error } from '@sveltejs/kit';
import { AngelusStreak } from '$models/AngelusStreak';
import { streakHandlers } from '$lib/server/streakApi';

export const { GET, POST } = streakHandlers({
  model: AngelusStreak,
  what: 'angelus streak',
  fields: { streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 0, todayDate: null },
  timestampField: 'lastCompleteTs',
  validate: ({ streak, lastComplete, todayPrayed, todayDate }) => {
    if (typeof streak !== 'number' || streak < 0) {
      throw error(400, 'Valid streak required');
    }

    if (lastComplete !== null && typeof lastComplete !== 'string') {
      throw error(400, 'Invalid lastComplete format');
    }

    if (typeof todayPrayed !== 'number' || todayPrayed < 0 || todayPrayed > 7) {
      throw error(400, 'Invalid todayPrayed bitmask');
    }

    if (todayDate !== null && typeof todayDate !== 'string') {
      throw error(400, 'Invalid todayDate format');
    }
  }
});

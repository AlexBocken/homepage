import { error } from '@sveltejs/kit';
import { RosaryStreak } from '$models/RosaryStreak';
import { streakHandlers } from '$lib/server/streakApi';

export const { GET, POST } = streakHandlers({
  model: RosaryStreak,
  what: 'rosary streak',
  fields: { length: 0, lastPrayed: null, lastPrayedTs: null },
  timestampField: 'lastPrayedTs',
  validate: ({ length, lastPrayed }) => {
    if (typeof length !== 'number' || length < 0) {
      throw error(400, 'Valid streak length required');
    }

    if (lastPrayed !== null && typeof lastPrayed !== 'string') {
      throw error(400, 'Invalid lastPrayed format');
    }
  }
});

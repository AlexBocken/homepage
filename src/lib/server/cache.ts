import Redis from 'ioredis';

// Key prefix for namespace isolation
const KEY_PREFIX = 'homepage:';

// Redis client configuration
const redis = new Redis({
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(process.env.REDIS_PORT || '6379'),
	// Reconnection strategy: exponential backoff with max 2 seconds
	retryStrategy: (times) => Math.min(times * 50, 2000),
	// Lazy connect to avoid blocking startup
	lazyConnect: true,
	// Connection timeout
	connectTimeout: 10000,
	// Enable offline queue to buffer commands during reconnection
	enableOfflineQueue: true,
});

// Track connection status
let isConnected = false;
let isConnecting = false;

// Graceful connection with error handling
async function ensureConnection(): Promise<boolean> {
	if (isConnected) {
		return true;
	}

	if (isConnecting) {
		// Wait for ongoing connection attempt
		return new Promise((resolve) => {
			const checkInterval = setInterval(() => {
				if (isConnected || !isConnecting) {
					clearInterval(checkInterval);
					resolve(isConnected);
				}
			}, 100);
		});
	}

	isConnecting = true;
	try {
		await redis.connect();
		isConnected = true;
		console.log('[Redis] Connected successfully');
		return true;
	} catch (err) {
		console.error('[Redis] Connection failed:', err);
		isConnected = false;
		return false;
	} finally {
		isConnecting = false;
	}
}

// Handle connection events
redis.on('connect', () => {
	isConnected = true;
	console.log('[Redis] Connected');
});

redis.on('ready', () => {
	isConnected = true;
	console.log('[Redis] Ready');
});

redis.on('error', (err) => {
	console.error('[Redis] Error:', err);
});

redis.on('close', () => {
	isConnected = false;
	console.log('[Redis] Connection closed');
});

redis.on('reconnecting', () => {
	console.log('[Redis] Reconnecting...');
});

// Helper function to add prefix to keys
function prefixKey(key: string): string {
	return `${KEY_PREFIX}${key}`;
}

// Helper function to add prefix to multiple keys
function prefixKeys(keys: string[]): string[] {
	return keys.map(prefixKey);
}

/**
 * Cache wrapper with automatic key prefixing and error handling
 */
export const cache = {
	/**
	 * Get a value from cache
	 */
	async get(key: string): Promise<string | null> {
		if (!(await ensureConnection())) {
			return null;
		}

		try {
			return await redis.get(prefixKey(key));
		} catch (err) {
			console.error(`[Redis] GET error for key "${key}":`, err);
			return null;
		}
	},

	/**
	 * Set a value in cache with optional TTL (in seconds)
	 */
	async set(key: string, value: string, ttl?: number): Promise<boolean> {
		if (!(await ensureConnection())) {
			return false;
		}

		try {
			if (ttl) {
				await redis.setex(prefixKey(key), ttl, value);
			} else {
				await redis.set(prefixKey(key), value);
			}
			return true;
		} catch (err) {
			console.error(`[Redis] SET error for key "${key}":`, err);
			return false;
		}
	},

	/**
	 * Delete one or more keys from cache
	 */
	async del(...keys: string[]): Promise<number> {
		if (!(await ensureConnection())) {
			return 0;
		}

		try {
			const prefixedKeys = prefixKeys(keys);
			return await redis.del(...prefixedKeys);
		} catch (err) {
			console.error(`[Redis] DEL error for keys "${keys.join(', ')}":`, err);
			return 0;
		}
	},

	/**
	 * Delete all keys matching a pattern (uses SCAN for safety)
	 * Pattern should NOT include the prefix (it will be added automatically)
	 */
	async delPattern(pattern: string): Promise<number> {
		if (!(await ensureConnection())) {
			return 0;
		}

		try {
			const prefixedPattern = prefixKey(pattern);
			const keys: string[] = [];
			let cursor = '0';

			// Use SCAN to safely iterate through keys
			do {
				const [nextCursor, matchedKeys] = await redis.scan(
					cursor,
					'MATCH',
					prefixedPattern,
					'COUNT',
					100
				);
				cursor = nextCursor;
				keys.push(...matchedKeys);
			} while (cursor !== '0');

			if (keys.length > 0) {
				return await redis.del(...keys);
			}
			return 0;
		} catch (err) {
			console.error(`[Redis] DEL PATTERN error for pattern "${pattern}":`, err);
			return 0;
		}
	},

	/**
	 * Redis Set operations for managing sets (e.g., user favorites)
	 */
	sets: {
		/**
		 * Add members to a set
		 */
		async add(key: string, ...members: string[]): Promise<number> {
			if (!(await ensureConnection())) {
				return 0;
			}

			try {
				return await redis.sadd(prefixKey(key), ...members);
			} catch (err) {
				console.error(`[Redis] SADD error for key "${key}":`, err);
				return 0;
			}
		},

		/**
		 * Remove members from a set
		 */
		async remove(key: string, ...members: string[]): Promise<number> {
			if (!(await ensureConnection())) {
				return 0;
			}

			try {
				return await redis.srem(prefixKey(key), ...members);
			} catch (err) {
				console.error(`[Redis] SREM error for key "${key}":`, err);
				return 0;
			}
		},

		/**
		 * Get all members of a set
		 */
		async members(key: string): Promise<string[]> {
			if (!(await ensureConnection())) {
				return [];
			}

			try {
				return await redis.smembers(prefixKey(key));
			} catch (err) {
				console.error(`[Redis] SMEMBERS error for key "${key}":`, err);
				return [];
			}
		},

		/**
		 * Check if a member exists in a set
		 */
		async isMember(key: string, member: string): Promise<boolean> {
			if (!(await ensureConnection())) {
				return false;
			}

			try {
				const result = await redis.sismember(prefixKey(key), member);
				return result === 1;
			} catch (err) {
				console.error(`[Redis] SISMEMBER error for key "${key}":`, err);
				return false;
			}
		},
	},

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{ hits: number; misses: number; hitRate: string } | null> {
		if (!(await ensureConnection())) {
			return null;
		}

		try {
			const info = await redis.info('stats');
			const hitsMatch = info.match(/keyspace_hits:(\d+)/);
			const missesMatch = info.match(/keyspace_misses:(\d+)/);

			const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
			const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
			const total = hits + misses;
			const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';

			return { hits, misses, hitRate: `${hitRate}%` };
		} catch (err) {
			console.error('[Redis] Error getting stats:', err);
			return null;
		}
	},
};

// Graceful shutdown
process.on('SIGTERM', () => {
	redis.quit();
});

process.on('SIGINT', () => {
	redis.quit();
});

/**
 * Helper function to invalidate all recipe caches
 * Call this after recipe create/update/delete operations
 */
export async function invalidateRecipeCaches(): Promise<void> {
	try {
		// Clear all recipe-related caches in parallel
		await Promise.all([
			cache.del('recipes:all_brief'),
			cache.delPattern('recipes:tag:*'),
			cache.delPattern('recipes:in_season:*'),
			cache.delPattern('recipes:category:*'),
			cache.delPattern('recipes:icon:*'),
		]);
	} catch (err) {
		console.error('[Cache] Error invalidating recipe caches:', err);
	}
}

/**
 * Helper function to invalidate cospend caches for specific users and/or payments
 * Call this after payment create/update/delete operations
 * @param usernames - Array of usernames whose caches should be invalidated
 * @param paymentId - Optional payment ID to invalidate specific payment cache
 */
export async function invalidateCospendCaches(usernames: string[], paymentId?: string): Promise<void> {
	try {
		const invalidations: Promise<any>[] = [];

		// Invalidate balance and debts caches for all affected users
		for (const username of usernames) {
			invalidations.push(
				cache.del(`cospend:balance:${username}`),
				cache.del(`cospend:debts:${username}`)
			);
		}

		// Invalidate global balance cache
		invalidations.push(cache.del('cospend:balance:all'));

		// Invalidate payment list caches (all pagination variants)
		invalidations.push(cache.delPattern('cospend:payments:list:*'));

		// If specific payment ID provided, invalidate its cache
		if (paymentId) {
			invalidations.push(cache.del(`cospend:payment:${paymentId}`));
		}

		await Promise.all(invalidations);
	} catch (err) {
		console.error('[Cache] Error invalidating cospend caches:', err);
	}
}

export default cache;

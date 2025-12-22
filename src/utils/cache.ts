import { Redis } from "@upstash/redis";

const { UPSTASH_URL, UPSTASH_TOKEN } = import.meta.env;

const redis = new Redis({
	url: UPSTASH_URL!,
	token: UPSTASH_TOKEN!,
});


interface CacheItem<T> {
	data: T;
	lastUpdated: number;
}

type FetchFunction<T> = () => Promise<T>;

/**
 * Creates a cached fetcher that can be reused and revalidated.
 *
 * @example
 * ```ts
 * // Create a cached fetcher for user data
 * const userCache = createCachedFetcher('user', async (userId: string) => {
 *   const response = await fetch(`/api/users/${userId}`);
 *   return response.json();
 * });
 *
 * // First call - fetches from API and caches
 * const userData = await userCache.fetch('123');
 *
 * // Subsequent calls - returns from cache
 * const cachedUser = await userCache.fetch('123');
 *
 * // Force refresh when needed
 * await userCache.revalidate('123');
 * const freshData = await userCache.fetch('123');
 *
 * // Check last update time
 * const lastUpdated = await userCache.getLastUpdated('123');
 * ```
 */
export function createCachedFetcher<T, P extends string = string>(
	namespace: string,
	fetchFn: (param: P) => Promise<T>,
	options: { ttl?: number } = {},
) {
	const { ttl = 86400 } = options; // Default TTL: 1 day

	const getCacheKey = (param: P) => `${namespace}:${param}`;

	return {
		/**
		 * Fetches data, using cache if available
		 */
		async fetch(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);

			try {
				// Try to get from cache first
				const cached = await redis.get<CacheItem<T>>(cacheKey);
				if (cached) {
					console.log(`[Cache] Hit for ${cacheKey}`);
					return cached.data;
				}
			} catch (error) {
				console.warn(
					`[Cache] Error reading from cache for ${cacheKey}:`,
					error,
				);
				// Continue with fresh fetch on cache error
			}

			// If not in cache or cache error, fetch fresh data
			return this.revalidate(param);
		},

		/**
		 * Force fetches fresh data and updates cache
		 */
		async revalidate(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);

			try {
				// Fetch fresh data
				const freshData = await fetchFn(param);

				// Update cache
				const cacheItem: CacheItem<T> = {
					data: freshData,
					lastUpdated: Date.now(),
				};

				try {
					await redis.set(cacheKey, cacheItem, { ex: ttl });
				} catch (cacheError) {
					console.warn(
						`[Cache] Error writing to Redis for ${cacheKey}:`,
						cacheError,
					);
					// Continue even if cache write fails
				}

				return freshData;
			} catch (error) {
				console.error(
					`[Cache] Error fetching/caching data for ${cacheKey}:`,
					error,
				);
				throw error; // Re-throw to let caller handle fetch errors
			}
		},

		/**
		 * Gets the last update timestamp for a cached item
		 * @returns timestamp in milliseconds or null if not cached
		 */
		async getLastUpdated(param: P): Promise<number | null> {
			const cacheKey = getCacheKey(param);
			try {
				const cached = await redis.get<CacheItem<T>>(cacheKey);
				return cached?.lastUpdated ?? null;
			} catch (error) {
				console.warn(
					`[Cache] Error getting last updated time for ${cacheKey}:`,
					error,
				);
				return null;
			}
		},

		/**
		 * Manually removes an item from cache
		 */
		async invalidate(param: P): Promise<void> {
			const cacheKey = getCacheKey(param);
			try {
				await redis.del(cacheKey);
			} catch (error) {
				console.warn(
					`[Cache] Error invalidating cache for ${cacheKey}:`,
					error,
				);
			}
		},

		/**
		 * Removes all cached items in this namespace
		 */
		async invalidateAll(): Promise<void> {
			try {
				const keys = await redis.keys(`${namespace}:*`);
				if (keys.length > 0) {
					await redis.del(...keys);
				}
			} catch (error) {
				console.warn(
					`[Cache] Error invalidating all cache for ${namespace}:`,
					error,
				);
			}
		},
	};
}

/**
 * Usage Examples:
 *
 * 1. Basic user data caching:
 * ```ts
 * const userCache = createCachedFetcher('user', async (userId: string) => {
 *   const response = await fetch(`/api/users/${userId}`);
 *   if (!response.ok) throw new Error('Failed to fetch user');
 *   return response.json();
 * });
 *
 * // Use in your components/routes
 * const userData = await userCache.fetch('123');
 * ```
 *
 * 2. With custom TTL:
 * ```ts
 * const shortLivedCache = createCachedFetcher('analytics',
 *   async (metric: string) => {
 *     const response = await fetch(`/api/analytics/${metric}`);
 *     return response.json();
 *   },
 *   { ttl: 300 } // 5 minutes
 * );
 * ```
 *
 * 3. With TypeScript types:
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * const userCache = createCachedFetcher<User, string>('user',
 *   async (userId) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   }
 * );
 *
 * const user = await userCache.fetch('123'); // user is typed as User
 * ```
 *
 * 4. With revalidation:
 * ```ts
 * // In your API route after updating user data
 * await userCache.revalidate(userId);
 *
 * // Or invalidate to remove from cache
 * await userCache.invalidate(userId);
 * ```
 */

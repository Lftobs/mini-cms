import { Redis } from "@upstash/redis";

const { UPSTASH_URL, UPSTASH_TOKEN } = import.meta.env;

let redis: Redis | null = null;

if (UPSTASH_URL && UPSTASH_TOKEN) {
	redis = new Redis({
		url: UPSTASH_URL,
		token: UPSTASH_TOKEN,
	});
} else {
	console.warn("[Cache] Redis credentials missing. Caching is disabled.");
}


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
	const { ttl = 86400 } = options;

	const getCacheKey = (param: P) => `${namespace}:${param}`;

	return {
		/**
		 * Fetches data, using cache if available
		 */
		async fetch(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);

			if (redis) {
				try {
					const cached = await redis.get<CacheItem<T>>(cacheKey);
					if (cached) {
						// console.log(`[Cache] Hit for ${cacheKey}`);
						return cached.data;
					}
				} catch (error) {
					console.warn(
						`[Cache] Error reading from cache for ${cacheKey}:`,
						error,
					);
				}
			}

			return this.revalidate(param);
		},

		/**
		 * Force fetches fresh data and updates cache
		 */
		async revalidate(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);

			try {
				const freshData = await fetchFn(param);

				// Update cache
				const cacheItem: CacheItem<T> = {
					data: freshData,
					lastUpdated: Date.now(),
				};

				if (redis) {
					try {
						await redis.set(cacheKey, cacheItem, { ex: ttl });
					} catch (cacheError) {
						console.warn(
							`[Cache] Error writing to Redis for ${cacheKey}:`,
							cacheError,
						);
					}
				}

				return freshData;
			} catch (error) {
				console.error(
					`[Cache] Error fetching/caching data for ${cacheKey}:`,
					error,
				);
				throw error;
			}
		},

		/**
		 * Gets the last update timestamp for a cached item
		 * @returns timestamp in milliseconds or null if not cached
		 */
		async getLastUpdated(param: P): Promise<number | null> {
			const cacheKey = getCacheKey(param);
			if (!redis) return null;
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
			if (!redis) return;
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
			if (!redis) return;
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

// In-memory cache for SWR (client-side only)
type SWRCacheEntry<T> = {
	data: T;
	timestamp: number;
	isStale: boolean;
};

const swrMemoryCache = new Map<string, SWRCacheEntry<unknown>>();

/**
 * Creates a Stale-While-Revalidate fetcher for client-side caching.
 * Returns cached data immediately if available, then refreshes in background.
 *
 * @example
 * ```ts
 * const projectsSWR = createSWRFetcher({
 *   key: 'user-projects',
 *   fetcher: async (userId) => {
 *     const response = await fetch(`/api/projects?userId=${userId}`);
 *     return response.json();
 *   },
 *   maxAge: 30000,      // Consider fresh for 30 seconds
 *   staleTime: 300000,  // Serve stale for 5 minutes
 * });
 *
 * // Use in component
 * const projects = await projectsSWR.fetch(userId);
 * ```
 */
export interface SWROptions<T, P = string> {
	key: string;
	fetcher: (param: P) => Promise<T>;
	maxAge?: number; // Time in ms to consider data fresh (default: 30s)
	staleTime?: number; // Time in ms to serve stale data while revalidating (default: 5min)
}

export function createSWRFetcher<T, P extends string = string>(
	options: SWROptions<T, P>,
) {
	const { key, fetcher, maxAge = 30000, staleTime = 300000 } = options;

	const getCacheKey = (param: P) => `${key}:${param}`;

	return {
		/**
		 * Fetches data using SWR pattern:
		 * - Returns cached data immediately if not expired
		 * - Returns stale data and revalidates in background if within staleTime
		 * - Fetches fresh data if cache is expired
		 */
		async fetch(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);
			const cached = swrMemoryCache.get(cacheKey) as
				| SWRCacheEntry<T>
				| undefined;
			const now = Date.now();

			if (cached) {
				const age = now - cached.timestamp;

				// Data is fresh - return immediately
				if (age < maxAge) {
					return cached.data;
				}

				// Data is stale but within staleTime - return stale data and revalidate
				if (age < maxAge + staleTime) {
					// Trigger background revalidation
					this.revalidate(param).catch((err) => {
						console.warn(`[SWR] Background revalidation failed for ${cacheKey}:`, err);
					});
					return cached.data;
				}

				// Data is expired - remove from cache and fetch fresh
				swrMemoryCache.delete(cacheKey);
			}

			// No cache or expired - fetch fresh data
			return this.revalidate(param);
		},

		/**
		 * Force revalidation - fetches fresh data and updates cache
		 */
		async revalidate(param: P): Promise<T> {
			const cacheKey = getCacheKey(param);

			try {
				const freshData = await fetcher(param);

				// Update cache
				swrMemoryCache.set(cacheKey, {
					data: freshData,
					timestamp: Date.now(),
					isStale: false,
				});

				return freshData;
			} catch (error) {
				// On error, try to return stale data if available
				const cached = swrMemoryCache.get(cacheKey) as SWRCacheEntry<T> | undefined;
				if (cached) {
					console.warn(`[SWR] Fetch failed, returning stale data for ${cacheKey}`);
					return cached.data;
				}
				throw error;
			}
		},

		/**
		 * Gets cached data without triggering revalidation
		 */
		peek(param: P): T | undefined {
			const cacheKey = getCacheKey(param);
			const cached = swrMemoryCache.get(cacheKey) as SWRCacheEntry<T> | undefined;
			return cached?.data;
		},

		/**
		 * Invalidates cache for a specific param
		 */
		invalidate(param: P): void {
			const cacheKey = getCacheKey(param);
			swrMemoryCache.delete(cacheKey);
		},

		/**
		 * Invalidates all cache entries for this key
		 */
		invalidateAll(): void {
			const prefix = `${key}:`;
			for (const cacheKey of swrMemoryCache.keys()) {
				if (cacheKey.startsWith(prefix)) {
					swrMemoryCache.delete(cacheKey);
				}
			}
		},

		/**
		 * Gets the age of cached data in milliseconds
		 */
		getAge(param: P): number | null {
			const cacheKey = getCacheKey(param);
			const cached = swrMemoryCache.get(cacheKey) as SWRCacheEntry<T> | undefined;
			if (!cached) return null;
			return Date.now() - cached.timestamp;
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

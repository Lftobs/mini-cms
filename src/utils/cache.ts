import { Redis } from "@upstash/redis";

const { UPSTASH_URL, UPSTASH_TOKEN } = import.meta.env;

// Initialize Redis client
// These environment variables should be set in your project
const redis = new Redis({
	url: UPSTASH_URL!,
	token: UPSTASH_TOKEN!,
});

// interface CacheItem<T> {
// 	responseData: T;
// 	ok: boolean;
// 	timestamp: number;
// }

// /**
//  * Generic helper function to fetch data, using Redis as a cache.
//  *
//  * @example Basic Usage
//  * ```ts
//  * // Fetch user data with caching
//  * const response = await makeFetch(
//  *   'user',                    // Resource name
//  *   userId,                    // Identifier
//  *   () => fetch('/api/user'), // API call function
//  *   false                     // Don't force refresh
//  * );
//  *
//  * if (response.ok) {
//  *   const userData = await response.json();
//  *   // Use userData...
//  * }
//  * ```
//  *
//  * @example With Force Refresh
//  * ```ts
//  * // Force fresh data fetch, ignoring cache
//  * const freshData = await makeFetch(
//  *   'posts',
//  *   'latest',
//  *   () => fetch('/api/posts/latest'),
//  *   true // Force refresh
//  * );
//  * ``````
//  *
//  * @example Error Handling
//  * ```ts
//  * try {
//  *   const response = await makeFetch(
//  *     'settings',
//  *     'app',
//  *     async () => {
//  *       const res = await fetch('/api/settings');
//  *       if (!res.ok) throw new Error('Failed to fetch settings');
//  *       return res;
//  *     }
//  *   );
//  *   const settings = await response.json();
//  * } catch (error) {
//  *   console.error('Failed to fetch settings:', error);
//  * }
//  * ```
//  *
//  * @example With Custom API Response
//  * ```ts
//  * const response = await makeFetch(
//  *   'analytics',
//  *   'daily',
//  *   async () => {
//  *     const res = await fetch('/api/analytics');
//  *     return {
//  *       ok: res.status === 200,
//  *       json: async () => res.json(),
//  *       status: res.status,
//  *       headers: res.headers
//  *     };
//  *   }
//  * );
//  * ```
//  *
//  * @param resourceName A unique name for the resource type (e.g., 'userOrgs', 'appSettings').
//  * @param identifier An optional identifier for the specific resource instance (e.g., userId, settingKey).
//  * @param apiCallFn A function that performs the actual API call and returns a promise.
//  *                  The promise should resolve to an object with `ok: boolean` and `json: () => Promise<T>`.
//  * @param forceRefresh If true, bypasses the cache and fetches fresh data.
//  * @returns A promise that resolves to an object with the same shape as the API response.
//  */
// export async function makeFetch<T>(
// 	resourceName: string,
// 	identifier: string | undefined,
// 	apiCallFn: () => Promise<{
// 		ok: boolean;
// 		json: () => Promise<T>;
// 		[key: string]: any;
// 	}>,
// 	forceRefresh: boolean = false,
// ): Promise<{
// 	ok: boolean;
// 	json: () => Promise<T>;
// 	[key: string]: any;
// }> {
// 	const cacheKey = identifier
// 		? `${resourceName}:${identifier}`
// 		: resourceName;

// 	if (!forceRefresh) {
// 		try {
// 			const cachedItem =
// 				await redis.get<CacheItem<T>>(
// 					cacheKey,
// 				);
// 			if (cachedItem) {
// 				console.log(
// 					`[Cache] Returning cached '${cacheKey}'`,
// 				);
// 				return {
// 					ok: cachedItem.ok,
// 					json: async () =>
// 						cachedItem.responseData,
// 				};
// 			}
// 		} catch (error) {
// 			console.error(
// 				`[Cache] Error reading from Redis for '${cacheKey}':`,
// 				error,
// 			);
// 			// Continue with API call if cache read fails
// 		}
// 	}

// 	const response = await apiCallFn();

// 	if (
// 		typeof response.json !== "function" ||
// 		typeof response.ok === "undefined"
// 	) {
// 		console.error(
// 			`[Cache] API response for '${cacheKey}' is malformed. Bypassing cache.`,
// 		);
// 		return response;
// 	}

// 	if (response.ok) {
// 		let responseData: T;
// 		try {
// 			responseData = await response.json();

// 			// Cache the successful response
// 			const cacheItem: CacheItem<T> = {
// 				responseData,
// 				ok: response.ok,
// 				timestamp: Date.now(),
// 			};

// 			try {
// 				// Cache for 1 hour by default
// 				await redis.set(
// 					cacheKey,
// 					cacheItem,
// 					{ ex: 3600 },
// 				);
// 			} catch (error) {
// 				console.error(
// 					`[Cache] Error writing to Redis for '${cacheKey}':`,
// 					error,
// 				);
// 				// Continue even if cache write fails
// 			}

// 			return {
// 				ok: response.ok,
// 				json: async () => responseData,
// 			};
// 		} catch (e) {
// 			console.error(
// 				`[Cache] Error parsing JSON for '${cacheKey}':`,
// 				e,
// 			);
// 			return {
// 				ok: false,
// 				json: async () =>
// 					({
// 						error: "Failed to parse JSON response",
// 					}) as any,
// 			};
// 		}
// 	} else {
// 		return response;
// 	}
// }

// /**
//  * Clears the cache for a specific resource.
//  *
//  * @example
//  * ```ts
//  * // Clear cache for a specific user
//  * await clearCache('user', '123');
//  *
//  * // Clear cache for entire resource type
//  * await clearCache('users');
//  * ```
//  *
//  * @param resourceName The name of the resource (e.g., 'userOrgs')
//  * @param identifier Optional identifier for the specific resource instance
//  */
// export async function clearCache(
// 	resourceName: string,
// 	identifier?: string,
// ): Promise<void> {
// 	const cacheKey = identifier
// 		? `${resourceName}:${identifier}`
// 		: resourceName;
// 	try {
// 		await redis.del(cacheKey);
// 		console.log(
// 			`[Cache] Cleared cache for '${cacheKey}'`,
// 		);
// 	} catch (error) {
// 		console.error(
// 			`[Cache] Error clearing cache for '${cacheKey}':`,
// 			error,
// 		);
// 	}
// }

// /**
//  * Gets all cache keys matching a pattern.
//  *
//  * @example
//  * ```ts
//  * // Get all user-related cache keys
//  * const userKeys = await getCacheKeys('user:*');
//  *
//  * // Get all cache keys for a specific feature
//  * const featureKeys = await getCacheKeys('feature:premium:*');
//  * ```
//  *
//  * @param pattern The pattern to match (e.g., 'userOrgs:*')
//  * @returns Array of matching cache keys
//  */
// export async function getCacheKeys(
// 	pattern: string,
// ): Promise<string[]> {
// 	try {
// 		const keys = await redis.keys(pattern);
// 		return keys;
// 	} catch (error) {
// 		console.error(
// 			`[Cache] Error getting cache keys for pattern '${pattern}':`,
// 			error,
// 		);
// 		return [];
// 	}
// }

// /**
//  * Clears all cache entries matching a pattern.
//  *
//  * @example
//  * ```ts
//  * // Clear all user caches
//  * await clearCachePattern('user:*');
//  *
//  * // Clear all temporary caches
//  * await clearCachePattern('temp:*');
//  *
//  * // Clear all caches for a specific feature
//  * await clearCachePattern('feature:premium:*');
//  * ```
//  *
//  * @param pattern The pattern to match (e.g., 'userOrgs:*')
//  */
// export async function clearCachePattern(
// 	pattern: string,
// ): Promise<void> {
// 	try {
// 		const keys = await getCacheKeys(pattern);
// 		if (keys.length > 0) {
// 			await redis.del(...keys);
// 			console.log(
// 				`[Cache] Cleared ${keys.length} cache entries matching pattern '${pattern}'`,
// 			);
// 		}
// 	} catch (error) {
// 		console.error(
// 			`[Cache] Error clearing cache pattern '${pattern}':`,
// 			error,
// 		);
// 	}
// }

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

				await redis.set(cacheKey, cacheItem, { ex: ttl });
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

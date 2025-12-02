import { v7 as uuidv7 } from "uuid";

/**
 * Generate a UUID v7 for database records
 * UUID v7 is time-ordered and includes a timestamp for better sorting
 */
export function generateId(): string {
	return uuidv7();
}

/**
 * Helper function to create a record with auto-generated UUID7 ID
 * Usage: const userRecord = withId({ name: "John", email: "john@example.com" })
 */
export function withId<T extends Record<string, any>>(
	data: T,
): T & { id: string } {
	return {
		id: generateId(),
		...data,
	};
}

/**
 * Utility to ensure an ID exists on a record, generating one if missing
 * Useful for upsert operations where ID might or might not exist
 */
export function ensureId<T extends Record<string, any>>(
	data: T & { id?: string },
): T & { id: string } {
	return {
		...data,
		id: data.id || generateId(),
	};
}

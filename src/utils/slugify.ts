/**
 * Sanitizes a string into a slug.
 * Normalizes Unicode, converts to lowercase, replaces spaces with hyphens,
 * removes characters except a-z0-9-_ and limits length.
 */
export function slugify(text: string): string {
    return text
        .normalize('NFD')                   // Normalize Unicode
        .replace(/[\u0300-\u036f]/g, '')     // Remove accents
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')                // Replace spaces with -
        .replace(/[^a-z0-9-_]/g, '')         // Remove characters except a-z0-9-_
        .slice(0, 50);                       // Limit length
}

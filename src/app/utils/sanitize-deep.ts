/**
 * Recursively sanitizes all string values by removing HTML tags.
 * This helps prevent XSS attacks and unwanted HTML injection.
 */
export function sanitizeDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    /**
     * Remove all HTML tags
     * /<[^>]*>/: This regex pattern matches any substring that starts with < and ends with >.
     * <: Matches the literal opening angle bracket.
     * [^>]*: Matches zero or more characters that are not a closing angle bracket.
     * >?: Matches an optional closing angle bracket.
     */
    return obj.replace(/<[^>]*>?/gm, '').trim() as unknown as T;
  }

  if (Array.isArray(obj)) {
    // Sanitize each array item
    return obj.map((item) => sanitizeDeep(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    // Sanitize each property of the object
    const sanitized: Record<string, unknown> = {};
    for (const key in obj) {
      sanitized[key] = sanitizeDeep((obj as Record<string, unknown>)[key]);
    }
    return sanitized as T;
  }
  //  console.log('sanitizeDeep');

  return obj;
}


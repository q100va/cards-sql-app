/**
 * Sanitizes input text to prevent Cross-Site Scripting (XSS) attacks.
 * @param text - The text to sanitize.
 * @returns The sanitized text.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

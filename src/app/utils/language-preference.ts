export type Lang = 'en' | 'ru';
export const LANGUAGE_STORAGE_KEY = 'app.lang';
export const DEFAULT_LANGUAGE: Lang = 'ru';

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ru';
}

export function readPersistedLanguage(): Lang | null {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLang(saved) ? saved : null;
}

export function requestLanguage(): string {
  // Keep the existing document-language fallback; only persisted preferences use the app's Lang contract.
  return readPersistedLanguage() ?? (document.documentElement.lang || 'en');
}

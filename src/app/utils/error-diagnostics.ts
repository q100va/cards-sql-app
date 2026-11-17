// Track error identity without mutating errors or retaining their payloads.
const reportedErrors = new WeakSet<object>();

export function hasErrorDiagnostic(error: unknown): boolean {
  return error !== null && typeof error === 'object' && reportedErrors.has(error);
}

export function markErrorDiagnostic(error: unknown): void {
  if (error !== null && typeof error === 'object') reportedErrors.add(error);
}

export function errorRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

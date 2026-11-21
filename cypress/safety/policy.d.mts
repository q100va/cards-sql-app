export type Mode = 'stub' | 'live';
export const FRONTEND_URL: string;
export const API_URL: string;
export const SPECS: Readonly<Record<Mode, readonly string[]>>;
export function resolveMode(mode: unknown, useStubs: unknown): Mode;
export function assertSpec(mode: Mode, filename: string): void;
export function assertOrigins(baseUrl: unknown, apiUrl: unknown): void;
export function assertFrontend(identity: unknown): void;
export function assertVisit(url: string): string;
export function assertApiRequest(mode: Mode, url: string): string;
export function blockedHosts(mode: Mode): string;
export interface DatabaseTarget {
  target: string;
  host: string;
  port: number;
  database: string;
  username: string;
}
export function validateDatabase(env: Record<string, string | undefined>, authorizeReset?: boolean): Readonly<DatabaseTarget>;
export function assertDatabaseClient(client: unknown, approved: DatabaseTarget, password: string): void;

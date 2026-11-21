import type { DatabaseTarget } from './policy.mjs';
export interface EnvironmentContext {
  env: Readonly<Record<string, string | undefined>>;
  database: Readonly<DatabaseTarget>;
  filename: string;
}
export function loadEnvironment(env?: Record<string, string | undefined>, authorizeReset?: boolean): EnvironmentContext;
export function installEnvironment(context: EnvironmentContext, env?: Record<string, string | undefined>): void;
export function identity(context: EnvironmentContext): Record<string, string | number>;
export function verifyBackend(context: EnvironmentContext, request?: typeof fetch): Promise<void>;
export function configureCypress(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions,
  env?: Record<string, string | undefined>, request?: typeof fetch): Promise<Cypress.PluginConfigOptions>;

export type ClientLogLevel = 'error' | 'warn';

export interface ClientLogItem {
  ts: string;                 // ISO
  level: ClientLogLevel;
  message: string;
  stack?: string;
  pageUrl?: string;
  route?: string;
  userId?: string | number | null;
  sessionId: string;          // uuid
  corrId?: string | null;     // X-Request-Id
  userAgent?: string;
  context?: Record<string, unknown>;
}

export interface ClientLogBatch {
  app: string;
  env: string;                // 'development'|'production'
  items: ClientLogItem[];
}

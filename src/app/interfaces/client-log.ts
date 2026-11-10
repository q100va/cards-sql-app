export type ClientLogLevel = 'error' | 'warn';

export interface ClientLogItem {
  ts: string;
  level: ClientLogLevel;
  message: string;
  stack?: string;
  pageUrl?: string;
  route?: string;
  userId?: string | number | null;
  sessionId: string;
  corrId?: string | null;
  userAgent?: string;
  context?: Record<string, unknown>;
}

export interface ClientLogBatch {
  app: 'cards-sql-app';
  env: 'development' | 'production';
  items: ClientLogItem[];
}

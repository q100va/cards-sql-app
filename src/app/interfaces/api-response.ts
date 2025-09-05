// API envelope
export interface ApiResponse<T> {
  data: T;
  code?: string;
  msg?: string;
}

export type RawApiResponse = { data: unknown; code?: string; msg?: string };

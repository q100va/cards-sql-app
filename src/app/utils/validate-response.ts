// Zod for schema validation
import { z, ZodType } from 'zod';
import { Observable, map } from 'rxjs';
import { ApiResponse, RawApiResponse } from '../interfaces/api-response';

export class ValidationError extends Error {
  code: string;
  status?: number;

  constructor(code: string, status?: number) {
    super(code); // message = code
    this.code = code;
    this.status = status;
  }
}

/**
 * RxJS operator that validates `response.data` using a Zod schema.
 */
export function validateResponse<TSchema extends ZodType<any, any>>(
  schema: TSchema
): (source$: Observable<RawApiResponse>) => Observable<ApiResponse<z.infer<TSchema>>> {
  return (source$) =>
    source$.pipe(
      map((response) => {
        const parseResult = schema.safeParse(response.data);
        if (!parseResult.success) {
          console.error('Schema validation failed:', parseResult);
          console.error('response.data:', response.data);
          throw new ValidationError('ERRORS.INVALID_SCHEMA');
        }
        return {
          data: parseResult.data,
          code: response.code,
        };
      })
    );
}

/**
 * RxJS operator that validates `response.data` using a simple type guard.
 */
export function validateNoSchemaResponse<T>(validatorName: keyof typeof validators) {
  return (source: Observable<RawApiResponse>): Observable<ApiResponse<T>> =>
    source.pipe(map((response) => validateResponseOperator<T>(response, validatorName)));
}

/**
 * Synchronously validates `response.data` using a type guard.
 */
function validateResponseOperator<T>(
  response: RawApiResponse,
  validatorName: keyof typeof validators
): ApiResponse<T> {
  const validator = validators[validatorName];
  if (!validator) {
    throw new ValidationError('ERRORS.NO_VALIDATOR');
  }
  if (!validator(response.data)) {
    throw new ValidationError('ERRORS.INVALID_TYPE');
  }
  return {
    data: response.data as T,
    code: response.code,
  };
}

// --- Type guards ---
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';
const isNull = (v: unknown): v is null => v === null;
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((i) => isString(i));
const isBooleanArray = (v: unknown): v is boolean[] =>
  Array.isArray(v) && v.every((i) => isBoolean(i));
const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((i) => isNumber(i));

const validators = {
  isBoolean,
  isString,
  isNumber,
  isNull,
  isStringArray,
  isBooleanArray,
  isNumberArray,
};

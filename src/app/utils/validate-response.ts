// Zod for schema validation
import { z, ZodType } from 'zod';
// RxJS utilities
import { Observable, map } from 'rxjs';

// Generic API response type
interface ApiResponse<T> {
  data: T;
  msg: string;
}

/**
 * RxJS operator that validates `response.data` using a Zod schema.
 *
 * @param schema - Zod schema for validation
 * @returns Observable with validated response
 */
export function validateResponse<TSchema extends ZodType<any, any>>(
  schema: TSchema
): (
  source$: Observable<{ data: unknown; msg: string }>
) => Observable<ApiResponse<z.infer<TSchema>>> {
  return (source$) =>
    source$.pipe(
      map((response) => {
        const parseResult = schema.safeParse(response.data);
        if (!parseResult.success) {
          console.error(
            'Schema validation failed:',
            z.treeifyError(parseResult.error)
          );
          throw new Error('Неверный формат данных ответа.');
        }
        return {
          data: parseResult.data,
          msg: response.msg,
        };
      })
    );
}

/**
 * RxJS operator that validates `response.data` using a simple type guard.
 *
 * @param validatorName - Name of the validator from `validators`
 * @returns Observable with validated response
 */
export function validateNoSchemaResponse<T>(
  validatorName: keyof typeof validators
) {
  return (
    source: Observable<{ data: unknown; msg: string }>
  ): Observable<{ data: T; msg: string }> =>
    source.pipe(map((response) => validateResponseOperator<T>(response, validatorName)));
}

/**
 * Synchronously validates `response.data` using a type guard.
 *
 * @param response - API response
 * @param validatorName - Validator function name
 * @returns Response with validated data
 */
function validateResponseOperator<T>(
  response: { data: unknown; msg: string },
  validatorName: keyof typeof validators
): { data: T; msg: string } {
  const validator = validators[validatorName];
  if (!validator) {
    throw new Error(`Невозможно осуществить валидацию.`);
  }
  if (!validator(response.data)) {
    throw new Error('Неверный тип данных ответа.');
  }
  return response as { data: T; msg: string };
}

// --- Type guards ---

/** Check if value is boolean */
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
/** Check if value is string */
const isString = (v: unknown): v is string => typeof v === 'string';
/** Check if value is number */
const isNumber = (v: unknown): v is number => typeof v === 'number';
/** Check if value is null */
const isNull = (v: unknown): v is null => v === null;
/** Check if value is an array of strings */
const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((item) => isString(item));
/** Check if value is an array of booleans */
const isBooleanArray = (v: unknown): v is boolean[] =>
  Array.isArray(v) && v.every((item) => isBoolean(item));
/** Check if value is an array of numbers */
const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((item) => isNumber(item));

// Map validator names to functions
const validators = {
  isBoolean,
  isString,
  isNumber,
  isNull,
  isStringArray,
  isBooleanArray,
  isNumberArray,
};

import { z, ZodType } from 'zod';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response';

export class ValidationError extends Error {
  code: string;
  status?: number;

  constructor(code: string, status?: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function validateEnvelope(response: unknown, code: string): { data: unknown; code?: string } {
  // Check the envelope before reading data; diagnostics must never include its payload.
  if (typeof response !== 'object' || response === null || Array.isArray(response) ||
      !('data' in response) || response.data === undefined ||
      ('code' in response && response.code !== undefined && typeof response.code !== 'string')) {
    console.error('Response validation failed.', { code, stage: 'envelope' });
    throw new ValidationError(code);
  }
  return response;
}

/**
 * RxJS operator that validates `response.data` using a Zod schema.
 */
export function validateResponse<TSchema extends ZodType>(
  schema: TSchema,
): (
  source$: Observable<unknown>,
) => Observable<ApiResponse<z.infer<TSchema>>> {
  return (source$) =>
    source$.pipe(
      map((response) => {
        const envelope = validateEnvelope(response, 'ERRORS.INVALID_SCHEMA');
        const parseResult = schema.safeParse(envelope.data);
        if (!parseResult.success) {
          // Console diagnostics may be captured; payloads and issue messages must stay out.
          console.error('Response validation failed.', {
            code: 'ERRORS.INVALID_SCHEMA', stage: 'schema', issueCount: parseResult.error.issues.length,
          });
          throw new ValidationError('ERRORS.INVALID_SCHEMA');
        }

        return {
          data: parseResult.data,
          code: envelope.code,
        };
      }),
    );
}

type ValidatorResults = {
  isBoolean: boolean;
  isString: string;
  isNumber: number;
  isNull: null;
  isStringArray: string[];
  isBooleanArray: boolean[];
  isNumberArray: number[];
};

type ValidatorName = keyof ValidatorResults;
type ValidatorNamesFor<T> = {
  [K in ValidatorName]: ValidatorResults[K] extends T ? K : never;
}[ValidatorName];

/**
 * Validate data using the named guard. Legacy type arguments only constrain the
 * name; the name determines the result type.
 */
export function validateNoSchemaResponse<
  T = unknown,
  K extends ValidatorNamesFor<T> = ValidatorNamesFor<T>,
>(
  validatorName: K,
) {
  return (source: Observable<unknown>): Observable<ApiResponse<ValidatorResults[K]>> =>
    source.pipe(
      map((response) => validateResponseOperator(response, validatorName)),
    );
}

/**
 * Synchronously validates `response.data` using a type guard.
 */
function validateResponseOperator<K extends ValidatorName>(
  response: unknown,
  validatorName: K,
): ApiResponse<ValidatorResults[K]> {
  const validator = validators[validatorName];
  if (!validator) {
    console.error('Response validation failed.', { code: 'ERRORS.NO_VALIDATOR', stage: 'type' });
    throw new ValidationError('ERRORS.NO_VALIDATOR');
  }
  const envelope = validateEnvelope(response, 'ERRORS.INVALID_TYPE');
  const data = envelope.data;
  if (!validator(data)) {
    console.error('Response validation failed.', {
      code: 'ERRORS.INVALID_TYPE', stage: 'type', validator: validatorName,
    });
    throw new ValidationError('ERRORS.INVALID_TYPE');
  }
  return {
    data,
    code: envelope.code,
  };
}

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

const validators: { [K in ValidatorName]: (value: unknown) => value is ValidatorResults[K] } = {
  isBoolean,
  isString,
  isNumber,
  isNull,
  isStringArray,
  isBooleanArray,
  isNumberArray,
};

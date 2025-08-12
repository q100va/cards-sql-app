// Import necessary functions and types from 'zod' for schema validation
import { z, ZodType } from 'zod';
// Import Observable and map operator from 'rxjs' for reactive programming
import { Observable, map } from 'rxjs';
// Define a generic API response interface
interface ApiResponse<T> {
  data: T;
  msg: string;
}

/**
 * Returns an RxJS operator that validates the data property of the response
 * using the provided Zod schema.
 *
 * @param schema - A Zod schema against which the response data is validated
 * @returns A function that takes an Observable of responses and returns an Observable of validated responses
 */
export function validateResponse<TSchema extends ZodType<any, any>>(
  schema: TSchema
): (
  source$: Observable<{ data: unknown; msg: string }>
) => Observable<ApiResponse<z.infer<TSchema>>> {
  return (source$) =>
    source$.pipe(
      map((response) => {
        // Validate the response.data using the provided schema
        const parseResult = schema.safeParse(response.data);
        if (!parseResult.success) {
          // Log the detailed error if schema validation fails
          console.error('Schema validation failed:', z.treeifyError(parseResult.error));
          throw new Error('Неверный формат данных ответа.');
        }
        // Return a new response object with validated data
        return {
          data: parseResult.data,
          msg: response.msg,
        };
      })
    );
}

/**
 * Returns an RxJS operator that validates the data property of the response
 * using a predefined validator function identified by validatorName.
 *
 * @param validatorName - The key corresponding to the validator function within validators
 * @returns A function that takes an Observable of responses and returns an Observable of validated responses
 */
export function validateNoSchemaResponse<T>(
  validatorName: keyof typeof validators
) {
  return (
    source: Observable<{ data: unknown; msg: string }>
  ): Observable<{ data: T; msg: string }> =>
    source.pipe(
      // Use the custom synchronous validator operator on the response
      map((response) => validateResponseOperator<T>(response, validatorName))
    );
}

/**
 * Synchronously validates the response.data using a custom validator function.
 *
 * @param response - The API response containing data and msg
 * @param validatorName - The key for the validator function within validators
 * @returns The original response typed with the validated data type
 * @throws Error if the validator is not found or the data is invalid
 */
function validateResponseOperator<T>(
  response: { data: unknown; msg: string },
  validatorName: keyof typeof validators
): { data: T; msg: string } {
  // Retrieve the validator function from the validators object
  const validator = validators[validatorName];
  if (!validator) {
    throw new Error(`Невозможно осуществить валидацию.`);
  }
  // Perform the actual validation check on the data
  if (!validator(response.data)) {
    throw new Error('Неверный тип данных ответа.');
  }
  // Type cast the response, assuming the validation confirms its correctness
  return response as { data: T; msg: string };
}

// Utility type guard functions
/**
 * Checks if a value is of type boolean.
 *
 * @param v - The value to check
 * @returns True if the value is boolean
 */
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
/**
 * Checks if a value is of type string.
 *
 * @param v - The value to check
 * @returns True if the value is string
 */
const isString = (v: unknown): v is string => typeof v === 'string';
/**
 * Checks if a value is of type number.
 *
 * @param v - The value to check
 * @returns True if the value is number
 */
const isNumber = (v: unknown): v is number => typeof v === 'number';
/**
 * Checks if a value is explicitly null.
 *
 * @param v - The value to check
 * @returns True if the value is null
 */
const isNull = (v: unknown): v is null => v === null;
/**
 * Checks if the value is an array of strings.
 *
 * @param value - The value to check
 * @returns True if the value is an array where every element is a string
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isString(item));
}
/**
 * Checks if the value is an array of booleans.
 *
 * @param value - The value to check
 * @returns True if the value is an array where every element is a boolean
 */
function isBooleanArray(value: unknown): value is boolean[] {
  return Array.isArray(value) && value.every((item) => isBoolean(item));
}
/**
 * Checks if the value is an array of numbers.
 *
 * @param value - The value to check
 * @returns True if the value is an array where every element is a number
 */
function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isNumber(item));
}

// An object that maps validator names to their corresponding functions
const validators = {
  isBoolean,
  isString,
  isNumber,
  isNull,
  isStringArray,
  isBooleanArray,
  isNumberArray,
};

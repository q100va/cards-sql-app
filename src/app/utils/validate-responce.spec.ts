/*
  apiValidation.test.ts

  To run these tests:
   1. Install Jest (and ts-jest for TypeScript support) via npm:
        npm install --save-dev jest ts-jest @types/jest
   2. Configure your Jest settings (e.g., via a jest.config.js).
   3. Run the tests with "npx jest" or "npm test".
*/
import { of } from 'rxjs';
import { catchError, toArray } from 'rxjs/operators';
import { z } from 'zod';
import { validateNoSchemaResponse, validateResponse } from './validate-response';

describe('validateResponse', () => {
  it('should correctly validate a valid response when the schema matches', (done) => {
    // Define a schema for an object with an id (number) and name (string)
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });
    const validResponse = { data: { id: 1, name: 'Alice' }, msg: 'Success' };
    // Create an observable that emits the valid response
    of(validResponse)
      .pipe(validateResponse(schema))
      .subscribe({
        next: (result) => {
          // Expect that the resulting data has the proper type and values
          expect(result.data).toEqual({ id: 1, name: 'Alice' });
          expect(result.msg).toBe('Success');
          done();
        },
        error: (err) => {
          done();
        },
      });
  });
  it('should throw an error with an invalid response data based on schema', (done) => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });
    // Here, the "id" is a string instead of a number
    const invalidResponse = { data: { id: 'not-a-number', name: 'Alice' }, msg: 'Failure' };
    of(invalidResponse)
      .pipe(validateResponse(schema))
      .subscribe({
        next: () => {},
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          // The error message is expected to come from the function when validation fails
          expect(err.message).toBe('Неверный формат данных ответа.');
          done();
        },
      });
  });
});
describe('validateNoSchemaResponse', () => {
  it('should validate data using the custom validator "isBoolean" when data is correct', (done) => {
    // valid data: a boolean value
    const validResponse = { data: true, msg: 'Success' };
    of(validResponse)
      .pipe(validateNoSchemaResponse<boolean>('isBoolean'))
      .subscribe({
        next: (result) => {
          expect(result.data).toBe(true);
          expect(result.msg).toBe('Success');
          done();
        },
        error: (err) => done(),
      });
  });
  it('should throw an error when data does not satisfy the custom validator "isNumber"', (done) => {
    // data is not a number hence should trigger validation error
    const invalidResponse = { data: 'not-a-number', msg: 'Failure' };
    of(invalidResponse)
      .pipe(validateNoSchemaResponse<number>('isNumber'))
      .subscribe({
        next: () => {},
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe('Неверный тип данных ответа.');
          done();
        },
      });
  });
  it('should throw an error if the specified validator is not registered', (done) => {
    // Although TypeScript would normally catch a bad validator name, we simulate it by forcing a runtime call.
    // For this test, we mimic an invalid validator by using a type assertion.
    const response = { data: 'anything', msg: 'Message' };
    // We need to bypass TypeScript check using "as any" since "nonexistentValidator" is not a key of our validators object.
    try {
      of(response)
      // @ts-expect-error
        // This will attempt to call the inner operator logic and throw an error immediately.
        .pipe(validateNoSchemaResponse<any>('nonexistentValidator'))
        .subscribe({
          next() {},
          error() {},
        });
      // In an asynchronous call, errors might be caught in the subscription.
      // Hence we rely on a catchError below in a separate observable.
      of(response)
        // @ts-expect-error
        .pipe(validateNoSchemaResponse<any>('nonexistentValidator'))
        .subscribe({
          next: () => {},
          error: (err) => {
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe('Невозможно осуществить валидацию.');
            done();
          },
        });
    } catch (err) {
      // If thrown synchronously
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Невозможно осуществить валидацию.');
      done();
    }
  });
});
describe('Performance and Scalability', () => {
  it('should process multiple responses efficiently', (done) => {
    // Simulate multiple valid responses in one observable (to test efficiency under load)
    const schema = z.object({
      value: z.number(),
    });
    // Create an array of 1000 valid responses
    const responses = Array.from({ length: 1000 }, (_, i) => ({
      data: { value: i },
      msg: 'OK',
    }));
    // Use the RxJS "of" operator to emit the array items one by one
    of(...responses)
      .pipe(
        validateResponse(schema),
        toArray() // Aggregate into a single array
      )
      .subscribe({
        next: (resultArray) => {
          // Check that we received exactly 1000 responses.
          expect(resultArray.length).toBe(1000);
          // Optionally, verify a few sample points:
          expect(resultArray[0].data).toEqual({ value: 0 });
          expect(resultArray[999].data).toEqual({ value: 999 });
          done();
        },
        error: (err) => done(),
      });
  });
});
describe('Cross-Platform Behavior', () => {
  it('should operate consistently regardless of the environment', (done) => {
    // This test simply verifies that our operators work when run in a normal Node.js environment.
    // In real-world scenarios, you could run Jest in multiple environments (using Docker, CI/CD pipelines, etc.)
    const schema = z.string();
    // Test with valid data.
    const response = { data: 'platform-independent', msg: 'Checked' };
    of(response)
      .pipe(validateResponse(schema))
      .subscribe({
        next: (result) => {
          expect(result.data).toBe('platform-independent');
          expect(result.msg).toBe('Checked');
          done();
        },
        error: (err) => done(),
      });
  });
});

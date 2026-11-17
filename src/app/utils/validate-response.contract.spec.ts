import { Observable, of } from 'rxjs';
import { z } from 'zod';
import { RawApiResponse } from '../interfaces/api-response';
import { ValidationError, validateNoSchemaResponse, validateResponse } from './validate-response';

describe('response validation runtime contracts', () => {
  const malformedEnvelopes: { name: string; value: unknown }[] = [
    { name: 'null', value: null },
    { name: 'undefined', value: undefined },
    { name: 'an object without data', value: {} },
    { name: 'explicitly undefined data', value: { data: undefined } },
  ];

  function expectValidationFailure(stream: Observable<unknown>, code: string): void {
    let received: unknown;
    let emissions = 0;
    let completed = false;
    stream.subscribe({
      next: () => emissions++,
      error: (error: unknown) => { received = error; },
      complete: () => { completed = true; },
    });
    expect(emissions).toBe(0);
    expect(completed).toBeFalse();
    expect(received).toBeInstanceOf(ValidationError);
    expect(received).not.toBeInstanceOf(TypeError);
    if (received instanceof ValidationError) expect(received.code).toBe(code);
  }

  for (const envelope of malformedEnvelopes) {
    it(`validateResponse deliberately rejects ${envelope.name}`, () => {
      // HTTP typing cannot guarantee the runtime envelope; deliberately cross that boundary here.
      const stream = of(envelope.value as RawApiResponse).pipe(validateResponse(z.object({ id: z.number() })));
      expectValidationFailure(stream, 'ERRORS.INVALID_SCHEMA');
    });

    it(`validateNoSchemaResponse deliberately rejects ${envelope.name}`, () => {
      const stream = of(envelope.value as RawApiResponse).pipe(validateNoSchemaResponse<boolean>('isBoolean'));
      expectValidationFailure(stream, 'ERRORS.INVALID_TYPE');
    });
  }

  it('rejects a non-string value for the production string validator', () => {
    expectValidationFailure(of({ data: 7 }).pipe(validateNoSchemaResponse<string>('isString')), 'ERRORS.INVALID_TYPE');
  });

  it('accepts zero for the production number validator and preserves the response code', () => {
    let received: unknown;
    of({ data: 0, code: 'RESULT.COUNT' }).pipe(validateNoSchemaResponse<number>('isNumber'))
      .subscribe(value => { received = value; });
    expect(received).toEqual({ data: 0, code: 'RESULT.COUNT' });
  });

  it('rejects numeric strings for the production number validator without coercion', () => {
    expectValidationFailure(of({ data: '7' }).pipe(validateNoSchemaResponse<number>('isNumber')), 'ERRORS.INVALID_TYPE');
  });

  it('accepts null data for the production null validator and preserves the response code', () => {
    let received: unknown;
    of({ data: null, code: 'SUCCESS.DELETED' }).pipe(validateNoSchemaResponse<null>('isNull'))
      .subscribe(value => { received = value; });
    expect(received).toEqual({ data: null, code: 'SUCCESS.DELETED' });
  });

  it('rejects false for the production null validator instead of treating it as null', () => {
    expectValidationFailure(of({ data: false }).pipe(validateNoSchemaResponse<null>('isNull')), 'ERRORS.INVALID_TYPE');
  });
});

import { of, lastValueFrom } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { z } from 'zod';
import {
  validateNoSchemaResponse,
  validateResponse,
} from './validate-response';

describe('validateResponse', () => {
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    // silence console noise on negative-path tests
    consoleErrorSpy = spyOn(console, 'error').and.stub();
  });

  afterEach(() => {
    consoleErrorSpy.calls.reset();
  });

  it('validates a matching schema and returns typed data', async () => {
    const schema = z.object({ id: z.number(), name: z.string() });
    const source$ = of({ data: { id: 1, name: 'Alice' }, msg: 'Success' });

    const result = await lastValueFrom(source$.pipe(validateResponse(schema)));
    expect(result.data).toEqual({ id: 1, name: 'Alice' });
    expect(result.msg).toBe('Success');
  });

  it('throws when data does not match schema and logs an error', async () => {
    const schema = z.object({ id: z.number(), name: z.string() });
    const source$ = of({
      data: { id: 'not-a-number', name: 'Alice' },
      msg: 'Failure',
    });

    await expectAsync(
      lastValueFrom(source$.pipe(validateResponse(schema)))
    ).toBeRejectedWithError('Неверный формат данных ответа.');

    expect(console.error).toHaveBeenCalled(); // ensures error path executed
  });

  it('works with primitive schemas too', async () => {
    const schema = z.string();
    const source$ = of({ data: 'hello', msg: 'ok' });

    const result = await lastValueFrom(source$.pipe(validateResponse(schema)));
    expect(result.data).toBe('hello');
    expect(result.msg).toBe('ok');
  });
});

describe('validateNoSchemaResponse', () => {
  it('validates using isBoolean and returns data/msg as-is', async () => {
    const source$ = of({ data: true, msg: 'Success' });

    const result = await lastValueFrom(
      source$.pipe(validateNoSchemaResponse<boolean>('isBoolean'))
    );
    expect(result.data).toBe(true);
    expect(result.msg).toBe('Success');
  });

  it('throws when validator (isNumber) fails', async () => {
    const source$ = of({ data: 'not-a-number', msg: 'Failure' });

    await expectAsync(
      lastValueFrom(source$.pipe(validateNoSchemaResponse<number>('isNumber')))
    ).toBeRejectedWithError('Неверный тип данных ответа.');
  });

  it('throws if a non-registered validator is used', async () => {
    const source$ = of({ data: 'anything', msg: 'Message' });

    // simulate a wrong validator name at runtime
    await expectAsync(
      lastValueFrom(
        source$
          // @ts-expect-error
          .pipe(validateNoSchemaResponse<any>('nonexistentValidator'))
      )
    ).toBeRejectedWithError('Невозможно осуществить валидацию.');
  });
});

describe('Performance and Scalability', () => {
  it('processes many responses efficiently', async () => {
    const schema = z.object({ value: z.number() });
    const responses = Array.from({ length: 1000 }, (_, i) => ({
      data: { value: i },
      msg: 'OK',
    }));

    const resultArray = await lastValueFrom(
      of(...responses).pipe(validateResponse(schema), toArray())
    );
    expect(resultArray.length).toBe(1000);
    expect(resultArray[0].data).toEqual({ value: 0 });
    expect(resultArray[999].data).toEqual({ value: 999 });
  });
});

describe('Message passthrough', () => {
  it('preserves msg field through validateResponse', async () => {
    const schema = z.object({ id: z.number() });
    const result = await lastValueFrom(
      of({ data: { id: 7 }, msg: 'Ping' }).pipe(validateResponse(schema))
    );
    expect(result.msg).toBe('Ping');
  });

  it('preserves msg field through validateNoSchemaResponse', async () => {
    const result = await lastValueFrom(
      of({ data: ['a', 'b'], msg: 'ArrayOK' }).pipe(
        validateNoSchemaResponse<string[]>('isStringArray')
      )
    );
    expect(result.msg).toBe('ArrayOK');
    expect(result.data).toEqual(['a', 'b']);
  });
});

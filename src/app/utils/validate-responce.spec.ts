import { EMPTY, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { z } from 'zod';

import {
  validateResponse,
  validateNoSchemaResponse,
  ValidationError,
} from './validate-response';
import { RawApiResponse } from '../interfaces/api-response';

describe('validate-response', () => {
  describe('validateResponse (with Zod schema)', () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });

    it('passes when schema is valid', (done) => {
      const resp: RawApiResponse = {
        data: { id: 1, name: 'ok' },
        code: 'ROLE.CREATED',
      };

      of(resp)
        .pipe(validateResponse(schema))
        .subscribe((res) => {
          expect(res.data).toEqual({ id: 1, name: 'ok' });
          expect(res.code).toBe('ROLE.CREATED');
          done();
        });
    });

    it('throws ValidationError with code ERRORS.INVALID_SCHEMA on schema mismatch', (done) => {
      const resp: RawApiResponse = {
        data: { id: 'bad', name: 123 },
      };

      of(resp)
        .pipe(validateResponse(schema))
        .pipe(
          catchError((err) => {
            expect(err).toBeInstanceOf(ValidationError);
            expect((err as ValidationError).code).toBe('ERRORS.INVALID_SCHEMA');
            expect((err as ValidationError).status).toBeUndefined();
            done();
            return EMPTY;
          })
        )
        .subscribe();
    });
  });

  describe('validateNoSchemaResponse (type guards)', () => {
    it('accepts valid boolean (isBoolean)', (done) => {
      const resp: RawApiResponse = { data: true };

      of(resp)
        .pipe(validateNoSchemaResponse<boolean>('isBoolean'))
        .subscribe((res) => {
          expect(res.data).toBeTrue();
          expect(res.code).toBeUndefined();
          done();
        });
    });

    it('accepts valid string array (isStringArray)', (done) => {
      const resp: RawApiResponse = { data: ['a', 'b'], code: 'LIST.OK' };

      of(resp)
        .pipe(validateNoSchemaResponse<string[]>('isStringArray'))
        .subscribe((res) => {
          expect(res.data).toEqual(['a', 'b']);
          expect(res.code).toBe('LIST.OK');
          done();
        });
    });

    it('throws ValidationError with ERRORS.INVALID_TYPE when type mismatch', (done) => {
      const resp: RawApiResponse = { data: 42 };

      of(resp)
        .pipe(validateNoSchemaResponse<boolean>('isBoolean'))
        .pipe(
          catchError((err) => {
            expect(err).toBeInstanceOf(ValidationError);
            expect((err as ValidationError).code).toBe('ERRORS.INVALID_TYPE');
            done();
            return EMPTY;
          })
        )
        .subscribe();
    });

    it('throws ValidationError with ERRORS.NO_VALIDATOR when validator is unknown', (done) => {
      const resp: RawApiResponse = { data: 'test' };

      of(resp)
        // @ts-expect-error intentionally wrong validator
        .pipe(validateNoSchemaResponse('noSuchValidator'))
        .pipe(
          catchError((err) => {
            expect(err).toBeInstanceOf(ValidationError);
            expect((err as ValidationError).code).toBe('ERRORS.NO_VALIDATOR');
            done();
            return EMPTY;
          })
        )
        .subscribe();
    });
  });
});

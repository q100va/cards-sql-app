import { jest } from '@jest/globals';
import { validateRequest } from '../middlewares/validate-request.js';
import { z } from 'zod';

describe('validateRequest middleware (unit)', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  const makeMocks = (part = 'body', initial = {}) => {
    const req = { body: {}, params: {}, query: {}, headers: {}, cookies: {} };
    req[part] = { ...initial };
    const res = { status: jest.fn(), send: jest.fn() };
    const next = jest.fn();
    return { req, res, next };
  };

  beforeEach(() => jest.clearAllMocks());

  it('passes with valid body and replaces req.body with parsed data', () => {
    const { req, res, next } = makeMocks('body', { name: 'Alice', age: '25' });
    const mw = validateRequest(schema, 'body');

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0].length).toBe(0); // без ошибки
    expect(req.body).toEqual({ name: 'Alice', age: 25 });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('calls next(error) with 422 on invalid body and does NOT mutate req.body', () => {
    const initial = { name: '', age: -1 };
    const { req, res, next } = makeMocks('body', initial);
    const mw = validateRequest(schema, 'body');

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(422);
    expect(err.code).toBe('ERRORS.VALIDATION');
    // req.body остался прежним
    expect(req.body).toEqual(initial);
    // мидлварь сама не шлёт ответ
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('validates params when part="params"', () => {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const { req, res, next } = makeMocks('params', { id: '42' });
    const mw = validateRequest(paramsSchema, 'params');

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params).toEqual({ id: 42 });
  });

  it('calls next(error) with 422 on invalid params', () => {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
    const initial = { id: '-3' };
    const { req, res, next } = makeMocks('params', initial);
    const mw = validateRequest(paramsSchema, 'params');

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.status).toBe(422);
    expect(err.code).toBe('ERRORS.VALIDATION');
    expect(req.params).toEqual(initial);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('propagates unexpected runtime errors as next(error) with code', () => {
  const badSchema = { safeParse: () => { throw new Error('boom'); } };
  const { req, res, next } = makeMocks('body', { x: 1 });
  const mw = validateRequest(badSchema, 'body');

  mw(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
  expect(err.code).toBe('ERRORS.VALIDATION');   // ✅ проставится
  expect(err.status).toBe(422);                 // можно тоже проверить
});
});

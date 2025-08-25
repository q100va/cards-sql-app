import { jest } from '@jest/globals';
import { validateRequest } from '../middlewares/validate-request.js';
import { z } from 'zod';

describe('validateRequest middleware', () => {
  const ok = (data = { name: 'Alice', age: 30 }) =>
    z.object({
      name: z.string().min(1),
      age: z.coerce.number().int().min(0),
    }).parse(data) && data; // helper just to keep defaults readable

  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  const makeMocks = (part = 'body', initial = {}) => {
    const req = { body: {}, params: {}, query: {}, headers: {}, cookies: {} };
    req[part] = { ...initial };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    const next = jest.fn();

    return { req, res, next };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes with valid body and replaces req.body with parsed data', () => {
    const { req, res, next } = makeMocks('body', { name: 'Alice', age: '25' });
    const mw = validateRequest(schema, 'body');

    mw(req, res, next);

    // coerced number was applied
    expect(req.body).toEqual({ name: 'Alice', age: 25 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('returns 400 and does not call next on invalid body', () => {
    const { req, res, next } = makeMocks('body', { name: '', age: -1 });
    const mw = validateRequest(schema, 'body');

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Неверный формат данных запроса.');
  });

  it('validates a non-body part (params) when specified', () => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { req, res, next } = makeMocks('params', { id: '42' });
    const mw = validateRequest(paramsSchema, 'params');

    mw(req, res, next);

    expect(req.params).toEqual({ id: 42 });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid params and keeps original params', () => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { req, res, next } = makeMocks('params', { id: '-3' });
    const original = { ...req.params };
    const mw = validateRequest(paramsSchema, 'params');

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(req.params).toEqual(original); // not replaced on failure
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Неверный формат данных запроса.');
  });

  it('does not leak internal error details (message is fixed)', () => {
    // schema that always fails to force the error path
    const failing = z.object({ field: z.string().min(1000) });
    const { req, res, next } = makeMocks('body', { field: 'short' });
    const mw = validateRequest(failing, 'body');

    mw(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    // strictly the exact user-facing message
    expect(res.send).toHaveBeenCalledWith('Неверный формат данных запроса.');
  });

  it('calls next exactly once on success', () => {
    const { req, res, next } = makeMocks('body', ok());
    const mw = validateRequest(schema, 'body');

    mw(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

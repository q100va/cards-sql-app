import { jest } from '@jest/globals';
import { z } from 'zod';

import { validateRequest } from '../../middlewares/validate-request.js';

describe('validateRequest middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  });

  const makeMocks = (part = 'body', initial = {}) => {
    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
    };

    req[part] = { ...initial };

    const res = {
      status: jest.fn(),
      send: jest.fn(),
    };

    const next = jest.fn();

    return {
      req,
      res,
      next,
    };
  };

  it('uses body by default and replaces it with parsed data', () => {
    const {
      req,
      res,
      next,
    } = makeMocks('body', {
      name: 'Alice',
      age: '25',
    });

    const middleware = validateRequest(schema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();

    expect(req.body).toEqual({
      name: 'Alice',
      age: 25,
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('passes a validation error and does not mutate invalid body', () => {
    const initial = {
      name: '',
      age: -1,
    };

    const {
      req,
      res,
      next,
    } = makeMocks('body', initial);

    const middleware = validateRequest(schema, 'body');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.code).toBe('ERRORS.VALIDATION');

    expect(req.body).toEqual(initial);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('replaces params with parsed data', () => {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

    const {
      req,
      res,
      next,
    } = makeMocks('params', { id: '42' });

    const middleware = validateRequest(paramsSchema, 'params');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();

    expect(req.params).toEqual({ id: 42 });
  });

  it('does not mutate invalid params', () => {
    const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

    const initial = { id: '-3' };

    const {
      req,
      res,
      next,
    } = makeMocks('params', initial);

    const middleware = validateRequest(paramsSchema, 'params');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error.status).toBe(422);
    expect(error.code).toBe('ERRORS.VALIDATION');

    expect(req.params).toEqual(initial);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('replaces query with parsed data', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().min(0),
      exact: z.enum(['true', 'false']).transform((value) => value === 'true'),
    });

    const req = {
      body: {},
      params: {},
      headers: {},
      cookies: {},
    };

    Object.defineProperty(req, 'query', {
      get() {
        return {
          page: '2',
          exact: 'true',
        };
      },
      configurable: true,
      enumerable: true,
    });

    const res = {
      status: jest.fn(),
      send: jest.fn(),
    };

    const next = jest.fn();

    const middleware = validateRequest(querySchema, 'query');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();

    expect(req.query).toEqual({
      page: 2,
      exact: true,
    });
  });

  it('does not mutate invalid query', () => {
    const querySchema = z.object({ page: z.coerce.number().int().min(0) });

    const initial = { page: '-1' };

    const {
      req,
      res,
      next,
    } = makeMocks('query', initial);

    const middleware = validateRequest(querySchema, 'query');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error.status).toBe(422);
    expect(error.code).toBe('ERRORS.VALIDATION');

    expect(req.query).toEqual(initial);
  });

  it('normalizes unexpected schema errors as validation errors', () => {
    const runtimeError = new Error('boom');

    const badSchema = {
      safeParse: () => {
        throw runtimeError;
      },
    };

    const {
      req,
      res,
      next,
    } = makeMocks('body', { value: 1 });

    const middleware = validateRequest(badSchema, 'body');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    const error = next.mock.calls[0][0];

    expect(error).toBe(runtimeError);
    expect(error.code).toBe('ERRORS.VALIDATION');
    expect(error.status).toBe(422);
  });
});

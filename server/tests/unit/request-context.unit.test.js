import { getRequestContext } from '../../middlewares/request-context.js';

describe('getRequestContext (unit)', () => {
  it('returns empty object when called outside of a request', () => {
    const ctx = getRequestContext();
    expect(ctx).toEqual({});
  });
});

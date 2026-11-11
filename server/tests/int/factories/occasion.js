import { Occasion } from '../../../models/index.js';

export async function createOccasion(overrides = {}) {
  return Occasion.create({ amount: 0, ...overrides });
}

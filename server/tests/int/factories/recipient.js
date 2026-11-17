import { Recipient } from '../../../models/index.js';

// Snapshot fields and their relationships must be supplied by the scenario.
export async function createRecipient(overrides = {}) {
  return Recipient.create(overrides);
}

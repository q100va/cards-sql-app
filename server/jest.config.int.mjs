import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(
  new URL('.', import.meta.url),
);

export default {
  rootDir,
  testEnvironment: 'node',
  roots: [
    '<rootDir>/tests/int',
  ],
  testMatch: [
    '**/*.int.test.[jt]s?(x)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/int/helpers/testEnv.js',
  ],
  // Integration tests share one test database.
  maxWorkers: 1,
  verbose: true,
  // Keep enabled while cleaning up test resources.
  detectOpenHandles: true,
  testTimeout: 30000,
};

// server/jest.config.int.mjs
import { fileURLToPath } from 'url';
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  rootDir,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/int'],
  testMatch: ['**/*.int.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/int/helpers/testEnv.js'],
  maxWorkers: 1,               // одна БД — без параллели
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,
};

/** @type {import('jest').Config} */

import { fileURLToPath } from 'url';

// Get the root directory of the project by converting the URL to a file path
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  rootDir,
  testMatch: ['**/tests/**/*.int.test.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/testEnv.js'],
  //setupFilesAfterEnv: ['<rootDir>/tests/helpers/testEnv.js'],
  maxWorkers: 1, // транзакции: безопаснее без параллели на одну БД
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,
};

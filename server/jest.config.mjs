import { fileURLToPath } from 'url';

const rootDir = fileURLToPath(
  new URL('.', import.meta.url),
);

export default {
  rootDir,

  testEnvironment: 'node',

  roots: [
    '<rootDir>/tests/unit',
  ],

  testMatch: [
    '**/*.test.js',
    '**/*.spec.js',
  ],

  clearMocks: true,

  transform: {},
};

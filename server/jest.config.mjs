// server/jest.config.mjs
import { fileURLToPath } from 'url';
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default {
  rootDir,
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/shared/dist/',
    '/src/',
  ],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'ts'],
  transform: {},
};

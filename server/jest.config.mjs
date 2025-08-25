// Import the fileURLToPath function from the 'url' module
import { fileURLToPath } from 'url';

// Get the root directory of the project by converting the URL to a file path
const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Export the configuration object for the testing framework
export default {
  // Root directory for the project
  rootDir,
  // Environment in which the tests will run
  testEnvironment: 'node',
  // Directories that contain test files
  roots: ['<rootDir>/tests'],
  // Patterns to match test files
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  // Patterns to ignore when looking for test files
  testPathIgnorePatterns: [
    '/node_modules/', // Ignore node_modules directory
    '/src/',          // Ignore source directory
    '/shared/dist/',  // Ignore shared distribution directory
  ],
  // Supported file extensions for modules
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'ts'],
  // Transformation options (currently empty)
  transform: {},
  // Module name mapping to handle imports correctly
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1.js' // Map imports to include .js extension
  },
};

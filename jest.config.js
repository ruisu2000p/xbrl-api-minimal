/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/supabase/functions/',
    '<rootDir>/.vscode/',
    '<rootDir>/.cursor/',
    '<rootDir>/package/',
    '<rootDir>/package-secure/',
    '<rootDir>/xbrl-api-minimal/',
    '<rootDir>/Downloads/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/supabase/functions/'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/supabase/functions/',
    '/.vscode/',
    '/.cursor/',
    '/package/',
    '/package-secure/',
    '/xbrl-api-minimal/',
    '/Downloads/'
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/.vscode/',
    '/.cursor/'
  ],
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};

module.exports = config;
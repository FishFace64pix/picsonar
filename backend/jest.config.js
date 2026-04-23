/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/functions', '<rootDir>/tests'],
  testMatch: ['**/?(*.)+(test|spec).ts?(x)'],
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/src/libs/$1',
    '^@picsonar/shared$': '<rootDir>/../packages/shared/src',
    '^@picsonar/shared/(.*)$': '<rootDir>/../packages/shared/src/$1',
  },
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'functions/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 30,
      functions: 40,
      lines: 40,
    },
  },
}

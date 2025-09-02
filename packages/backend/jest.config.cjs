/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  roots: ['<rootDir>/src'],
};

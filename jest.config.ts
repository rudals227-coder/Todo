import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({ dir: './' });

const backendConfig: Config = {
  displayName: 'backend',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/__tests__/api/**/*.test.ts',
    '<rootDir>/__tests__/services/**/*.test.ts',
  ],
};

const frontendConfig: Config = {
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/__tests__/components/**/*.test.tsx',
    '<rootDir>/__tests__/hooks/**/*.test.ts',
  ],
};

export default async () => {
  const backend = await createJestConfig(backendConfig)();
  const frontend = await createJestConfig(frontendConfig)();
  return { projects: [backend, frontend] };
};

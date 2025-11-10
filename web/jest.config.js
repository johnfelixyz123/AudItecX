export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react$': '<rootDir>/test/__mocks__/lucide-react.js',
    '^react-markdown$': '<rootDir>/test/__mocks__/react-markdown.js',
    '^recharts$': '<rootDir>/test/__mocks__/recharts.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        diagnostics: false,
      },
    ],
  },
  clearMocks: true,
}

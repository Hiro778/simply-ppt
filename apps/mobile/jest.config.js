module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-typescript'] }],
  },
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/__mocks__/expo-secure-store.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
};

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  // This pattern is crucial for Jest to transform the ESM-based SDK
  transformIgnorePatterns: [
    '/node_modules/(?!(@modelcontextprotocol/sdk)/)'
  ],
};

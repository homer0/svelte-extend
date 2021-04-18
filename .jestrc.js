module.exports = {
  automock: true,
  collectCoverage: true,
  testPathIgnorePatterns: ['/node_modules/', '/utils/scripts/'],
  unmockedModulePathPatterns: ['/node_modules/', 'mocks/'],
  coveragePathIgnorePatterns: ['mocks/'],
  testEnvironment: 'node',
};

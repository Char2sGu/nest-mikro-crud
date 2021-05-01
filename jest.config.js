module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePaths: ["."],
  clearMocks: true,
  restoreMocks: true,
  globals: {
    "ts-jest": {
      tsconfig: "tests/tsconfig.json",
    },
  },
};

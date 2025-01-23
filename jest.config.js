const jestConfig = require("@apparts/backend-test").getJestConfig();
/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  ...jestConfig,
  testEnvironment: "node",
  transform: {
    //    "^.+\\.[tj]s$": "@swc/jest",
    "^.+\\.[tj]s$": "ts-jest",
  },
  testPathIgnorePatterns: ["dist", "node_modules"],
};

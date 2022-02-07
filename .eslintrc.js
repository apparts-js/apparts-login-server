module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  overrides: [
    {
      files: ["*.test.js", "**/tests/**"],
      env: {
        jest: true,
      },
    },
  ],
  rules: {
    "no-var": "error",
    "prefer-const": "error",
    "no-unneeded-ternary": "error",
    "prefer-arrow-callback": "error",
    "no-lonely-if": "error",
    "consistent-return": ["error", { treatUndefinedAsUnspecified: false }],
    curly: "error",
  },
};

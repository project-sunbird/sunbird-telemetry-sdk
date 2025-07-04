require('eslint-plugin-only-warn');

module.exports = {
  plugins: ['only-warn'],
  env: {
    browser: true,
    es2021: true,
    node: true,
    jasmine: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off'
  }
};

module.exports = {
  env: {
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.ts', '.js'],
      },
    },
  },
  rules: {
    'import/extensions': 'off',
    'no-restricted-syntax': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
  ignorePatterns: [
    'dist/**/*',
  ],
};

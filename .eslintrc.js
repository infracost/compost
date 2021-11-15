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
    'import/no-extraneous-dependencies': ['error', {'devDependencies': ['**/*.test.ts', 'src/setupTests.ts']}],
    'import/prefer-default-export': 'off',
    'max-classes-per-file': 'off',
    'max-len': 'off',
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    'no-shadow': 'off',
    'no-use-before-define': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
  ignorePatterns: [
    'dist/**/*',
  ],
};

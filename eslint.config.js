import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import eslintJs from '@eslint/js';
import eslintTs from 'typescript-eslint';

const tsFiles = ['{src,test}/**/*.ts'];
const jsFiles = ['test/**/*.js'];

const languageOptions = {
  globals: {
    ...globals.node
  },
  ecmaVersion: 2023,
  sourceType: 'module'
};

const customTypescriptConfig = {
  files: tsFiles,
  plugins: {
    import: importPlugin,
    'import/parsers': tsParser
  },
  languageOptions: {
    ...languageOptions,
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.eslint.json'
    }
  },
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts']
    }
  },
  rules: {
    'import/export': 'error',
    'import/no-duplicates': 'warn',
    ...importPlugin.configs.typescript.rules,
    '@typescript-eslint/no-use-before-define': 'off',
    'require-await': 'off',
    'no-duplicate-imports': 'error',
    'no-unneeded-ternary': 'error',
    'prefer-object-spread': 'error',

    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        ignoreRestSiblings: true,
        args: 'none'
      }
    ],
    'import/order': [
      'error',
      {
        groups: ['type', 'builtin', ['sibling', 'parent'], 'index', 'object'],
        'newlines-between': 'never',

        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],

    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports'
      }
    ],

    '@typescript-eslint/no-explicit-any': 'off'
  }
};

const customJavascriptConfig = {
  files: jsFiles,
  languageOptions: {
    ...languageOptions,
    parserOptions: {
      ecmaVersion: 2023
    }
  },
  rules: {
    'no-duplicate-imports': 'error',
    'no-unneeded-ternary': 'error',
    'prefer-object-spread': 'error',
    'no-unused-vars': [
      'error',
      {
        ignoreRestSiblings: true,
        args: 'none'
      }
    ]
  }
};
const recommendedTypeScriptConfigs = [
  ...eslintTs.configs.recommended.map(config => ({
    ...config,
    files: tsFiles
  })),
  ...eslintTs.configs.stylistic.map(config => ({
    ...config,
    files: tsFiles
  }))
];

export default [
  {ignores: ['docs/*', 'lib/*']},
  eslintJs.configs.recommended,
  customJavascriptConfig,
  ...recommendedTypeScriptConfigs,
  customTypescriptConfig
];

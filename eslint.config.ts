import type { Linter } from 'eslint'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsEslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.venv', 'public/wasm', '*.config.js']),
  // Disable react-refresh rule for context provider modules
  {
    files: ['src/context/AppContext.tsx'],
    plugins: {
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        project: './tsconfig.app.json',
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // JavaScript and TypeScript files (non-test)
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**/*', '*.config.js', 'src/context/AppContext.tsx'],
    extends: [
      js.configs.recommended,
      ...tsEslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        project: './tsconfig.app.json',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
    },
  },
  // Test files
  {
    files: ['**/*.test.{ts,tsx}', '**/setupTests.*'],
    extends: [
      js.configs.recommended,
      ...tsEslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        ...globals.browser,
        ...globals.vitest,
        global: 'readonly',
      },
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        project: './tsconfig.test.json',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { 
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
    },
  },
  // Tooling config files
  {
    files: ['**/*.config.ts'],
    extends: [js.configs.recommended, ...tsEslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.node,
      parser: tsEslint.parser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        project: './tsconfig.tooling.json',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
    },
  },
] as Linter.Config[])

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // 검사 제외 대상
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
    ],
  },

  // 기본 JS 권장 규칙
  js.configs.recommended,

  // TypeScript 권장 규칙
  ...tseslint.configs.recommended,

  // React + TypeScript 소스 파일
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
    },
    settings: {
      react: { version: '19.0' },
    },
    rules: {
      // ── React ──────────────────────────────────────────────
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',      // React 17+ JSX transform
      'react/prop-types': 'off',              // TypeScript가 대체
      'react/self-closing-comp': 'error',     // 자식 없는 태그 셀프 클로징
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-useless-fragment': 'warn',

      // ── React Hooks ────────────────────────────────────────
      ...reactHooksPlugin.configs.recommended.rules,

      // ── Accessibility ──────────────────────────────────────
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',

      // ── TypeScript ─────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // ── 일반 코드 품질 ─────────────────────────────────────
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'no-duplicate-imports': 'error',
    },
  },

  // 테스트 파일 (완화된 규칙)
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Prettier와 충돌하는 ESLint 규칙 비활성화 (반드시 마지막에 위치)
  prettier,
);

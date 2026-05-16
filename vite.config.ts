import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    environmentMatchGlobs: [
      ['server/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // 서버 비즈니스 로직만 커버리지 측정
      // 프론트엔드 페이지/컴포넌트는 E2E 테스트(Playwright 등) 대상이므로 제외
      include: ['server/**/*.ts'],
      exclude: [
        'server/__tests__/**',
        'server/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 72,   // 팀보고 필터링 등 복잡한 분기 포함 현실적 기준
        statements: 80,
      },
    },
  },
});

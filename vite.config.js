/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'node',
    // .tsx обязателен: тесты компонентов лежат рядом с ними и называются
    // *.test.tsx — под шаблоном без него они молча не запускались, и
    // протухший тест ErrorBoundary не краснел.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})

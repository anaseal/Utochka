/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Абсолютный адрес сайта для og:image в index.html. Домен деплоя в коде не
// хардкодится (по той же причине, что и в api/_lib/security.ts: preview-деплои
// живут на своих адресах), поэтому он берётся из окружения сборки:
// VERCEL_PROJECT_PRODUCTION_URL Vercel проставляет сам, OG_ORIGIN — ручной
// перевес для прочих хостингов. Если ничего нет (локальная сборка, dev),
// плейсхолдер схлопывается в пустую строку и путь остаётся относительным —
// такой og:image понимают не все краулеры, но локально он никому и не нужен.
const ogOrigin = () => {
  const explicit = process.env.OG_ORIGIN
  if (explicit) return explicit.replace(/\/+$/, '')
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL
  return host ? `https://${host}` : ''
}

const injectOgOrigin = () => ({
  name: 'inject-og-origin',
  transformIndexHtml: (html) => html.replaceAll('__OG_ORIGIN__', ogOrigin()),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), injectOgOrigin()],
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

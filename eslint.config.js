import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Правила для .ts/.tsx. Без type-aware-набора (recommendedTypeChecked):
  // корректность типов уже полностью закрыта `npm run typecheck` со strict,
  // а type-aware линтинг требует отдельного прохода компилятора на каждый
  // запуск ESLint. Здесь — только то, чего tsc не видит: мёртвые переменные,
  // подозрительные конструкции, правила хуков React.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // warn, а не error: запись `ref.current = value` прямо в рендере — это
      // намеренный приём в useDrawing/usePersistedState/useTouchPanZoom/
      // useWeaveProgress/useWheelZoom, в кэше статистики useColorHighlight и в поздней
      // привязке cancelActiveStroke у обоих холстов (см. комментарии по
      // месту). Он держит ссылки на колбэки стабильными, без чего memo у
      // BeadGrid не работает и сетка из тысяч бисерин пересобирается на
      // каждый выбор цвета. Правило формально право (React Compiler такое не
      // любит), поэтому не глушим совсем — но и сборку это ронять не должно,
      // пока приём не пересмотрен отдельной задачей.
      'react-hooks/refs': 'warn',
      // Замок против расползания файлов. Причина роста — не сама длина, а то,
      // что новая фича дописывается в существующий файл вместо соседнего
      // (так режим плетения разошёлся копиями по обоим холстам). Порог —
      // сигнал «пора выносить в хук/компонент рядом», а не запрет: warn, и
      // считается только код, без пустых строк и комментариев — комментарии
      // здесь несут доменные объяснения и штрафовать за них нечего.
      // Файлы, превышающие порог сегодня (Header, useSilyankaProject, App,
      // CanvasView), — известная задолженность, разбираются отдельными
      // этапами.
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  // Тесты живут рядом с юнитами и растут таблицами случаев — длина там не
  // признак смешанных ответственностей.
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'max-lines': 'off' },
  },
  // Серверный код: Node-глобалы вместо браузерных, React-правила не нужны.
  {
    files: ['server.ts', 'api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Конфиг Vite исполняется в Node, а не в браузере: плагин inject-og-origin
  // читает из process.env домен деплоя для og:image (см. index.html).
  {
    files: ['vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

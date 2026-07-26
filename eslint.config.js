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
      // намеренный приём в useDrawing/usePersistedState/useTouchPanZoom и в
      // кэше статистики CanvasView (см. комментарии по месту). Он держит
      // ссылки на колбэки стабильными, без чего memo у BeadGrid не работает и
      // сетка из тысяч бисерин пересобирается на каждый выбор цвета. Правило
      // формально право (React Compiler такое не любит), поэтому не глушим
      // совсем — но и сборку это ронять не должно, пока приём не пересмотрен
      // отдельной задачей.
      'react-hooks/refs': 'warn',
    },
  },
  // Серверный код: Node-глобалы вместо браузерных, React-правила не нужны.
  {
    files: ['server.ts', 'api/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

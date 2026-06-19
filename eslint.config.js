import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'scan_bad_tokens.js', 'scan_bad_tokens.mjs', 'scan_bad_tokens.py', 'tmp_replace_profile.mjs', 'tmp_replace_profile.py', 'tmp_ui_cleanup.mjs', 'tmp_ui_cleanup.py', 'extract_profile.mjs', 'current_ui_chunk.txt', 'profile-section-snapshot.txt']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])

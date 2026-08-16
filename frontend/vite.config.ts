import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const appUrl = environment.VITE_APP_URL || 'http://localhost:5173/'

  return {
    plugins: [react(), tailwindcss(),],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
      environmentOptions: {
        jsdom: {
          url: appUrl,
        },
      },
    },
  }
})

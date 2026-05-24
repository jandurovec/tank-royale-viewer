import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
  },
})

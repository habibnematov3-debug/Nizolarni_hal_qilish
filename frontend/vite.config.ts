import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const vercelEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VERCEL_ENV || ''

export default defineConfig({
  plugins: [react()],
  define: {
    __VERCEL_ENV__: JSON.stringify(vercelEnv),
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/mariage-app/',
  build: {
    rollupOptions: {
      input: {
        wedding: resolve(__dirname, 'index.html'),
        softwareAdmin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})

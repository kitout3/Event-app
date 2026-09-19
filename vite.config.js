import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'node:fs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publishedConfig = JSON.parse(readFileSync(resolve(__dirname, 'config/firebase.public.json'), 'utf8'))
  const keys = { apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', storageBucket: 'STORAGE_BUCKET', messagingSenderId: 'MESSAGING_SENDER_ID', appId: 'APP_ID' }
  const config = Object.fromEntries(Object.entries(keys).map(([key, suffix]) => [key, env[`VITE_FIREBASE_${suffix}`] || publishedConfig[key]]))
  const configSource = `window.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};\n`
  return {
  plugins: [react(), {
    name: 'public-firebase-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0].endsWith('/firebase-config.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
          res.end(configSource)
        } else next()
      })
    },
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'firebase-config.js', source: configSource }) }
  }],
  base: env.VITE_APP_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        wedding: resolve(__dirname, 'index.html'),
        softwareAdmin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  }
})

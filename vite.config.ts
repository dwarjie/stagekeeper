import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox'
  const outDir = isFirefox ? 'dist-firefox' : 'dist'

  return {
    resolve: {
      alias: {
        '@': `${path.resolve(__dirname, 'src')}`,
      },
    },
    plugins: [
      react(),
      crx({ manifest, browser: isFirefox ? 'firefox' : 'chrome' }),
      zip({
        inDir: outDir,
        outDir: 'release',
        outFileName: `crx-${name}-${version}${isFirefox ? '-firefox' : ''}.zip`,
      }),
    ],
    build: {
      outDir,
    },
    server: {
      cors: {
        origin: [/chrome-extension:\/\//],
      },
    },
  }
})

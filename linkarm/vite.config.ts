import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  server: {
    port: 5173
  },
  resolve: {
      alias: {
        'aitos': resolve(__dirname, '../aitos/src/index.ts'),
        '@aitos/output': resolve(__dirname, '../packages/@aitos/output/index.ts'),
        '@aitos/input': resolve(__dirname, '../packages/@aitos/input/index.ts'),
        '@aitos/store': resolve(__dirname, '../packages/@aitos/store/index.ts'),
        '@aitos/transfer': resolve(__dirname, '../packages/@aitos/transfer/index.ts'),
        '@aitos/sense': resolve(__dirname, '../packages/@aitos/sense/index.ts')
      }
    }
})

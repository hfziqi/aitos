import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  server: {
    port: 7890
  },
  resolve: {
      alias: {
        '@aitos/core': resolve(__dirname, '../packages/@aitos/core/src/index.ts'),
        '@aitos/output': resolve(__dirname, '../packages/@aitos/output/index.ts'),
        '@aitos/input': resolve(__dirname, '../packages/@aitos/input/index.ts'),
        '@aitos/store': resolve(__dirname, '../packages/@aitos/store/index.ts'),
        '@aitos/transfer': resolve(__dirname, '../packages/@aitos/transfer/index.ts'),
        '@aitos/sense': resolve(__dirname, '../packages/@aitos/sense/index.ts'),
        '@aitos/bridge': resolve(__dirname, '../packages/@aitos/bridge/index.ts'),
        '@aitos/bridge-desktop': resolve(__dirname, '../packages/@aitos/bridge-desktop/index.ts')
      }
    }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: 'static',
  base: './',
  plugins: [
    react(),
    renderer(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron', 'path', 'url'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js'
              },
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js'
              },
            },
          },
        },
        onstart(options: { reload: () => void }) {
          options.reload()
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', 'undici']
    }
  },
  optimizeDeps: {
    include: ['events'],
    exclude: ['undici', '@elastic/transport'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
        process: 'globalThis.process'
      }
    }
  },
})
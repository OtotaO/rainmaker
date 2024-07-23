import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    port: 3001,
  },
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    target: 'esnext'
  }
});
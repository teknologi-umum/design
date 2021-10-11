import { defineConfig } from 'vite';

export default defineConfig({
  root: './dev',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    minify: false,
  }
})
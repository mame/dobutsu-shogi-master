import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  base: '/dobutsu-shogi-master/',
  build: {
    outDir: path.resolve(__dirname, '..', 'docs'),
    chunkSizeWarningLimit: 530,
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
}); 
/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Bundle analyzer - only in production builds
      isProduction && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'treemap', 'sunburst', 'network'
      })
    ].filter(Boolean),
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React libraries
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Payment processing
            'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
            // Data visualization
            'vendor-charts': ['recharts'],
            // Animation library
            'vendor-motion': ['motion'],
            // State management and data fetching
            'vendor-state': ['zustand', '@tanstack/react-query', 'axios'],
            // UI components
            'vendor-ui': ['lucide-react', 'react-hot-toast'],
          },
          // Optimize chunk naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          // Optimize asset naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
        // Optimize external dependencies
        external: (id) => {
          // Don't bundle these in development for faster builds
          if (mode === 'development') {
            return false;
          }
          return false;
        },
      },
      chunkSizeWarningLimit: 600,
      // Enable source maps for production debugging
      sourcemap: isProduction ? 'hidden' : true,
      // Optimize minification
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      } : undefined,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        exclude: ['e2e/**', 'node_modules/**'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

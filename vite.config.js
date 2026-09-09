import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@op-engineering/op-sqlite': path.resolve(__dirname, '__mocks__/op-sqlite.js'),
      'react-native-fs': path.resolve(__dirname, '__mocks__/react-native-fs.js'),
      '@env': path.resolve(__dirname, '__mocks__/@env.js'),
      'react-native-document-picker': path.resolve(__dirname, '__mocks__/react-native-document-picker.js'),
      '@react-native-community/netinfo': path.resolve(__dirname, '__mocks__/@react-native-community/netinfo.js'),
    },
    extensions: ['.web.mjs', '.mjs', '.web.js', '.js', '.web.mts', '.mts', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.tsx', '.tsx', '.json'],
  },
  define: {
    // Some React Native modules expect __DEV__ to be defined
    __DEV__: process.env.NODE_ENV !== 'production' || true,
    global: 'window',
  },
});

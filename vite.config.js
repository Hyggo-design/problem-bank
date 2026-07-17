/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Cấu hình Vite cho app Tauri (thay react-scripts/CRA). Khối `test` dành cho Vitest.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // khớp devUrl trong tauri.conf.json
    strictPort: true,
    open: false, // Tauri tự mở cửa sổ webview, không mở trình duyệt
    watch: { ignored: ['**/src-tauri/**'] },
  },
  clearScreen: false,
  build: {
    outDir: 'build', // giữ frontendDist "../build" trong tauri.conf.json
    emptyOutDir: true,
    // App Tauri nạp từ ổ cứng (không qua mạng) nên gói một tệp là ổn;
    // nới ngưỡng cảnh báo để build sạch (không cần code-splitting).
    chunkSizeWarningLimit: 2000,
  },
  test: {
    globals: true, // dùng describe/it/expect/vi không cần import
    environment: 'jsdom',
  },
});

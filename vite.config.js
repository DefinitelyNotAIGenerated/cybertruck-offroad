import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    host: true,  // Bind to 0.0.0.0 — accessible from other devices on the network
  }
});

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: "globalThis",
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/filter_options": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/hierarchical_table_data": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/statistical_tests": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
})
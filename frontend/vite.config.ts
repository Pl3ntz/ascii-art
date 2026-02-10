import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: ["ascii.vitorplentz.com.br"],
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: ["ascii.vitorplentz.com.br"],
  },
})

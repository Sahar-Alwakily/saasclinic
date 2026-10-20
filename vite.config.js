import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // ضيف هاد السطر

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ضيف هاد السطر
  ],
})
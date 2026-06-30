/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // Clean deep slate black
        foreground: "#f9fafb",
        glass: {
          bg: "rgba(17, 24, 39, 0.7)",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(255, 255, 255, 0.12)",
        },
        brand: {
          blue: "#3b82f6",
          indigo: "#6366f1",
          purple: "#a855f7",
          cyan: "#06b6d4"
        },
        slate: {
          750: "#1e293b",
          850: "#0f172a"
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}

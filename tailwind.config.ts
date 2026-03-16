import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "#0a0a0f",
          grid: "#1a1a2e",
          surface: "#12121a",
          border: "#2a2a3e",
        },
        node: {
          image: "#3b82f6",
          video: "#8b5cf6",
          product: "#f59e0b",
          prompt: "#10b981",
          processor: "#ec4899",
          output: "#06b6d4",
        },
        accent: {
          primary: "#6366f1",
          secondary: "#8b5cf6",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      animation: {
        "flow-line": "flowLine 2s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        flowLine: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#d8dde6",
          300: "#b8c0cc",
          400: "#8b94a3",
          500: "#5d6577",
          600: "#3d4453",
          700: "#272c38",
          800: "#181c25",
          900: "#0d1018",
        },
        bolt: {
          50: "#f0f9ff",
          100: "#dff1ff",
          200: "#b8e2ff",
          300: "#7fcbff",
          400: "#3eaaff",
          500: "#1287ec",
          600: "#0769c4",
          700: "#08549c",
          800: "#0c4880",
          900: "#0e3c6a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

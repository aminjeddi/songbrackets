import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        accent: "#1f6feb",
      },
      fontFamily: {
        mono: ["var(--font-jbm)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

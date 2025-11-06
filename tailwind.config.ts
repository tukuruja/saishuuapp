import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'background-dark': '#1F1F1F',
        'background-light': '#2C2C2E',
        'action-blue': '#007AFF',
        'accent-yellow': '#FFCC00',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8E8E93',
        'error-red': '#FF3B30',
      },
      minHeight: {
        'tap-target': '48px',
      },
      fontSize: {
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
      }
    },
  },
  plugins: [],
};
export default config;

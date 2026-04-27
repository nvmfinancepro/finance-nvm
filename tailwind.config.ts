import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary:      "#005653",
        "primary-dark": "#003d3a",
        "primary-light": "#00706c",
        nvm: {
          green:  "#059669",
          orange: "#d97706",
          red:    "#dc2626",
          bg:     "#ecfdf5",
        },
      },
      fontFamily: {
        sans: ["Nunito", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

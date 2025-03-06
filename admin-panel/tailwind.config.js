// admin-panel/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
      "./styles/**/*.{js,jsx,ts,tsx,css}"
    ],
    theme: {
      extend: {},
    },
    plugins: [
      require("daisyui")
    ],
    daisyui: {
      themes: ["light", "dark"]
    }
  };
  
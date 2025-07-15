/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./app/**/*",
    "./pages/**/*",
    "./components/**/*",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  experimental: {
    optimizeUniversalDefaults: false,
    // Si tu versión de Tailwind lo permite, intenta desactivar lightningcss:
    // cssOptimizer: 'postcss',
  },
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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

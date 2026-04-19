/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#0f4e5a',
          border: '#0f4e5a',
          hover: '#1c7a8d',
          active: '#0f94ac',
          text: '#e8f7fa',
          muted: '#c2dce2',
        },
      },
    },
  },
  plugins: [],
};


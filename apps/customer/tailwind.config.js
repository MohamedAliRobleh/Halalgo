/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary:    '#1B4332',
        secondary:  '#40916C',
        accent:     '#F4A261',
        background: '#FAFAFA',
        darkbg:     '#0D1B12',
        success:    '#2D6A4F',
        error:      '#E63946',
      },
    },
  },
};

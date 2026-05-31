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
        success:    '#2D6A4F',
        error:      '#E63946',
      },
      fontFamily: {
        'poppins-bold': ['Poppins-Bold'],
        'inter':        ['Inter-Regular'],
        'inter-medium': ['Inter-Medium'],
        'mono':         ['RobotoMono-Regular'],
      },
    },
  },
};

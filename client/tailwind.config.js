module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        // Thêm các biến màu khác nếu cần
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

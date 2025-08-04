/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'dash': 'dash 0.5s linear infinite',
            },
            keyframes: {
                dash: {
                    to: { 'stroke-dashoffset': '10' },
                },
            },
        },
    },
    plugins: [],
}

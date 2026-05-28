/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx}",
        "./components/**/*.{js,jsx}",
        "./data/**/*.{js,jsx}"
    ],
    theme: {
        extend: {
            colors: {
                sand: {
                    50: "#fdf9f3",
                    100: "#faf2e4",
                    200: "#f3e3c6",
                    300: "#ead0a0",
                    400: "#d9b274",
                    500: "#c79657"
                },
                peach: {
                    100: "#ffe8db",
                    200: "#ffd2bb",
                    300: "#ffb38a",
                    400: "#ff8c5a",
                    500: "#f06a3a"
                },
                sea: {
                    100: "#e3f3f1",
                    200: "#bfe3df",
                    300: "#88c9c2",
                    400: "#4ea69d",
                    500: "#2d8079"
                },
                cream: "#fbf6ee",
                ink: "#1f2a37"
            },
            fontFamily: {
                display: ["var(--font-playfair)", "Georgia", "serif"],
                sans: ["var(--font-inter)", "system-ui", "sans-serif"]
            },
            boxShadow: {
                soft: "0 10px 30px -12px rgba(31,42,55,0.18)",
                card: "0 6px 24px -10px rgba(31,42,55,0.22)"
            },
            borderRadius: {
                xl2: "1.25rem"
            }
        }
    },
    plugins: []
};

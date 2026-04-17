import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    safelist: [
        "bg-red-50", "border-red-100",
        "bg-yellow-50", "border-yellow-100",
        "bg-green-50", "border-green-100",
        "bg-red-500", "bg-red-600",
        "right-3", "bottom-3",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
export default config;
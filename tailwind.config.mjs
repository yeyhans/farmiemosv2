/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				'custom-yellow': 'rgba(229,215,73,255)',
				'custom-green': 'rgba(21,193,95,255)',
				'custom-red': 'rgba(252,46,79,255)',
				'custom-blue': 'rgba(0,255,255,255)',
				'custom-greey': 'rgba(50,52,51,255)',
				'custom-black': 'rgba(26,26,26,255)',

			}
		},
	},
	plugins: [],
}

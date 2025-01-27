// @ts-nocheck
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import tailwind from '@astrojs/tailwind';


import vercel from '@astrojs/vercel';


// https://astro.build/config
export default defineConfig({
  site: 'https://farmiemosv2.vercel.app/',
  integrations: [mdx(), sitemap(), tailwind()],
  output: 'static',
  adapter: vercel()
});
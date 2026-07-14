// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server', // SSR Mode
  site: 'https://remarkablebnb.nz',
  adapter: cloudflare({
    assets: {
      binding: 'STATIC_ASSETS'
    }
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});

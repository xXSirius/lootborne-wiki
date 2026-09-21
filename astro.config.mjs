import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// GITHUB_PAGES=true é setado só pelo workflow de deploy (.github/workflows/deploy.yml).
// Localmente e na Vercel o site fica na raiz, sem base — é o comportamento de sempre.
const onGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  site: onGitHubPages ? 'https://xXSirius.github.io' : 'https://lootborne-wiki.vercel.app',
  base: onGitHubPages ? '/lootborne-wiki' : '/',
  vite: {
    plugins: [tailwindcss()],
  },
});

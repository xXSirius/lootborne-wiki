// Prefixa um caminho interno (rota ou asset de /public) com o base path do
// site. É necessário porque o GitHub Pages serve o projeto em
// /lootborne-wiki/, e o Astro só reescreve url() de CSS automaticamente para
// o base configurado — href/src escritos como string literal em .astro não
// são tocados (confirmado na doc oficial). Em dev e no build da Vercel
// `base` fica em "/", então isso vira um no-op.
//
// Usar em todo href/src que aponte pra dentro do próprio site. Nunca em URL
// externa (essas começam com http(s):// e não devem passar por aqui).
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const withBase = (path: string) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

// Formatação de números para exibição.
//
// Os assets do Unity guardam os stats como float32. Ao serem lidos em
// JavaScript (float64) aparece o ruído da conversão: o 4.95 autorado pelo dev
// vira 4.9500003, o 3.6 vira 3.6000001. Arredondar pra 3 casas devolve o valor
// original — é mais fiel ao arquivo do que mostrar o ruído binário, não menos.
//
// Os JSONs em src/data guardam o valor cru de propósito (espelham o asset);
// quem limpa é a camada de exibição.
export function num(value: number, casas = 3): string {
  if (!Number.isFinite(value)) return '—';
  return String(Number(value.toFixed(casas)));
}

/** Percentual já em escala 0–100 (ex: 7.7000003 -> "7,7%"). */
export const pct = (value: number, casas = 3) => `${num(value, casas)}%`;

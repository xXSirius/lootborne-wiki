// Rotulos em pt-BR vindos da localizacao oficial do jogo (src/data/ui-pt.json).
// As paginas guardam os enums em ingles (Head, Mythic, Frost...) porque e' assim
// que eles aparecem nos assets; a traducao acontece so' na hora de exibir.
import ui from '../data/ui-pt.json';
import { withBase } from './base';

// O enum de slot do asset e a chave da localizacao divergem nesse unico caso.
const SLOT_KEYS: Record<string, string> = { waist: 'belt' };

function lookup(table: Record<string, string>, value: string, keyMap?: Record<string, string>) {
  const raw = value.toLowerCase();
  const key = keyMap?.[raw] ?? raw;
  return table[key] ?? value;
}

export const slotLabel = (slot: string) => lookup(ui.slot, slot, SLOT_KEYS);
export const rarityLabel = (rarity: string) => lookup(ui.raridade, rarity);
export const elementLabel = (element: string) => lookup(ui.elemento, element);
export const statLabel = (stat: string) => lookup(ui.atributo, stat);

/** Nome do token CSS de cor para uma raridade/elemento (--r-* / --e-*). */
export const rarityColor = (rarity: string) => `var(--r-${rarity.toLowerCase()})`;
export const elementColor = (element: string) => `var(--e-${element.toLowerCase()})`;

/** Icone de elemento extraido do jogo; "None" nao tem sprite proprio. */
export const elementIcon = (element: string) =>
  element === 'None' ? null : withBase(`/ui/element-${element.toLowerCase()}.png`);

export const ORDEM_RARIDADE = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ascended'];
export const ORDEM_SLOT = ['Head', 'Body', 'Waist', 'Weapon', 'Ring', 'Trinket'];
export const ORDEM_ELEMENTO = ['None', 'Flame', 'Frost', 'Arcane', 'Holy', 'Shadow'];

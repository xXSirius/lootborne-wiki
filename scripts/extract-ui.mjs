// Copia os assets de interface do jogo (frames, ornamentos, icones de navegacao,
// arte de fundo e a fonte de titulo) pra public/, pra que a wiki use a identidade
// visual do proprio Lootborne em vez de uma paleta inventada.
//
// Tudo aqui e' arte de UI e cenario, nao dado de balanceamento: e' o equivalente
// de usar o icone de um item na ficha dele.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const EXPORT =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_project/ExportedProject/Assets';
const TEX = path.join(EXPORT, 'Texture2D');
const FONT = path.join(EXPORT, 'Font');

// destino <- origem. Os nomes de destino sao os que o CSS/as paginas usam.
const UI = {
  'slot.png': 'AB_UI_GENERIC_SLOT_ITEM.png',
  'slot-perk.png': 'AB_UI_CHAR_PERKS_SLOT.png',
  'ornament.png': 'AB_UI_LEADERBOARD_ORNAMENT.png',
  'element-flame.png': 'AB_UI_GENERIC_ELEMENT_FIRE.png',
  'element-frost.png': 'AB_UI_GENERIC_ELEMENT_ICE.png',
  'element-holy.png': 'AB_UI_GENERIC_ELEMENT_HOLY.png',
  'element-shadow.png': 'AB_UI_GENERIC_ELEMENT_SHADOW.png',
  'element-arcane.png': 'AB_UI_GENERIC_ELEMENT_ARCANE.png',
  'nav-guia.png': 'AB_UI_REST_ICON_FIGHT_IDLE.png',
  'nav-atributos.png': 'AB_UI_CHAR_TOOLBAR_ICON_XP.png',
  'nav-itens.png': 'AB_UI_REST_ICON_EQUIP.png',
  'nav-setores.png': 'AB_UI_FIGHT_ICON_DROPS.png',
  'nav-inimigos.png': 'AB_UI_OPTIONS_ICON_CHALLENGE.png',
  'nav-perks.png': 'AB_UI_CHAR_TOOLBAR_ICON_PERKS.png',
  'nav-mecanicas.png': 'AB_UI_FIGHT_ICON_LOG.png',
  'nav-calculadora.png': 'AB_UI_OPTIONS_ICON_LEADERBOARD.png',
  'nav-manual.png': 'AB_UI_OPTIONS_ICON_MANUAL.png',
  'nav-inventario.png': 'AB_UI_REST_ICON_INVENTORY.png',
  'secondwind.png': 'AB_UI_SECONDWIND-ICON.png',
};

// Fonte de titulo do jogo. Celtic-Bit, de Mirz123 (2010), livre pra uso pessoal
// e comercial dentro de um projeto — nao e' um asset proprietario do Lootborne.
const FONTS = { 'celtic-bit.ttf': 'celtic-bit.ttf' };

function copyAll(map, fromDir, toDir, label) {
  fs.mkdirSync(toDir, { recursive: true });
  const missing = [];
  let copied = 0;
  for (const [dest, src] of Object.entries(map)) {
    const from = path.join(fromDir, src);
    if (!fs.existsSync(from)) {
      missing.push(src);
      continue;
    }
    fs.copyFileSync(from, path.join(toDir, dest));
    copied++;
  }
  console.log(`${label}: ${copied}${missing.length ? ` | faltando: ${missing.join(', ')}` : ''}`);
}

copyAll(UI, TEX, path.resolve('public/ui'), 'ui');
copyAll(FONTS, FONT, path.resolve('public/fonts'), 'fontes');

// A filigrana dourada de canto so' existe dentro do AB_UI_CHAR_PANEL, no canto
// superior esquerdo. Recorto os 16x16 dela e deixo o fundo transparente pra
// poder repetir nos quatro cantos (rotacionada) sobre qualquer cor de painel.
const CORNER = { x: 4, y: 5, size: 16, background: [0x23, 0x1c, 0x17] };
const panel = PNG.sync.read(fs.readFileSync(path.join(TEX, 'AB_UI_CHAR_PANEL.png')));
const corner = new PNG({ width: CORNER.size, height: CORNER.size });
PNG.bitblt(panel, corner, CORNER.x, CORNER.y, CORNER.size, CORNER.size, 0, 0);
for (let i = 0; i < corner.data.length; i += 4) {
  const isBackground = CORNER.background.every((c, k) => corner.data[i + k] === c);
  if (isBackground) corner.data[i + 3] = 0;
}
fs.writeFileSync(path.resolve('public/ui/corner.png'), PNG.sync.write(corner));
console.log('filigrana de canto: 1');

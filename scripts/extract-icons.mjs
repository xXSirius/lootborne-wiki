// Resolve o icone de cada item ate' o PNG e salva em public/icons/items/.
// Cadeia: ItemData.icon.guid -> Sprite.asset -> texture.guid -> Texture2D/*.png
//
// A textura costuma ser uma spritesheet com varios frames lado a lado, entao o
// PNG e' recortado pelo m_Rect do sprite. Copiar a textura inteira deixava 77
// dos 424 itens com o strip de animacao no lugar do icone.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const EXPORT =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_project/ExportedProject/Assets';
const OUT_DIR = path.resolve('public/icons/items');
const ITEMS_JSON = path.resolve('src/data/items.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

// guid -> caminho do arquivo que o .meta acompanha
function buildGuidMap(dir) {
  const map = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.meta')) continue;
    const meta = fs.readFileSync(path.join(dir, f), 'utf-8');
    const guid = meta.match(/guid:\s*([0-9a-f]{32})/)?.[1];
    if (guid) map.set(guid, path.join(dir, f.replace(/\.meta$/, '')));
  }
  return map;
}

const spriteByGuid = buildGuidMap(path.join(EXPORT, 'Sprite'));
const textureByGuid = buildGuidMap(path.join(EXPORT, 'Texture2D'));
const monoDir = path.join(EXPORT, 'MonoBehaviour');

const items = JSON.parse(fs.readFileSync(ITEMS_JSON, 'utf-8'));
const byId = new Map(items.map((i) => [i.id, i]));

let copied = 0;
let cropped = 0;
let missing = 0;

for (const f of fs.readdirSync(monoDir)) {
  if (!f.startsWith('Item_') || !f.endsWith('.asset')) continue;
  const raw = fs.readFileSync(path.join(monoDir, f), 'utf-8');
  const id = Number(raw.match(/^\s*id:\s*(\d+)/m)?.[1]);
  const item = byId.get(id);
  if (!item) continue;

  const iconGuid = raw.match(/^\s*icon:\s*\{[^}]*guid:\s*([0-9a-f]{32})/m)?.[1];
  const spritePath = iconGuid && spriteByGuid.get(iconGuid);
  if (!spritePath || !fs.existsSync(spritePath)) {
    missing++;
    continue;
  }

  const spriteRaw = fs.readFileSync(spritePath, 'utf-8');
  const texGuid = spriteRaw.match(/texture:\s*\{[^}]*guid:\s*([0-9a-f]{32})/)?.[1];
  const texPath = texGuid && textureByGuid.get(texGuid);
  if (!texPath || !fs.existsSync(texPath)) {
    missing++;
    continue;
  }

  const rectBlock = spriteRaw.slice(spriteRaw.indexOf('m_Rect:'));
  const rect = {
    x: Number(rectBlock.match(/x:\s*([\d.]+)/)?.[1]),
    y: Number(rectBlock.match(/y:\s*([\d.]+)/)?.[1]),
    w: Number(rectBlock.match(/width:\s*([\d.]+)/)?.[1]),
    h: Number(rectBlock.match(/height:\s*([\d.]+)/)?.[1]),
  };
  if (!Number.isFinite(rect.w) || !Number.isFinite(rect.h)) {
    missing++;
    continue;
  }

  const sheet = PNG.sync.read(fs.readFileSync(texPath));
  const w = Math.max(1, Math.round(rect.w));
  const h = Math.max(1, Math.round(rect.h));
  // Unity mede o rect de baixo pra cima; PNG e' de cima pra baixo.
  const sy = Math.max(0, sheet.height - Math.round(rect.y) - h);
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(sheet, out, Math.round(rect.x), sy, w, h, 0, 0);

  fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), PNG.sync.write(out));
  item.icon = `${id}.png`;
  if (sheet.width !== w || sheet.height !== h) cropped++;
  copied++;
}

fs.writeFileSync(ITEMS_JSON, JSON.stringify(items, null, 2));
console.log(`icones: ${copied} | recortados de spritesheet: ${cropped} | sem icone: ${missing}`);

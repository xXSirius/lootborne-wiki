// Recorta o primeiro frame de idle de cada inimigo da spritesheet e salva
// como retrato em public/icons/enemies/.
// Cadeia: <Nome>IdleSprites.asset -> 1o sprite -> m_Rect + textura -> crop do PNG.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const EXPORT =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_project/ExportedProject/Assets';
const OUT_DIR = path.resolve('public/icons/enemies');
const ENEMIES_JSON = path.resolve('src/data/enemies.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

function buildGuidMap(dir) {
  const map = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.meta')) continue;
    const guid = fs.readFileSync(path.join(dir, f), 'utf-8').match(/guid:\s*([0-9a-f]{32})/)?.[1];
    if (guid) map.set(guid, path.join(dir, f.replace(/\.meta$/, '')));
  }
  return map;
}

const spriteByGuid = buildGuidMap(path.join(EXPORT, 'Sprite'));
const textureByGuid = buildGuidMap(path.join(EXPORT, 'Texture2D'));
const resourcesDir = path.join(EXPORT, 'Resources');
const resourceFiles = fs.readdirSync(resourcesDir);

const enemies = JSON.parse(fs.readFileSync(ENEMIES_JSON, 'utf-8'));

// Alguns assets usam um nome mais curto que o do inimigo.
const ALIASES = {
  'Wild Boar': 'Boar',
  'Black Hornet': 'Hornet',
  'Rabid Wolf': 'Wolf',
  'Sewer Rat': 'Rat',
  'Widow Spider': 'Spider',
};

let done = 0;
const misses = [];

for (const enemy of enemies) {
  const assetName = ALIASES[enemy.name] ?? enemy.name;
  const compact = assetName.replace(/[^A-Za-z]/g, '').toLowerCase();
  const collectionFile = resourceFiles.find(
    (f) =>
      f.endsWith('IdleSprites.asset') &&
      f.slice(0, -'.asset'.length).replace(/[^A-Za-z]/g, '').toLowerCase() === `${compact}idlesprites`
  );
  if (!collectionFile) {
    misses.push(enemy.name);
    continue;
  }

  const collection = fs.readFileSync(path.join(resourcesDir, collectionFile), 'utf-8');
  const spritesSection = collection.slice(collection.indexOf('\n  sprites:'));
  const firstGuid = spritesSection.match(/guid:\s*([0-9a-f]{32})/)?.[1];
  const spritePath = firstGuid && spriteByGuid.get(firstGuid);
  if (!spritePath || !fs.existsSync(spritePath)) {
    misses.push(enemy.name);
    continue;
  }

  const spriteRaw = fs.readFileSync(spritePath, 'utf-8');
  const rectBlock = spriteRaw.slice(spriteRaw.indexOf('m_Rect:'));
  const rect = {
    x: Number(rectBlock.match(/x:\s*([\d.]+)/)?.[1]),
    y: Number(rectBlock.match(/y:\s*([\d.]+)/)?.[1]),
    w: Number(rectBlock.match(/width:\s*([\d.]+)/)?.[1]),
    h: Number(rectBlock.match(/height:\s*([\d.]+)/)?.[1]),
  };
  const texGuid = spriteRaw.match(/texture:\s*\{[^}]*guid:\s*([0-9a-f]{32})/)?.[1];
  const texPath = texGuid && textureByGuid.get(texGuid);
  if (!texPath || !fs.existsSync(texPath) || !Number.isFinite(rect.w)) {
    misses.push(enemy.name);
    continue;
  }

  const sheet = PNG.sync.read(fs.readFileSync(texPath));
  const w = Math.max(1, Math.round(rect.w));
  const h = Math.max(1, Math.round(rect.h));
  const sx = Math.round(rect.x);
  // Unity mede o rect de baixo pra cima; PNG e' de cima pra baixo.
  const sy = Math.max(0, sheet.height - Math.round(rect.y) - h);

  const out = new PNG({ width: w, height: h });
  PNG.bitblt(sheet, out, sx, sy, w, h, 0, 0);

  const file = `${compact}.png`;
  fs.writeFileSync(path.join(OUT_DIR, file), PNG.sync.write(out));
  enemy.portrait = file;
  done++;
}

fs.writeFileSync(ENEMIES_JSON, JSON.stringify(enemies, null, 2));
console.log(`retratos: ${done} | sem sprite: ${misses.length}${misses.length ? ' -> ' + misses.join(', ') : ''}`);

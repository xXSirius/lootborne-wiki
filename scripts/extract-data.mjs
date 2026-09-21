// One-off pipeline: turns the raw AssetRipper export (real game files) into
// clean JSON the site reads at build time. Source of truth lives outside the
// repo (extracted from the installed game); this script is how we refreshed
// it and how we'd refresh it again after a game update.
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const MONO_DIR =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_project/ExportedProject/Assets/MonoBehaviour';
const GAME_CONSTANTS_CS =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_primary_v2/Scripts/Assembly-CSharp/AutoBattle/Data/GameConstants.cs';
const OUT_DIR = path.resolve('src/data');

fs.mkdirSync(OUT_DIR, { recursive: true });

function stripUnityHeader(text) {
  // Unity YAML docs start with "%YAML 1.1", "%TAG ...", "--- !u!114 &id"
  // then "MonoBehaviour:" as the root key. Strip the directives/doc marker
  // and unwrap the MonoBehaviour: root so js-yaml gets plain YAML.
  const lines = text.split('\n').filter((l) => !l.startsWith('%') && !l.startsWith('---'));
  return lines.join('\n');
}

function loadAsset(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(stripUnityHeader(raw));
  return doc?.MonoBehaviour ?? null;
}

function guidOf(assetPath) {
  const metaPath = assetPath + '.meta';
  if (!fs.existsSync(metaPath)) return null;
  const m = fs.readFileSync(metaPath, 'utf-8').match(/guid:\s*([0-9a-f]{32})/);
  return m ? m[1] : null;
}

const files = fs
  .readdirSync(MONO_DIR)
  .filter((f) => f.endsWith('.asset'))
  .map((f) => path.join(MONO_DIR, f));

const RARITY = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ascended'];
const SLOT = ['Head', 'Body', 'Waist', 'Weapon', 'Ring', 'Trinket'];
const ELEMENT = ['None', 'Arcane', 'Flame', 'Frost', 'Holy', 'Shadow'];
const ENEMY_COLOR = ['Gray', 'Blue', 'Purple'];

const items = [];
const enemiesByGuid = new Map(); // guid -> enemy object (built after first pass)
const enemyGuidByPath = new Map();
const sectorsRaw = [];

for (const filePath of files) {
  const mb = loadAsset(filePath);
  if (!mb) continue;

  if (typeof mb.itemName === 'string' && 'slot' in mb && 'rarity' in mb) {
    items.push({
      id: mb.id,
      name: mb.itemName,
      slot: SLOT[mb.slot] ?? mb.slot,
      rarity: RARITY[mb.rarity] ?? mb.rarity,
      element: ELEMENT[mb.category] ?? mb.category,
      stats: { hp: mb.hp, atk: mb.atk, def: mb.def, crit: mb.crit, parry: mb.parry },
      melee: !!mb.isMelee,
      bossExclusive: !!mb.isBossExclusive,
      effects: Array.isArray(mb.effects) ? mb.effects : [],
    });
    continue;
  }

  if (typeof mb.categoryName === 'string' && Array.isArray(mb.variants)) {
    const guid = guidOf(filePath);
    const enemy = {
      name: mb.categoryName,
      variants: mb.variants.map((v) => ({
        color: ENEMY_COLOR[v.color] ?? v.color,
        hp: v.hp,
        atk: v.atk,
        def: v.def,
        crit: v.crit,
        parry: v.parry,
        level: v.level,
        xpBase: v.xpBase,
      })),
      resistElement: ELEMENT[mb.resistElement] ?? mb.resistElement,
      resistElement2: ELEMENT[mb.resistElement2] ?? mb.resistElement2,
      weakElement: ELEMENT[mb.weakElement] ?? mb.weakElement,
    };
    if (guid) enemiesByGuid.set(guid, enemy);
    continue;
  }

  if (typeof mb.sectorName === 'string' && 'sectorId' in mb) {
    sectorsRaw.push({ filePath, mb });
  }
}

const sectors = sectorsRaw
  .map(({ mb }) => ({
    id: mb.sectorId,
    name: mb.sectorName,
    totalEnemies: mb.totalEnemies,
    enemyGuids: (mb.categories ?? []).map((ref) => ref.guid),
    dropRates: {
      common: mb.commonDropPct,
      rare: mb.rareDropPct,
      epic: mb.epicDropPct,
      legendary: mb.legendaryDropPct,
      mythic: mb.mythicDropPct,
    },
    clearRewardRarity: RARITY[mb.clearRewardRarity] ?? mb.clearRewardRarity,
    levelUpRarityCap: RARITY[mb.levelUpRarityCap] ?? mb.levelUpRarityCap,
  }))
  .sort((a, b) => a.id - b.id);

// Resolve sector -> enemy name list now that all enemies are indexed by guid.
for (const s of sectors) {
  s.enemies = s.enemyGuids.map((g) => enemiesByGuid.get(g)?.name).filter(Boolean);
  delete s.enemyGuids;
}

const enemies = [...enemiesByGuid.values()].sort((a, b) => a.name.localeCompare(b.name));
items.sort((a, b) => a.id - b.id);

// --- GameConstants.cs: pull every `public const TYPE NAME = VALUE;` literal.
const csSource = fs.readFileSync(GAME_CONSTANTS_CS, 'utf-8');
const constants = {};
const constRe = /public const (\w+) (\w+) = ([^;]+);/g;
let m;
while ((m = constRe.exec(csSource))) {
  const [, type, name, rawValue] = m;
  let value = rawValue.trim();
  if (type === 'float') {
    // Handles both plain literals ("60f") and simple ratios ("5f / 18f").
    const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
    value = value.includes('/') && nums.length === 2 ? nums[0] / nums[1] : nums[0];
  } else if (type === 'int') value = parseInt(value, 10);
  else if (type === 'bool') value = value === 'true';
  else if (type === 'string') value = value.replace(/^"|"$/g, '');
  else if (type === 'Rarity') value = value.replace('Rarity.', '');
  constants[name] = value;
}

fs.writeFileSync(path.join(OUT_DIR, 'items.json'), JSON.stringify(items, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'enemies.json'), JSON.stringify(enemies, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'sectors.json'), JSON.stringify(sectors, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'constants.json'), JSON.stringify(constants, null, 2));

console.log(`items: ${items.length}`);
console.log(`enemies: ${enemies.length}`);
console.log(`sectors: ${sectors.length}`);
console.log(`constants: ${Object.keys(constants).length}`);

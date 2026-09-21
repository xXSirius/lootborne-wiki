// Traz os textos oficiais em pt-BR de Resources/localization para os JSONs da wiki.
//
// As chaves de localizacao sao geradas a partir do texto original dos .asset
// ("On criticto hit: +3 bonus damage" -> item_effect.on_criticto_hit_3_bonus_damage),
// entao basta slugificar o que ja' foi extraido pra chegar na chave. Vale lembrar
// que o texto do .asset e' o rascunho do dev — em varios itens ele ainda tem
// sobras de italiano ("danni bonus", "per il resto"). O en.json guarda a versao
// limpa e o pt-BR.json a traducao publicada; a wiki usa o pt-BR.
//
// Perks e pocoes nao existem como asset, mas a localizacao os numera
// (perk.N.name / perk.N.effect) na mesma ordem dos icones de Resources/perkicons,
// o que resolve o vinculo nome<->efeito que nao dava pra recuperar do codigo.
import fs from 'node:fs';
import path from 'node:path';

const RESOURCES =
  'C:/Users/lucas/AppData/Local/Temp/claude/c--PROJETOS-LOOTBORNE/272cfab6-3248-4eb3-b47e-4596693649cb/scratchpad/export_project/ExportedProject/Assets/Resources';
const LOC_DIR = path.join(RESOURCES, 'localization');
const CONSUMABLE_ICON_DIR = path.join(RESOURCES, 'consumableicons');
const DATA = path.resolve('src/data');

const en = JSON.parse(fs.readFileSync(path.join(LOC_DIR, 'en.json'), 'utf-8'));
const pt = JSON.parse(fs.readFileSync(path.join(LOC_DIR, 'pt-BR.json'), 'utf-8'));

// A localizacao usa rich text do TextMeshPro (<color=...>, <size=...>).
const stripTags = (s) => (typeof s === 'string' ? s.replace(/<[^>]+>/g, '') : s);
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf-8'));
const writeJson = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 2));

const report = [];
/** Texto em ingles -> texto pt-BR, pela chave derivada do proprio texto. */
function translate(prefix, english) {
  const value = pt[prefix + slug(english)];
  if (!value) {
    report.push(`${prefix}: sem traducao para "${english}"`);
    return english;
  }
  return stripTags(value);
}

// --- Itens: nome + cada linha de efeito -------------------------------------
const items = readJson('items.json');
for (const item of items) {
  item.namePt = translate('item.name.', item.name);
  item.effectsPt = item.effects.map((e) => translate('item_effect.', e));
}
writeJson('items.json', items);

// --- Inimigos e setores: so' o nome -----------------------------------------
const enemies = readJson('enemies.json');
for (const enemy of enemies) enemy.namePt = translate('enemy.name.', enemy.name);
writeJson('enemies.json', enemies);

const sectors = readJson('sectors.json');
for (const sector of sectors) {
  sector.namePt = translate('sector.name.', sector.name);
  sector.enemiesPt = sector.enemies.map((e) => translate('enemy.name.', e));
}
writeJson('sectors.json', sectors);

// --- Perks: a localizacao substitui o que antes era palpite ------------------
const perksFile = readJson('perks.json');
perksFile._nota =
  'Nome e efeito vem de Resources/localization/pt-BR.json (perk.N.name / perk.N.effect) — ' +
  'e o texto que o proprio jogo mostra, nao inferencia. O numero N casa com o prefixo do ' +
  'arquivo de icone em Resources/perkicons.';
for (const perk of perksFile.perks) {
  const name = pt[`perk.${perk.id}.name`];
  const effect = pt[`perk.${perk.id}.effect`];
  if (!name || !effect) {
    report.push(`perk: id ${perk.id} (${perk.name}) sem entrada de localizacao`);
    continue;
  }
  // nameEn ?? name: numa segunda passada o name ja' esta em pt-BR.
  perk.nameEn ??= perk.name;
  perk.name = stripTags(name);
  perk.effect = stripTags(effect);
  // A localizacao e' autoritativa: os campos de palpite nao fazem mais sentido.
  delete perk.confianca;
  delete perk.evidencia;
}
delete perksFile.efeitosNaoVinculados;
delete perksFile.efeitosNota;
writeJson('perks.json', perksFile);

// --- Pocoes: a numeracao da localizacao tem buracos -------------------------
// O icone e' nomeado pelo nome em ingles (Tireless.png), entao o en.json faz a
// ponte entre o numero da localizacao e o arquivo de icone.
const consumablesFile = readJson('consumables.json');
// A lista de icones vem da pasta do export, nao do JSON anterior, pra que o
// script possa rodar de novo sem depender do proprio resultado.
const iconBySlug = new Map(
  fs
    .readdirSync(CONSUMABLE_ICON_DIR)
    .filter((f) => f.endsWith('.png'))
    .map((f) => [slug(path.basename(f, '.png')), f])
);
// O arquivo de icone e a localizacao divergem na grafia desta unica pocao.
const ICON_ALIASES = { rampart: 'rampant' };
// Os arquivos perdem o possessivo ("Collector's Eye" -> Collector_eye.png).
const iconSlug = (name) => slug(name.replace(/'s\b/g, ''));

const consumableIds = Object.keys(pt)
  .map((k) => k.match(/^consumable\.(\d+)\.name$/)?.[1])
  .filter(Boolean)
  .map(Number)
  .sort((a, b) => a - b);

const consumables = consumableIds.map((id) => {
  const nameEn = stripTags(en[`consumable.${id}.name`] ?? '');
  const key = iconSlug(nameEn);
  const iconKey = iconBySlug.has(key) ? key : (ICON_ALIASES[key] ?? key);
  const icon = iconBySlug.get(iconKey);
  if (!icon) report.push(`pocao: id ${id} ("${nameEn}") sem icone correspondente`);
  iconBySlug.delete(iconKey);
  return {
    id,
    name: stripTags(pt[`consumable.${id}.name`]),
    nameEn,
    icon: icon ?? null,
    effect: stripTags(pt[`consumable.${id}.effect`] ?? ''),
  };
});
// Icones que sobraram nao tem texto em lugar nenhum: ficam registrados como
// pendencia visivel na wiki em vez de ganharem um efeito inventado.
const semLocalizacao = [...iconBySlug.values()].map((icon) => ({
  icon,
  nome: path.basename(icon, '.png').replace(/_/g, ' '),
}));
for (const { icon } of semLocalizacao) {
  report.push(`pocao: icone "${icon}" nao aparece na localizacao (provavelmente aposentada)`);
}

consumablesFile._nota =
  'Nome e efeito vem de Resources/localization/pt-BR.json (consumable.N.name / .effect). ' +
  'A numeracao da localizacao pula alguns numeros e nao cobre todos os icones existentes — ' +
  'as pocoes sem entrada ficam de fora porque nao da pra saber o efeito sem inventar.';
consumablesFile.consumables = consumables;
consumablesFile.semLocalizacao = semLocalizacao;
writeJson('consumables.json', consumablesFile);

// --- Rotulos de UI, tooltips de limite e o manual do jogo -------------------
const collect = (prefix) =>
  Object.fromEntries(
    Object.entries(pt)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k, v]) => [k.slice(prefix.length), stripTags(v)])
  );

const manual = Object.keys(pt)
  .map((k) => k.match(/^manual\.section\.([a-z_]+)\.h$/)?.[1])
  .filter(Boolean)
  .map((id) => ({
    id,
    titulo: stripTags(pt[`manual.section.${id}.h`]),
    corpo: stripTags(pt[`manual.section.${id}.b`] ?? ''),
  }))
  .filter((s) => s.corpo);

writeJson('ui-pt.json', {
  _nota:
    'Rotulos e manual copiados de Resources/localization/pt-BR.json — texto oficial do jogo, ' +
    'sem traducao minha.',
  raridade: collect('rarity.'),
  elemento: collect('element.'),
  atributo: collect('stat.'),
  slot: collect('slot.'),
  manual,
});

console.log(`itens: ${items.length} | inimigos: ${enemies.length} | setores: ${sectors.length}`);
console.log(`perks: ${perksFile.perks.length} | pocoes: ${consumables.length}`);
console.log(`manual: ${manual.length} secoes`);
if (report.length) {
  console.log(`\n--- ${report.length} pendencia(s) ---`);
  for (const line of report.slice(0, 40)) console.log(' ', line);
  if (report.length > 40) console.log(`  ... e mais ${report.length - 40}`);
} else {
  console.log('\nsem pendencias.');
}

# Lootborne Wiki

Wiki pessoal (não-oficial) de [Lootborne](https://store.steampowered.com/app/4335620/Lootborne/) —
itens, inimigos, setores e mecânicas com dados extraídos direto dos arquivos do jogo instalado.

## Stack

Astro 5 + Tailwind CSS v4 (CSS-first, tokens em `src/styles/tokens.css`). Sem framework de UI —
interatividade (filtros, calculadora) é JS puro em `<script>` nas próprias páginas.

## Dados

`src/data/*.json` é a fonte de verdade que as páginas leem. Foi gerado uma vez por
`scripts/extract-data.mjs`, que lê o export do [AssetRipper](https://github.com/AssetRipper/AssetRipper)
sobre a pasta instalada do jogo (`.asset` YAML dos itens/inimigos/setores + as constantes literais de
`GameConstants.cs`). Esse script aponta pra uma pasta de scratch temporária da sessão que o gerou — não
roda de novo sem re-extrair o jogo primeiro; ele existe como documentação de como o JSON nasceu, não
como um comando do dia a dia. Pra atualizar depois de um patch do jogo, repete o processo de extração e
reaponta as constantes `MONO_DIR` / `GAME_CONSTANTS_CS` do script pro novo export.

### Localização (pt-BR)

O jogo traz `Resources/localization/*.json` com a tradução completa. `scripts/extract-localization.mjs`
puxa o pt-BR para dentro dos JSONs (`namePt`, `effectsPt`) e gera `ui-pt.json` com os rótulos de
raridade/elemento/slot e o manual interno do jogo na íntegra.

As chaves de localização são geradas a partir do texto original dos `.asset`
(`"On criticto hit: +3 bonus damage"` → `item_effect.on_criticto_hit_3_bonus_damage`), então o script
só precisa slugificar o que já foi extraído — casa 424/424 nomes e 622/622 efeitos sem exceção. Vale
saber que o texto do `.asset` é o rascunho do dev e ainda tem sobras de italiano ("danni bonus",
"per il resto"); o `en.json` tem a versão limpa e o `pt-BR.json` a publicada, que é a que a wiki usa.

**Perks e Poções** (`perks.json` / `consumables.json`) não existem como asset — nome e ícone vêm de
`Resources/perkicons` / `consumableicons`. O vínculo nome↔efeito não é recuperável do código
compilado, mas a localização numera as entradas (`perk.N.name` / `perk.N.effect`) na mesma ordem do
prefixo dos arquivos de ícone, o que resolve o problema: os 31 perks têm efeito oficial. Nas poções
sobra uma diferença honesta — 21 entradas numeradas contra 23 ícones, registrada em
`consumables.semLocalizacao` e mostrada na página.

Nenhum arquivo original do jogo (sprites, áudio, etc.) é distribuído por este repositório — só os
valores numéricos/texto de balanceamento, para referência pessoal.

## Ícones e arte

`public/icons/` guarda o que veio dos assets do jogo: ícones de item (resolvidos por GUID,
`ItemData.icon` → Sprite → Texture2D), ícones de perk/poção (`Resources/perkicons` e
`consumableicons`) e retratos de inimigo (`scripts/extract-enemy-portraits.mjs` recorta o primeiro
frame de idle da spritesheet). Os scripts dependem do mesmo export do AssetRipper descrito acima.

Em ambos os recortes o PNG é cortado pelo `m_Rect` do Sprite, e não copiado inteiro: a textura
costuma ser uma spritesheet com vários frames lado a lado. Atenção ao eixo — o rect do Unity é medido
de baixo pra cima e o PNG de cima pra baixo.

`public/ui/` tem a interface do jogo (`scripts/extract-ui.mjs`): moldura de slot, ornamento de
título, ícones de elemento e de navegação, e a filigrana dourada de canto — essa última recortada de
dentro do `AB_UI_CHAR_PANEL`, com o fundo tornado transparente. As cores em `src/styles/tokens.css`
foram amostradas dessas mesmas texturas, com a origem anotada; as de raridade são a exceção e estão
marcadas como convenção da wiki, porque não há fonte de cor de raridade em lugar nenhum nos arquivos.

**Exceção de procedência:** `public/ui/backdrop-arte.jpg`, o fundo da página, **não** saiu do jogo —
é arte original gerada para a wiki. Todo o resto de `public/` vem dos arquivos do Lootborne.

A fonte de título é a `celtic-bit.ttf` que acompanha o jogo — Celtic-Bit, de Mirz123 (2010), livre
para uso pessoal e comercial dentro de um projeto; não é um asset proprietário do Lootborne.

As métricas verticais dessa fonte são inválidas (descender positivo, `lineGap` de 1250 num em de
1000, ascender declarado menor que a altura real dos glifos). O `@font-face` em `global.css`
corrige isso com `ascent-override` / `descent-override` medidos da tinta real via Canvas
TextMetrics — sem eles o texto sobe dentro de qualquer caixa e parece erro de padding.

## Rodando local

```
npm install
npm run dev
```

## Build / deploy

```
npm run build
```

Saída estática em `dist/`, pronta pro Vercel (zero-config, detecta Astro automaticamente).

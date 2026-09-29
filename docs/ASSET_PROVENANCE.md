# Visual Asset Provenance

Visual V2 intentionally uses redistributable CC0 assets. Combat authority remains in `src/combat.js`; these models are presentation only.

## Human fighter

- Asset: **Ultimate Modular Men — Punk**
- Creator: **Quaternius**
- License: **CC0 1.0**
- Official pack: https://quaternius.com/packs/ultimatemodularcharacters.html
- Repository file: `assets/quaternius/fighter.glb`
- Imported from public mirror path: `yerdaulet-damir/liminal/client/public/models/figure_Punk.glb`
- Upstream Git blob: `519955c7a1bedfb84728869ab1f83a59e3649aaf`
- Local Git blob: `519955c7a1bedfb84728869ab1f83a59e3649aaf`

The official Quaternius pack page identifies Ultimate Modular Men as CC0 and permits personal and commercial use.

## Monster

- Asset: **Orc**
- Creator: **Quaternius**
- License: **CC0 1.0**
- Original listing: https://poly.pizza/m/5vO2YJsPEf
- Repository file: `assets/quaternius/orc.glb`
- Imported from: `FreePeak/opencombat/assets/enemies/orc.glb`
- Upstream Git blob: `a524bac53493c64da55a4c024c4f63c0cdd21b9c`
- Local Git blob: `a524bac53493c64da55a4c024c4f63c0cdd21b9c`

The upstream `assets/credits/metadata.json` records this Orc as Quaternius / CC0 1.0.

## Rules

- Third-party visual assets must have an explicit license before entering production.
- Prefer CC0 for redistributable binary assets.
- Visual assets never become combat authority.
- Replacing a model must not change mass, impact, balance, consciousness, fatigue, body-part function, or match-resolution semantics.

## Visual V2.1 arena dressing

All arena props below are presentation-only CC0 assets. They have no collision,
damage, balance, movement, or AI authority.

| Repository file | Asset | Creator | License | Source |
| --- | --- | --- | --- | --- |
| `assets/quaternius/stage/round-tree.glb` | Round-canopy Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/i4QMw4L64D |
| `assets/quaternius/stage/broad-tree.glb` | Broad-canopy Tree | Quaternius | CC0 1.0 | https://poly.pizza/m/b0boebSV1r |
| `assets/quaternius/stage/rock.glb` | Rock | Quaternius | CC0 1.0 | https://poly.pizza/m/4MUaQTcDdc |
| `assets/quaternius/stage/grass-tall.glb` | Tall Grass | Quaternius | CC0 1.0 | https://poly.pizza/m/JSIYtscPmP |
| `assets/quaternius/stage/grass-tuft.glb` | Grass Tuft B | Quaternius | CC0 1.0 | https://poly.pizza/m/vUJjrRsFp4 |

Binary lineage:

- Round tree upstream/local Git blob: `9ed24c5c94c659f411b517310faf0f81708d7874`
- Broad tree upstream/local Git blob: `f84e4f08860b309a8e17b2e64794c0d8d848f537`
- Rock upstream/local Git blob: `bbd9f39f376c500fb24149ec5c852214cc525b66`
- Tall grass upstream/local Git blob: `707d819b5c635a9280fa7d954c43f22bc8d0f722`
- Grass tuft upstream/local Git blob: `e6315f215404b66d63ccf5adfe8873e5e119e9a0`

The tree assets were mirrored from `vedanth-jadhav/ansal-3d`, whose
`public/accents-2/manifest.json` records Quaternius and CC0 1.0 Universal.
The rock and grass assets were mirrored from `FreePeak/opencombat`, whose
`assets/credits/metadata.json` records the same author/license provenance.

## Native monster animation

The vendored Orc GLB contains embedded Quaternius animation tracks. Visual V2.1
uses these presentation clips directly in PlayCanvas:

- `CharacterArmature|Idle`
- `CharacterArmature|Run`
- `CharacterArmature|Punch`
- `CharacterArmature|HitReact`
- `CharacterArmature|Death`
- `CharacterArmature|Duck` when available for bracing

Animation selection reads combat state but never writes combat truth. A visual
clip cannot create contact, damage, stagger, knockdown, or incapacitation.

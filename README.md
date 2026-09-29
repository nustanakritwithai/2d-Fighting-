# 2D Fighting — Physical Combat Prototype

A PlayCanvas 1v1 prototype: **human vs monster**, built around physical condition instead of RPG HP/ATK/DEF.

## Combat model

The fight is resolved from body state, relative movement, effective mass, balance, posture, fatigue, breathing, consciousness and body-part function. The same deterministic Impact Resolver is used for both the human and the quadruped monster.

There is no HP bar, attack stat, defense stat, critical chance or dodge chance.

## Controls

Desktop:

- `A` / `D` — move
- `Space` — physical dodge step (no invulnerability roll)
- `J` — punch toward the monster head
- `K` — low kick toward the front leg
- Hold `L` — guard; impact is reduced but still transferred

Mobile controls are rendered on-screen. Landscape is recommended.

## Run locally

Serve the repository root with any static HTTP server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

PlayCanvas is loaded as an ES module from jsDelivr and pinned to `2.22.6`.

## Verify

```bash
npm test
npm run check
```

The Node tests cover the non-RPG authority contract, deterministic resolution, mass/stability effects, guard transfer, consciousness effects and functional leg impairment.

See [`docs/PHYSICAL_COMBAT_STATUS_V1.md`](docs/PHYSICAL_COMBAT_STATUS_V1.md) for the current authority contract.

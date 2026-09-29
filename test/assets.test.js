import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MODELS = [
  ['human fighter', new URL('../assets/quaternius/fighter.glb', import.meta.url), 500_000],
  ['orc monster', new URL('../assets/quaternius/orc.glb', import.meta.url), 400_000],
  ['round tree', new URL('../assets/quaternius/stage/round-tree.glb', import.meta.url), 20_000],
  ['broad tree', new URL('../assets/quaternius/stage/broad-tree.glb', import.meta.url), 10_000],
  ['rock', new URL('../assets/quaternius/stage/rock.glb', import.meta.url), 5_000],
  ['tall grass', new URL('../assets/quaternius/stage/grass-tall.glb', import.meta.url), 20_000],
  ['grass tuft', new URL('../assets/quaternius/stage/grass-tuft.glb', import.meta.url), 20_000]
];

function parseGlbJson(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'glTF', 'must be binary glTF');
  assert.equal(bytes.readUInt32LE(4), 2, 'must be GLB v2');

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    offset += 8;

    if (chunkType === 0x4e4f534a) {
      const raw = bytes.subarray(offset, offset + chunkLength).toString('utf8').replace(/\0+$/g, '').trimEnd();
      return JSON.parse(raw);
    }

    offset += chunkLength;
  }

  throw new Error('GLB JSON chunk not found');
}

test('Visual V2.1 ships real GLB model and arena assets', async () => {
  for (const [name, url, minimumBytes] of MODELS) {
    const bytes = await readFile(url);
    assert.ok(bytes.length >= minimumBytes, `${name} should be a real asset, not an empty placeholder`);
    parseGlbJson(bytes);
  }
});

test('Orc GLB contains the native combat animation clips used by PlayCanvas', async () => {
  const bytes = await readFile(new URL('../assets/quaternius/orc.glb', import.meta.url));
  const gltf = parseGlbJson(bytes);
  const names = new Set((gltf.animations || []).map((animation) => animation.name));

  for (const required of [
    'CharacterArmature|Idle',
    'CharacterArmature|Run',
    'CharacterArmature|Punch',
    'CharacterArmature|HitReact',
    'CharacterArmature|Death'
  ]) {
    assert.ok(names.has(required), `Orc GLB missing required animation: ${required}`);
  }
});

test('PlayCanvas visual loader points only at vendored CC0 combat models', async () => {
  const source = await readFile(new URL('../src/model-assets.js', import.meta.url), 'utf8');
  assert.match(source, /\.\/assets\/quaternius\/fighter\.glb/);
  assert.match(source, /\.\/assets\/quaternius\/orc\.glb/);
  assert.match(source, /CharacterArmature\|Punch/);
  assert.match(source, /CC0 1\.0/g);
});

test('stage loader uses vendored CC0 GLBs and never becomes combat authority', async () => {
  const source = await readFile(new URL('../src/stage-assets.js', import.meta.url), 'utf8');
  assert.match(source, /round-tree\.glb/);
  assert.match(source, /broad-tree\.glb/);
  assert.match(source, /rock\.glb/);
  assert.match(source, /grass-tall\.glb/);
  assert.match(source, /grass-tuft\.glb/);
  assert.doesNotMatch(source, /resolveImpact|consciousness|bodyParts|combatCapability/);
});

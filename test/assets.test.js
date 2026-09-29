import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MODELS = [
  ['human fighter', new URL('../assets/quaternius/fighter.glb', import.meta.url), 500_000],
  ['orc monster', new URL('../assets/quaternius/orc.glb', import.meta.url), 400_000]
];

test('Visual V2 ships non-empty GLB model assets', async () => {
  for (const [name, url, minimumBytes] of MODELS) {
    const bytes = await readFile(url);
    assert.ok(bytes.length >= minimumBytes, `${name} should be a real model, not an empty placeholder`);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'glTF', `${name} must be binary glTF`);
    assert.equal(bytes.readUInt32LE(4), 2, `${name} must be GLB v2`);
  }
});

test('PlayCanvas visual loader points at vendored CC0 models', async () => {
  const source = await readFile(new URL('../src/model-assets.js', import.meta.url), 'utf8');
  assert.match(source, /\.\/assets\/quaternius\/fighter\.glb/);
  assert.match(source, /\.\/assets\/quaternius\/orc\.glb/);
  assert.match(source, /CC0 1\.0/g);
});

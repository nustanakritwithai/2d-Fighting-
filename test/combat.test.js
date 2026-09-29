import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHumanState,
  createMonsterState,
  resolveImpact,
  projectCapabilities,
  statusLabels
} from '../src/combat.js';

test('physical state exposes no RPG HP/ATK/DEF authority', () => {
  const human = createHumanState();
  for (const forbidden of ['hp', 'HP', 'atk', 'ATK', 'def', 'DEF', 'level']) {
    assert.equal(Object.hasOwn(human, forbidden), false);
  }
});

test('same impact destabilizes a human more than a heavy quadruped', () => {
  const attacker = createHumanState('attacker');
  const human = createHumanState('target-human');
  const monster = createMonsterState('target-monster');

  const h = resolveImpact({ attacker, target: human, targetPart: 'TORSO', relativeSpeed: 7, effectiveMass: 30 });
  const m = resolveImpact({ attacker, target: monster, targetPart: 'TORSO', relativeSpeed: 7, effectiveMass: 30 });

  assert.ok(h.severity > m.severity);
  assert.ok(human.balance < monster.balance);
});

test('guard reduces but never deletes transmitted impact', () => {
  const attacker = createMonsterState('attacker');
  const open = createHumanState('open');
  const guarded = createHumanState('guarded');

  const a = resolveImpact({ attacker, target: open, targetPart: 'TORSO', relativeSpeed: 6, effectiveMass: 80, guarded: false });
  const b = resolveImpact({ attacker, target: guarded, targetPart: 'TORSO', relativeSpeed: 6, effectiveMass: 80, guarded: true });

  assert.ok(b.transmittedImpulse > 0);
  assert.ok(b.transmittedImpulse < a.transmittedImpulse);
  assert.ok(guarded.balance < 1);
});

test('repeated leg impacts reduce actual movement capability', () => {
  const attacker = createHumanState('attacker');
  const monster = createMonsterState('monster');

  for (let i = 0; i < 12; i += 1) {
    resolveImpact({
      attacker,
      target: monster,
      targetPart: 'FRONT_LEFT_LEG',
      relativeSpeed: 8,
      effectiveMass: 25
    });
    monster.balance = Math.max(monster.balance, 0.7);
  }

  projectCapabilities(monster);
  assert.ok(monster.bodyParts.FRONT_LEFT_LEG.function < 0.7);
  assert.notEqual(monster.movementCapability, 'NORMAL');
});

test('head impacts affect consciousness rather than a hidden health bar', () => {
  const attacker = createMonsterState('attacker');
  const human = createHumanState('human');

  const before = human.consciousness;
  resolveImpact({ attacker, target: human, targetPart: 'HEAD', relativeSpeed: 7.5, effectiveMass: 45 });

  assert.ok(human.consciousness < before);
  assert.equal(Object.hasOwn(human, 'hp'), false);
});

test('resolver is deterministic for identical starting state and impact', () => {
  const attackerA = createHumanState('a');
  const attackerB = createHumanState('b');
  const targetA = createMonsterState('ta');
  const targetB = createMonsterState('tb');

  const spec = { targetPart: 'HEAD', relativeSpeed: 7, effectiveMass: 16, guarded: false, contactQuality: 0.9 };
  const one = resolveImpact({ attacker: attackerA, target: targetA, ...spec });
  const two = resolveImpact({ attacker: attackerB, target: targetB, ...spec });

  assert.deepEqual(one, two);
  assert.deepEqual(statusLabels(targetA), statusLabels(targetB));
});

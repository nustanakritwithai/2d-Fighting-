import * as pc from 'playcanvas';
import {
  createHumanState,
  createMonsterState,
  exert,
  recoverPhysicalState,
  resolveImpact,
  statusLabels,
  weakestPart
} from './combat.js';
import { createVisualHost, updateVisualMotion, assetSummary } from './model-assets.js';

const canvas = document.getElementById('application');
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true }
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight = new pc.Color(0.34, 0.38, 0.46);
app.start();
window.addEventListener('resize', () => app.resizeCanvas());

const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.018, 0.026, 0.04),
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 5.3
});
camera.setPosition(0, 0.58, 12);
app.root.addChild(camera);

const light = new pc.Entity('Key Light');
light.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1, 0.94, 0.86),
  intensity: 2.15,
  castShadows: true,
  shadowBias: 0.18,
  shadowResolution: 2048
});
light.setEulerAngles(48, -32, 0);
app.root.addChild(light);

const ARENA_LEFT = -7.4;
const ARENA_RIGHT = 7.4;
const GROUND_Y = -1.65;
const HUMAN_X = -3.6;
const MONSTER_X = 3.8;

function material(color, emissive = 0.08) {
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(...color);
  mat.emissive = new pc.Color(color[0] * emissive, color[1] * emissive, color[2] * emissive);
  mat.metalness = 0;
  mat.gloss = 0.22;
  mat.update();
  return mat;
}

const MAT = {
  human: material([0.26, 0.68, 0.96]),
  humanSkin: material([0.98, 0.72, 0.5]),
  humanDark: material([0.08, 0.18, 0.3]),
  monster: material([0.83, 0.27, 0.2]),
  monsterDark: material([0.34, 0.08, 0.07]),
  monsterHorn: material([0.9, 0.74, 0.42]),
  ground: material([0.13, 0.17, 0.23]),
  line: material([0.34, 0.42, 0.52]),
  accent: material([0.95, 0.78, 0.28])
};

function primitive(parent, name, type, pos, scale, mat) {
  const entity = new pc.Entity(name);
  entity.addComponent('render', { type });
  entity.setLocalPosition(pos[0], pos[1], pos[2] || 0);
  entity.setLocalScale(scale[0], scale[1], scale[2] || 0.26);
  entity.render.material = mat;
  parent.addChild(entity);
  return entity;
}

function buildHumanVisual() {
  return createVisualHost(app, 'human');
}

function buildMonsterVisual() {
  return createVisualHost(app, 'monster');
}

function buildArena() {
  const ground = new pc.Entity('Ground');
  ground.addComponent('render', { type: 'box' });
  ground.setPosition(0, GROUND_Y - 0.26, -0.45);
  ground.setLocalScale(16.4, 0.46, 5.8);
  ground.render.material = MAT.ground;
  ground.render.castShadows = false;
  ground.render.receiveShadows = true;
  app.root.addChild(ground);

  // Depth layers keep the arena readable while the playable plane remains 2D.
  primitive(app.root, 'RearPlatform', 'box', [0, GROUND_Y + 0.22, -2.65], [16.2, 0.32, 0.42], MAT.line);
  primitive(app.root, 'ArenaLip', 'box', [0, GROUND_Y - 0.02, 1.55], [16.2, 0.09, 0.22], MAT.accent);
  primitive(app.root, 'LeftPillar', 'box', [ARENA_LEFT - 0.2, 0.28, -1.55], [0.28, 4.15, 0.55], MAT.line);
  primitive(app.root, 'RightPillar', 'box', [ARENA_RIGHT + 0.2, 0.28, -1.55], [0.28, 4.15, 0.55], MAT.line);

  // Subtle stage stones: scenery only, never combat colliders.
  for (const [x, z, sx, sy] of [
    [-6.0, -1.7, 0.62, 0.22],
    [-4.7, -1.9, 0.34, 0.15],
    [5.6, -1.85, 0.52, 0.19],
    [6.4, -1.65, 0.28, 0.12]
  ]) {
    const stone = primitive(app.root, 'StageStone', 'sphere', [x, GROUND_Y + sy * 0.25, z], [sx, sy, 0.42], MAT.line);
    stone.render.castShadows = true;
    stone.render.receiveShadows = true;
  }
}

console.info('[visual-assets] manifest', assetSummary());

buildArena();

const PLAYER_ATTACKS = {
  punch: {
    name: 'PUNCH', duration: 0.34, activeStart: 0.1, activeEnd: 0.18,
    range: 1.28, effectiveMass: 14, attackSpeed: 7.2, targetPart: 'HEAD', exertion: 0.22
  },
  kick: {
    name: 'LOW KICK', duration: 0.54, activeStart: 0.18, activeEnd: 0.3,
    range: 1.58, effectiveMass: 25, attackSpeed: 8.0, targetPart: 'FRONT_LEFT_LEG', exertion: 0.38
  }
};

const MONSTER_ATTACKS = {
  swipe: {
    name: 'CLAW SWIPE', duration: 0.48, activeStart: 0.16, activeEnd: 0.26,
    range: 1.52, effectiveMass: 34, attackSpeed: 6.2, targetPart: 'RIGHT_ARM', exertion: 0.22
  },
  bite: {
    name: 'BITE', duration: 0.56, activeStart: 0.2, activeEnd: 0.31,
    range: 1.3, effectiveMass: 39, attackSpeed: 6.5, targetPart: 'TORSO', exertion: 0.3
  },
  charge: {
    name: 'CHARGE', duration: 0.92, activeStart: 0.22, activeEnd: 0.76,
    range: 1.18, effectiveMass: 132, attackSpeed: 6.2, targetPart: 'TORSO', exertion: 0.48,
    propel: 4.8
  }
};

function capabilitySpeed(state) {
  const map = { NORMAL: 1, LIMITED: 0.74, LIMPING: 0.48, CRAWLING: 0.22, IMMOBILE: 0 };
  return (map[state.movementCapability] ?? 0) * (1 - state.fatigue * 0.34);
}

class Combatant {
  constructor(kind, x) {
    this.kind = kind;
    this.state = kind === 'human' ? createHumanState('player') : createMonsterState('monster');
    this.visual = kind === 'human' ? buildHumanVisual() : buildMonsterVisual();
    this.x = x;
    this.vx = 0;
    this.facing = kind === 'human' ? 1 : -1;
    this.action = null;
    this.reactionTimer = 0;
    this.downTimer = 0;
    this.getUpTimer = 0;
    this.bracing = false;
    this.retreating = false;
    this.syncVisual(0);
  }

  reset(x) {
    this.state = this.kind === 'human' ? createHumanState('player') : createMonsterState('monster');
    this.x = x;
    this.vx = 0;
    this.facing = this.kind === 'human' ? 1 : -1;
    this.action = null;
    this.reactionTimer = 0;
    this.downTimer = 0;
    this.getUpTimer = 0;
    this.bracing = false;
    this.retreating = false;
  }

  isGroundedDown() {
    return this.downTimer > 0 || this.getUpTimer > 0 || ['DOWN', 'FALLING', 'UNCONSCIOUS'].includes(this.state.posture);
  }

  canAct() {
    return !matchOver && !this.state.incapacitated && this.reactionTimer <= 0 && !this.isGroundedDown() && !this.action;
  }

  startAttack(def) {
    if (!this.canAct()) return false;
    this.action = { ...def, time: 0, hit: false };
    this.state.posture = 'ATTACK_COMMITTED';
    exert(this.state, def.exertion);
    return true;
  }

  startDodge() {
    if (!this.canAct()) return false;
    this.action = { name: 'DODGE', duration: 0.34, time: 0, hit: true, dodge: true };
    this.vx = -this.facing * 5.4 * capabilitySpeed(this.state);
    this.state.posture = 'LEAN_BACK';
    exert(this.state, 0.32);
    return true;
  }

  applyReaction(result, direction) {
    if (result.knockback > 0) this.vx += direction * result.knockback;
    const timers = { FLINCH: 0.1, STAGGER: 0.24, HEAVY_STAGGER: 0.48 };
    if (timers[result.reaction]) {
      this.reactionTimer = Math.max(this.reactionTimer, timers[result.reaction]);
      this.action = null;
    }
    if (result.reaction === 'KNOCKDOWN') {
      this.action = null;
      this.downTimer = 1.15 + this.state.fatigue * 0.7;
      this.state.posture = 'DOWN';
      this.state.balance = Math.min(this.state.balance, 0.05);
    }
    if (result.reaction === 'UNCONSCIOUS') {
      this.action = null;
      this.downTimer = 999;
      this.state.posture = 'UNCONSCIOUS';
    }
  }

  stepTimers(dt) {
    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
      if (this.reactionTimer <= 0 && !this.isGroundedDown()) this.state.reaction = 'READY';
    }

    if (this.downTimer > 0 && this.downTimer < 900) {
      this.downTimer -= dt;
      this.state.posture = 'DOWN';
      if (this.downTimer <= 0 && this.state.consciousness > 0.08) {
        this.getUpTimer = 0.56 + this.state.fatigue * 0.45;
        this.state.posture = 'GETTING_UP';
      }
    }

    if (this.getUpTimer > 0) {
      this.getUpTimer -= dt;
      this.state.posture = 'GETTING_UP';
      if (this.getUpTimer <= 0) {
        this.state.posture = this.kind === 'human' ? 'UPRIGHT' : 'STANDING';
        this.state.balance = Math.max(this.state.balance, 0.42);
        this.state.reaction = 'READY';
      }
    }
  }

  stepAttack(dt, target, targetGuarded = false) {
    if (!this.action) return;
    const action = this.action;
    action.time += dt;

    if (action.dodge) {
      this.vx *= Math.pow(0.012, dt);
    } else {
      if (action.propel) this.vx = this.facing * action.propel * capabilitySpeed(this.state);
      const active = action.time >= action.activeStart && action.time <= action.activeEnd;
      if (active && !action.hit) {
        const dx = target.x - this.x;
        const inFront = Math.sign(dx || this.facing) === this.facing;
        const distance = Math.abs(dx);
        if (inFront && distance <= action.range) {
          const closing = Math.max(0, (this.vx - target.vx) * this.facing);
          const result = resolveImpact({
            attacker: this.state,
            target: target.state,
            targetPart: action.targetPart,
            relativeSpeed: action.attackSpeed + closing,
            effectiveMass: action.effectiveMass,
            direction: this.facing,
            guarded: targetGuarded,
            contactQuality: 1
          });
          action.hit = true;
          target.applyReaction(result, this.facing);
          addCombatLog(this, target, action, result);
          flashImpact(target.x, target.kind === 'human' ? 0.95 : 0.65, result.guarded);
        }
      }
    }

    if (action.time >= action.duration) {
      this.action = null;
      if (!this.isGroundedDown()) this.state.posture = this.kind === 'human' ? 'UPRIGHT' : 'STANDING';
    }
  }

  integrate(dt) {
    this.state.momentum.vx = this.vx;
    this.x += this.vx * dt;
    this.x = Math.max(ARENA_LEFT + 0.4, Math.min(ARENA_RIGHT - 0.4, this.x));
    const damping = this.isGroundedDown() ? 0.92 : 0.84;
    this.vx *= Math.pow(damping, dt * 60);
  }

  syncVisual(time) {
    const down = this.state.posture === 'DOWN' || this.state.posture === 'UNCONSCIOUS';
    const y = GROUND_Y + (down ? 0.05 : 0.08);

    this.visual.root.setPosition(this.x, y, 0);
    this.visual.root.setEulerAngles(0, this.facing < 0 ? 180 : 0, 0);
    updateVisualMotion(this.visual, this, time);
  }
}

const human = new Combatant('human', HUMAN_X);
const monster = new Combatant('monster', MONSTER_X);

const held = new Set();
const commands = [];
const normalizeKey = (key) => key.length === 1 ? key.toLowerCase() : key;

window.addEventListener('keydown', (event) => {
  const key = normalizeKey(event.key);
  if (['a', 'd', 'j', 'k', 'l', ' ', 'ArrowLeft', 'ArrowRight'].includes(key)) event.preventDefault();
  if (!event.repeat && ['j', 'k', ' '].includes(key)) commands.push(key === 'j' ? 'punch' : key === 'k' ? 'kick' : 'dodge');
  held.add(key);
});
window.addEventListener('keyup', (event) => held.delete(normalizeKey(event.key)));
window.addEventListener('blur', () => held.clear());

for (const button of document.querySelectorAll('[data-hold]')) {
  const key = button.dataset.hold;
  const start = (event) => { event.preventDefault(); held.add(key); button.classList.add('pressed'); };
  const end = (event) => { event.preventDefault(); held.delete(key); button.classList.remove('pressed'); };
  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('pointerleave', end);
}
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    commands.push(button.dataset.action);
    button.classList.add('pressed');
  });
  const end = () => button.classList.remove('pressed');
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
}

document.getElementById('restart').addEventListener('click', restartMatch);

let monsterDecisionTimer = 0.35;
let monsterAttackIndex = 0;
let matchOver = false;
let matchResult = '';
let elapsed = 0;
let uiTimer = 0;
const logLines = [];

function isPlayerGuarding() {
  return (held.has('l') || held.has('guard')) && human.canAct();
}

function playerStep(dt) {
  if (human.state.incapacitated) return;

  const guarding = isPlayerGuarding();
  if (guarding) {
    human.state.posture = 'GUARD';
    human.vx *= Math.pow(0.2, dt * 60);
    exert(human.state, 0.03 * dt);
  }

  while (commands.length) {
    const cmd = commands.shift();
    if (cmd === 'punch') human.startAttack(PLAYER_ATTACKS.punch);
    if (cmd === 'kick') human.startAttack(PLAYER_ATTACKS.kick);
    if (cmd === 'dodge') human.startDodge();
  }

  if (!human.action && !guarding && human.reactionTimer <= 0 && !human.isGroundedDown()) {
    const dir = (held.has('d') || held.has('right') || held.has('ArrowRight') ? 1 : 0) -
      (held.has('a') || held.has('left') || held.has('ArrowLeft') ? 1 : 0);
    if (dir !== 0) {
      human.vx += (dir * 3.25 * capabilitySpeed(human.state) - human.vx) * Math.min(1, dt * 12);
      exert(human.state, 0.08 * dt);
    }
  }

  human.facing = monster.x >= human.x ? 1 : -1;
  human.stepAttack(dt, monster, monster.bracing);
}

function monsterStep(dt) {
  if (monster.state.incapacitated) return;
  monster.facing = human.x >= monster.x ? 1 : -1;
  monster.bracing = false;

  const distance = Math.abs(human.x - monster.x);
  const painRetreat = monster.state.pain > 0.76 && ['LIMPING', 'CRAWLING', 'IMMOBILE'].includes(monster.state.movementCapability);
  if (painRetreat && !monster.action && !monster.isGroundedDown()) monster.retreating = true;

  if (monster.retreating) {
    monster.vx += ((monster.x >= human.x ? 1 : -1) * 2.5 * capabilitySpeed(monster.state) - monster.vx) * Math.min(1, dt * 8);
    exert(monster.state, 0.08 * dt);
    return;
  }

  if (monster.action) {
    monster.stepAttack(dt, human, isPlayerGuarding());
    return;
  }

  if (monster.reactionTimer > 0 || monster.isGroundedDown()) return;

  monsterDecisionTimer -= dt;
  if (distance > 1.65) {
    if (monsterDecisionTimer <= 0 && distance > 3.0 && monsterAttackIndex % 3 === 2) {
      monster.startAttack(MONSTER_ATTACKS.charge);
      monsterAttackIndex += 1;
      monsterDecisionTimer = 0.72;
      return;
    }
    monster.vx += (monster.facing * 2.15 * capabilitySpeed(monster.state) - monster.vx) * Math.min(1, dt * 7);
    exert(monster.state, 0.06 * dt);
  } else if (monsterDecisionTimer <= 0) {
    const attack = monsterAttackIndex % 2 === 0 ? MONSTER_ATTACKS.swipe : MONSTER_ATTACKS.bite;
    monster.startAttack(attack);
    monsterAttackIndex += 1;
    monsterDecisionTimer = 0.46 + monster.state.fatigue * 0.35;
  } else if (human.action && distance < 1.45 && monsterAttackIndex % 3 === 1) {
    monster.bracing = true;
    monster.state.posture = 'CROUCHED';
  }
}

function separateBodies() {
  if (human.isGroundedDown() || monster.isGroundedDown()) return;
  const dx = monster.x - human.x;
  const minimum = 1.08;
  if (Math.abs(dx) < minimum) {
    const push = (minimum - Math.abs(dx)) * 0.5;
    const sign = dx >= 0 ? 1 : -1;
    human.x -= push * sign;
    monster.x += push * sign;
  }
}

function addCombatLog(attacker, target, action, result) {
  const guardText = result.guarded ? ' · guarded' : '';
  const line = `${attacker.kind === 'human' ? 'HUMAN' : 'MONSTER'} ${action.name} → ${result.targetPart.replaceAll('_', ' ')} → ${result.reaction}${guardText}`;
  logLines.unshift(line);
  if (logLines.length > 4) logLines.pop();
  renderLog();
}

function renderLog() {
  document.getElementById('combat-log').innerHTML = logLines.map((line) => `<div>${line}</div>`).join('');
}

function flashImpact(x, y, guarded) {
  const marker = document.createElement('div');
  marker.className = `impact-flash ${guarded ? 'guarded' : ''}`;
  const screen = camera.camera.worldToScreen(new pc.Vec3(x, y + GROUND_Y + 1.5, 0));
  marker.style.left = `${screen.x}px`;
  marker.style.top = `${screen.y}px`;
  document.getElementById('fx-layer').appendChild(marker);
  setTimeout(() => marker.remove(), 240);
}

function updatePanel(prefix, actor, showWeakest = true) {
  const labels = statusLabels(actor.state);
  document.getElementById(`${prefix}-consciousness`).textContent = labels.consciousness;
  document.getElementById(`${prefix}-breathing`).textContent = labels.breathing;
  document.getElementById(`${prefix}-fatigue`).textContent = labels.fatigue;
  document.getElementById(`${prefix}-balance`).textContent = labels.balance;
  document.getElementById(`${prefix}-movement`).textContent = labels.movement;
  document.getElementById(`${prefix}-combat`).textContent = labels.combat;
  if (showWeakest) {
    const weak = weakestPart(actor.state);
    document.getElementById(`${prefix}-weak`).textContent = `${weak.name.replaceAll('_', ' ')} · ${weak.function > 0.82 ? 'functional' : weak.function > 0.55 ? 'stressed' : weak.function > 0.25 ? 'impaired' : 'non-functional'}`;
  }
}

function checkMatchEnd() {
  if (matchOver) return;
  if (human.state.incapacitated) {
    finishMatch('HUMAN INCAPACITATED', 'The body can no longer continue the fight.');
  } else if (monster.state.incapacitated) {
    finishMatch('MONSTER INCAPACITATED', 'No HP reached zero — physical capability collapsed.');
  } else if (monster.retreating && (monster.x > ARENA_RIGHT - 0.65 || monster.x < ARENA_LEFT + 0.65)) {
    finishMatch('MONSTER RETREATED', 'Pain and mobility loss made retreat the better survival action.');
  }
}

function finishMatch(title, detail) {
  matchOver = true;
  matchResult = title;
  const result = document.getElementById('result');
  result.querySelector('strong').textContent = title;
  result.querySelector('span').textContent = detail;
  result.classList.add('show');
}

function restartMatch() {
  human.reset(HUMAN_X);
  monster.reset(MONSTER_X);
  monsterDecisionTimer = 0.35;
  monsterAttackIndex = 0;
  matchOver = false;
  matchResult = '';
  commands.length = 0;
  held.clear();
  logLines.length = 0;
  renderLog();
  document.getElementById('result').classList.remove('show');
}

function updateStatusUI() {
  updatePanel('human', human);
  updatePanel('monster', monster);
  document.getElementById('monster-mode').textContent = monster.retreating ? 'RETREATING' : monster.bracing ? 'BRACING' : monster.action?.name || 'OBSERVING';
  document.getElementById('human-mode').textContent = isPlayerGuarding() ? 'GUARD' : human.action?.name || human.state.reaction || 'READY';
}

let accumulator = 0;
const FIXED_DT = 1 / 60;
app.on('update', (frameDt) => {
  const dt = Math.min(frameDt, 0.05);
  accumulator += dt;
  elapsed += dt;

  while (accumulator >= FIXED_DT) {
    const activityHuman = Math.min(1, Math.abs(human.vx) / 3.5 + (human.action ? 0.35 : 0));
    const activityMonster = Math.min(1, Math.abs(monster.vx) / 4.8 + (monster.action ? 0.35 : 0));

    human.stepTimers(FIXED_DT);
    monster.stepTimers(FIXED_DT);
    if (!matchOver) {
      playerStep(FIXED_DT);
      monsterStep(FIXED_DT);
    }

    recoverPhysicalState(human.state, FIXED_DT, activityHuman);
    recoverPhysicalState(monster.state, FIXED_DT, activityMonster);
    human.integrate(FIXED_DT);
    monster.integrate(FIXED_DT);
    separateBodies();
    checkMatchEnd();
    accumulator -= FIXED_DT;
  }

  human.syncVisual(elapsed);
  monster.syncVisual(elapsed);

  uiTimer -= dt;
  if (uiTimer <= 0) {
    updateStatusUI();
    uiTimer = 0.09;
  }
});

updateStatusUI();

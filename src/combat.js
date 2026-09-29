export const HUMAN_BODY = ['HEAD', 'TORSO', 'LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG'];
export const QUADRUPED_BODY = ['HEAD', 'TORSO', 'FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG', 'TAIL'];

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function makePart(name) {
  return {
    name,
    function: 1,
    pain: 0,
    load: 0,
    mobility: 1,
    control: 1
  };
}

export function createPhysicalState({ id, kind, mass, stabilityBase, bodySchema }) {
  return {
    id,
    kind,
    mass,
    stabilityBase,
    consciousness: 1,
    breathing: 0,
    fatigue: 0,
    pain: 0,
    balance: 1,
    posture: kind === 'monster' ? 'STANDING' : 'UPRIGHT',
    reaction: 'READY',
    momentum: { vx: 0, vy: 0 },
    bodyParts: Object.fromEntries(bodySchema.map((name) => [name, makePart(name)])),
    movementCapability: 'NORMAL',
    combatCapability: 'HIGH',
    incapacitated: false
  };
}

export function createHumanState(id = 'human') {
  return createPhysicalState({ id, kind: 'human', mass: 78, stabilityBase: 0.72, bodySchema: HUMAN_BODY });
}

export function createMonsterState(id = 'monster') {
  return createPhysicalState({ id, kind: 'monster', mass: 245, stabilityBase: 0.94, bodySchema: QUADRUPED_BODY });
}

export function exert(state, intensity) {
  const effort = clamp(intensity);
  state.breathing = clamp(state.breathing + effort * 0.18);
  state.fatigue = clamp(state.fatigue + effort * 0.045);
}

export function recoverPhysicalState(state, dt, activity = 0) {
  const active = clamp(activity);
  const breathRecovery = 0.22 * (1 - active * 0.75);
  const fatigueRecovery = 0.018 * (1 - active * 0.7);

  state.breathing = clamp(state.breathing - breathRecovery * dt + active * 0.025 * dt);
  state.fatigue = clamp(state.fatigue - fatigueRecovery * dt + active * 0.006 * dt);
  state.pain = clamp(state.pain - 0.003 * dt);

  if (!['DOWN', 'FALLING', 'UNCONSCIOUS'].includes(state.posture)) {
    const legSupport = getSupportFunction(state);
    const recovery = 0.34 * state.stabilityBase * legSupport * (1 - state.fatigue * 0.55);
    state.balance = clamp(state.balance + recovery * dt);
  }

  for (const part of Object.values(state.bodyParts)) {
    part.pain = clamp(part.pain - 0.002 * dt);
    part.load = Math.max(0, part.load - 0.012 * dt);
  }

  projectCapabilities(state);
}

function getSupportParts(state) {
  const names = state.kind === 'monster'
    ? ['FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG', 'REAR_LEFT_LEG', 'REAR_RIGHT_LEG']
    : ['LEFT_LEG', 'RIGHT_LEG'];
  return names.map((name) => state.bodyParts[name]).filter(Boolean);
}

function getAttackParts(state) {
  const names = state.kind === 'monster'
    ? ['HEAD', 'FRONT_LEFT_LEG', 'FRONT_RIGHT_LEG']
    : ['LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG'];
  return names.map((name) => state.bodyParts[name]).filter(Boolean);
}

export function getSupportFunction(state) {
  const parts = getSupportParts(state);
  if (!parts.length) return 0;
  return parts.reduce((sum, part) => sum + part.function, 0) / parts.length;
}

function getAttackFunction(state) {
  const parts = getAttackParts(state);
  if (!parts.length) return 0;
  return parts.reduce((sum, part) => sum + part.function, 0) / parts.length;
}

function partLoadMultiplier(partName) {
  if (partName.includes('LEG')) return 1.35;
  if (partName.includes('ARM')) return 1.05;
  if (partName === 'HEAD') return 0.7;
  return 0.8;
}

export function resolveImpact({
  attacker,
  target,
  targetPart,
  relativeSpeed,
  effectiveMass,
  direction = 1,
  guarded = false,
  contactQuality = 1
}) {
  const part = target.bodyParts[targetPart] || target.bodyParts.TORSO;
  const speed = Math.max(0, relativeSpeed);
  const quality = clamp(contactQuality);
  const rawImpulse = Math.max(0, effectiveMass) * speed * quality;

  // A guard redirects and absorbs part of the impulse, but never deletes it.
  const transmittedImpulse = rawImpulse * (guarded ? 0.45 : 1);
  const balanceContext = 0.58 + target.balance * 0.42;
  const resistance = target.mass * (0.65 + target.stabilityBase * 0.65) * balanceContext * 4.5;
  const severity = resistance > 0 ? transmittedImpulse / resistance : 0;

  const localPain = clamp(severity * (guarded ? 0.22 : 0.36), 0, 0.7);
  const globalPain = clamp(severity * (guarded ? 0.08 : 0.14), 0, 0.45);
  part.pain = clamp(part.pain + localPain);
  part.load = clamp(part.load + severity * partLoadMultiplier(part.name), 0, 2.5);
  target.pain = clamp(target.pain + globalPain);

  const functionStress = Math.max(0, part.load - 0.42);
  part.function = clamp(1 - functionStress * 0.52);
  part.mobility = clamp(part.function - part.pain * 0.12);
  part.control = clamp(part.function - part.pain * 0.18);

  if (part.name === 'HEAD') {
    target.consciousness = clamp(target.consciousness - severity * (guarded ? 0.08 : 0.3));
  } else {
    target.consciousness = clamp(target.consciousness - severity * 0.018);
  }

  if (part.name === 'TORSO') {
    target.breathing = clamp(target.breathing + severity * (guarded ? 0.12 : 0.32));
  }

  const balanceLoss = severity * (guarded ? 0.52 : 0.86);
  target.balance = clamp(target.balance - balanceLoss);
  target.momentum.vx += direction * severity * 2.6;

  let reaction = 'NONE';
  if (target.consciousness <= 0.08) {
    reaction = 'UNCONSCIOUS';
    target.posture = 'UNCONSCIOUS';
  } else if (target.balance <= 0.08 || severity >= 1.15) {
    reaction = 'KNOCKDOWN';
    target.posture = 'FALLING';
  } else if (severity >= 0.55) {
    reaction = 'HEAVY_STAGGER';
  } else if (severity >= 0.24) {
    reaction = 'STAGGER';
  } else if (severity >= 0.08) {
    reaction = 'FLINCH';
  }

  target.reaction = reaction;
  projectCapabilities(target);

  return {
    rawImpulse,
    transmittedImpulse,
    severity,
    guarded,
    targetPart: part.name,
    reaction,
    balanceAfter: target.balance,
    consciousnessAfter: target.consciousness,
    functionAfter: part.function,
    knockback: severity * (guarded ? 1.6 : 2.8)
  };
}

export function projectCapabilities(state) {
  const supportParts = getSupportParts(state);
  const support = getSupportFunction(state);
  const weakestSupport = supportParts.length ? Math.min(...supportParts.map((part) => part.function)) : 0;
  const movementScore = clamp(
    support * 0.45 + weakestSupport * 0.25 + state.consciousness * 0.15 + state.balance * 0.15 - state.fatigue * 0.25
  );

  if (movementScore < 0.13) state.movementCapability = 'IMMOBILE';
  else if (movementScore < 0.3) state.movementCapability = 'CRAWLING';
  else if (movementScore < 0.52) state.movementCapability = 'LIMPING';
  else if (movementScore < 0.76) state.movementCapability = 'LIMITED';
  else state.movementCapability = 'NORMAL';

  const combatScore = clamp(
    state.consciousness * 0.34 +
    getAttackFunction(state) * 0.25 +
    state.balance * 0.2 +
    (1 - state.fatigue) * 0.21
  );

  if (combatScore < 0.12) state.combatCapability = 'NONE';
  else if (combatScore < 0.34) state.combatCapability = 'CRITICAL';
  else if (combatScore < 0.58) state.combatCapability = 'LOW';
  else if (combatScore < 0.8) state.combatCapability = 'MEDIUM';
  else state.combatCapability = 'HIGH';

  state.incapacitated = state.consciousness <= 0.08 ||
    (state.movementCapability === 'IMMOBILE' && state.combatCapability === 'NONE');

  return { movementScore, combatScore };
}

export function statusLabels(state) {
  const consciousness = state.consciousness > 0.82 ? 'Alert'
    : state.consciousness > 0.62 ? 'Shaken'
      : state.consciousness > 0.38 ? 'Dazed'
        : state.consciousness > 0.08 ? 'Barely responsive' : 'Unconscious';

  const breathing = state.breathing < 0.2 ? 'Calm'
    : state.breathing < 0.45 ? 'Elevated'
      : state.breathing < 0.7 ? 'Heavy'
        : state.breathing < 0.9 ? 'Gasping' : 'Overloaded';

  const fatigue = state.fatigue < 0.2 ? 'Fresh'
    : state.fatigue < 0.45 ? 'Active'
      : state.fatigue < 0.68 ? 'Tired'
        : state.fatigue < 0.88 ? 'Heavy' : 'Exhausted';

  const balance = state.balance > 0.8 ? 'Stable'
    : state.balance > 0.58 ? 'Shifted'
      : state.balance > 0.32 ? 'Unstable'
        : state.balance > 0.08 ? 'Critical' : 'Down';

  return {
    consciousness,
    breathing,
    fatigue,
    balance,
    movement: state.movementCapability,
    combat: state.combatCapability
  };
}

export function weakestPart(state) {
  return Object.values(state.bodyParts)
    .slice()
    .sort((a, b) => a.function - b.function || b.pain - a.pain)[0];
}

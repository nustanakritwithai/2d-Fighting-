export const ASSET_SOURCES = {
  human: {
    title: 'MV Platformer Male — ninja composite',
    url: 'https://raw.githubusercontent.com/AbstractEyes/pyoneer-engine/main/data/reference/sprites/moikmellah_mv_platformer_male/full/ninja_full.png',
    frameWidth: 32,
    frameHeight: 64,
    sheetWidth: 320,
    sheetHeight: 640
  },
  monster: {
    title: 'Wolfman combat sheet',
    url: 'https://raw.githubusercontent.com/tomkuttler/Clash-Perpetuation/main/Clash%20Perpetuation/images/enemys/wolfman.png',
    frameWidth: 64,
    frameHeight: 64,
    sheetWidth: 576,
    sheetHeight: 1408
  }
};

function clampIndex(value, max) {
  return Math.max(0, Math.min(max, Math.floor(value)));
}

export function configureSpriteElement(element, kind) {
  const source = ASSET_SOURCES[kind];
  element.style.width = source.frameWidth + 'px';
  element.style.height = source.frameHeight + 'px';
  element.style.backgroundImage = `url("${source.url}")`;
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundSize = `${source.sheetWidth}px ${source.sheetHeight}px`;
  element.dataset.asset = kind;
}

export function humanFrame(actor, time) {
  if (actor.state.posture === 'UNCONSCIOUS' || actor.state.posture === 'DOWN') {
    return { col: 4, row: 5, rotation: actor.facing * -72, hurt: true };
  }
  if (actor.state.posture === 'GETTING_UP') {
    return { col: 8, row: 1, rotation: actor.facing * -18 };
  }
  if (actor.state.posture === 'GUARD') {
    return { col: 9, row: 2 };
  }
  if (actor.reactionTimer > 0 || ['FLINCH', 'STAGGER', 'HEAVY_STAGGER'].includes(actor.state.reaction)) {
    const frame = Math.floor(time * 12) % 2;
    return { col: 1 + frame, row: 1, hurt: true };
  }
  if (actor.action?.name === 'PUNCH') {
    const phase = actor.action.duration > 0 ? actor.action.time / actor.action.duration : 0;
    return { col: 7 + (phase > 0.48 ? 1 : 0), row: 2 };
  }
  if (actor.action?.name === 'LOW KICK') {
    const phase = actor.action.duration > 0 ? actor.action.time / actor.action.duration : 0;
    return { col: 4 + clampIndex(phase * 3, 2), row: 2 };
  }
  if (actor.action?.name === 'DODGE') {
    const phase = actor.action.duration > 0 ? actor.action.time / actor.action.duration : 0;
    return { col: 7 + clampIndex(phase * 3, 2), row: 0, rotation: actor.facing * -8 };
  }
  if (Math.abs(actor.vx) > 0.18) {
    return { col: 1 + (Math.floor(time * 11) % 6), row: 0 };
  }
  return { col: 0, row: 0 };
}

export function monsterFrame(actor, time) {
  const facingRight = actor.facing >= 0;

  if (actor.state.posture === 'UNCONSCIOUS' || actor.state.posture === 'DOWN') {
    return {
      col: clampIndex((actor.downTimer < 900 ? (1.5 - actor.downTimer) : 1) * 5, 5),
      row: 21,
      rotation: facingRight ? -7 : 7,
      hurt: true
    };
  }

  if (actor.reactionTimer > 0 || ['FLINCH', 'STAGGER', 'HEAVY_STAGGER'].includes(actor.state.reaction)) {
    return {
      col: Math.floor(time * 10) % 2,
      row: facingRight ? 9 : 10,
      rotation: facingRight ? -10 : 10,
      hurt: true
    };
  }

  if (actor.action && !actor.action.dodge) {
    const phase = actor.action.duration > 0 ? actor.action.time / actor.action.duration : 0;
    return {
      col: clampIndex(phase * 6, 5),
      row: facingRight ? 13 : 14,
      rotation: actor.action.name === 'CHARGE' ? (facingRight ? -9 : 9) : 0
    };
  }

  if (Math.abs(actor.vx) > 0.12 || actor.retreating) {
    return {
      col: Math.floor(time * 12) % 9,
      row: facingRight ? 9 : 10
    };
  }

  return { col: 0, row: facingRight ? 9 : 10 };
}

export function drawSpriteFrame(element, kind, frame, {
  left,
  top,
  scale,
  facing = 1,
  opacity = 1
}) {
  const source = ASSET_SOURCES[kind];
  element.style.left = left + 'px';
  element.style.top = top + 'px';
  element.style.backgroundPosition = `${-frame.col * source.frameWidth}px ${-frame.row * source.frameHeight}px`;
  element.style.opacity = String(opacity);

  const flip = kind === 'human' && facing < 0 ? -1 : 1;
  const rotation = frame.rotation || 0;
  element.style.transform = `translate(-50%, -100%) scale(${scale * flip}, ${scale}) rotate(${rotation}deg)`;
  element.classList.toggle('hurt', Boolean(frame.hurt));
}

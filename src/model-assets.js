export const VISUAL_ASSETS = {
  human: {
    id: 'quaternius-modular-punk',
    title: 'Ultimate Modular Men — Punk',
    url: './assets/quaternius/fighter.glb',
    author: 'Quaternius',
    license: 'CC0 1.0',
    source: 'https://quaternius.com/packs/ultimatemodularcharacters.html',
    scale: 1,
    yaw: 90
  },
  monster: {
    id: 'quaternius-orc',
    title: 'Orc',
    url: './assets/quaternius/orc.glb',
    author: 'Quaternius',
    license: 'CC0 1.0',
    source: 'https://poly.pizza/m/5vO2YJsPEf',
    scale: 0.68,
    yaw: 90
  }
};

function tuneRenderHierarchy(entity) {
  for (const render of entity.findComponents('render')) {
    render.castShadows = true;
    render.receiveShadows = true;
    for (const meshInstance of render.meshInstances || []) {
      meshInstance.castShadow = true;
      meshInstance.receiveShadow = true;
    }
  }
}

export function createVisualHost(app, kind) {
  const root = new pc.Entity(kind === 'human' ? 'HumanVisualHost' : 'MonsterVisualHost');
  const modelMotion = new pc.Entity(kind === 'human' ? 'HumanModelMotion' : 'MonsterModelMotion');
  root.addChild(modelMotion);
  app.root.addChild(root);

  const handle = {
    kind,
    root,
    modelMotion,
    model: null,
    ready: false,
    failed: false,
    error: null
  };

  const config = VISUAL_ASSETS[kind];
  app.assets.loadFromUrl(config.url, 'container', (err, asset) => {
    if (err || !asset?.resource) {
      handle.failed = true;
      handle.error = err || new Error('missing model resource');
      console.error('[visual-assets] failed to load', kind, handle.error);
      return;
    }

    const model = asset.resource.instantiateRenderEntity({
      castShadows: true,
      receiveShadows: true
    });
    model.name = config.title;
    model.setLocalScale(config.scale, config.scale, config.scale);
    model.setLocalEulerAngles(0, config.yaw, 0);
    tuneRenderHierarchy(model);
    modelMotion.addChild(model);
    handle.model = model;
    handle.ready = true;
    console.info('[visual-assets] loaded', kind, config.title);
  });

  return handle;
}

export function updateVisualMotion(handle, actor, time) {
  if (!handle) return;

  let x = 0;
  let y = 0;
  let zTilt = 0;
  let scale = 1;

  const down = actor.state.posture === 'DOWN' || actor.state.posture === 'UNCONSCIOUS';
  const gettingUp = actor.state.posture === 'GETTING_UP';
  const speed = Math.abs(actor.vx);

  if (!down && !gettingUp) {
    const step = Math.sin(time * (7.5 + Math.min(5, speed * 1.4)));
    y += Math.abs(step) * Math.min(0.035, speed * 0.012);
  }

  if (handle.kind === 'human') {
    scale += Math.sin(time * 4.5) * 0.006 * (0.25 + actor.state.breathing);

    if (actor.state.posture === 'GUARD') {
      zTilt = -actor.facing * 5;
      x = -actor.facing * 0.035;
    }

    if (actor.action?.name === 'PUNCH') {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      const arc = Math.sin(p * Math.PI);
      x = actor.facing * arc * 0.16;
      zTilt = -actor.facing * arc * 7;
    } else if (actor.action?.name === 'LOW KICK') {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      const arc = Math.sin(p * Math.PI);
      x = actor.facing * arc * 0.12;
      y += arc * 0.05;
      zTilt = actor.facing * arc * 10;
    } else if (actor.action?.name === 'DODGE') {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      zTilt = actor.facing * Math.sin(p * Math.PI) * 13;
    }
  } else {
    scale += Math.sin(time * 3.1) * 0.01 * (0.2 + actor.state.breathing);

    if (actor.bracing) {
      scale *= 0.96;
      y -= 0.05;
      zTilt = actor.facing * 4;
    }

    if (actor.action && !actor.action.dodge) {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      const arc = Math.sin(p * Math.PI);
      x = actor.facing * arc * (actor.action.name === 'CHARGE' ? 0.2 : 0.12);
      zTilt = -actor.facing * arc * (actor.action.name === 'CHARGE' ? 9 : 6);
    }
  }

  if (down) {
    y = 0.12;
    zTilt = -actor.facing * (handle.kind === 'human' ? 78 : 70);
  } else if (gettingUp) {
    zTilt = -actor.facing * 28;
    y = 0.04;
  }

  handle.modelMotion.setLocalPosition(x, y, 0);
  handle.modelMotion.setLocalEulerAngles(0, 0, zTilt);
  handle.modelMotion.setLocalScale(scale, scale, scale);
}

export function assetSummary() {
  return Object.fromEntries(
    Object.entries(VISUAL_ASSETS).map(([kind, asset]) => [
      kind,
      {
        id: asset.id,
        title: asset.title,
        author: asset.author,
        license: asset.license,
        source: asset.source
      }
    ])
  );
}

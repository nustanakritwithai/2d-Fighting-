import * as pc from 'playcanvas';

export const VISUAL_ASSETS = {
  human: {
    id: 'quaternius-modular-punk',
    title: 'Ultimate Modular Men — Punk',
    url: './assets/quaternius/fighter.glb',
    author: 'Quaternius',
    license: 'CC0 1.0',
    source: 'https://quaternius.com/packs/ultimatemodularcharacters.html',
    scale: 1,
    yaw: 90,
    animations: {}
  },
  monster: {
    id: 'quaternius-orc',
    title: 'Orc',
    url: './assets/quaternius/orc.glb',
    author: 'Quaternius',
    license: 'CC0 1.0',
    source: 'https://poly.pizza/m/5vO2YJsPEf',
    scale: 0.68,
    yaw: 90,
    animations: {
      Idle: { clip: 'CharacterArmature|Idle', speed: 0.9, loop: true },
      Run: { clip: 'CharacterArmature|Run', speed: 1.2, loop: true },
      Attack: { clip: 'CharacterArmature|Punch', speed: 2.15, loop: false },
      Hit: { clip: 'CharacterArmature|HitReact', speed: 1.8, loop: false },
      Brace: { clip: 'CharacterArmature|Duck', speed: 1, loop: true },
      Death: { clip: 'CharacterArmature|Death', speed: 1.15, loop: false }
    }
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

function findTrack(tracks, requestedName) {
  const exact = tracks.find((track) => track?.name === requestedName);
  if (exact) return exact;

  const suffix = requestedName.split('|').pop()?.toLowerCase();
  return tracks.find((track) => track?.name?.toLowerCase().endsWith(`|${suffix}`)) || null;
}

function configureAnimations(handle, model, resource, config) {
  const tracks = Array.isArray(resource?.animations) ? resource.animations : [];
  if (!tracks.length || !config.animations || !Object.keys(config.animations).length) return;

  model.addComponent('anim', {
    activate: true,
    speed: 1
  });

  for (const [stateName, def] of Object.entries(config.animations)) {
    const track = findTrack(tracks, def.clip);
    if (!track) {
      console.warn('[visual-assets] missing clip', handle.kind, def.clip);
      continue;
    }

    model.anim.assignAnimation(
      stateName,
      track,
      undefined,
      def.speed ?? 1,
      def.loop ?? true
    );
    handle.animationStates.add(stateName);
  }

  handle.animationReady = handle.animationStates.has('Idle');
  if (handle.animationReady) {
    handle.animationState = 'Idle';
    model.anim.baseLayer.transition('Idle', 0);
  }
}

function transitionAnimation(handle, stateName, blend = 0.09) {
  if (!handle.animationReady || !handle.model?.anim) return;
  if (!handle.animationStates.has(stateName)) return;
  if (handle.animationState === stateName) return;

  handle.animationState = stateName;
  handle.model.anim.baseLayer.transition(stateName, blend);
}

function desiredAnimationState(handle, actor) {
  if (!handle.animationReady) return null;

  const down = actor.state.posture === 'DOWN' || actor.state.posture === 'UNCONSCIOUS';
  if (down) return 'Death';

  if (
    actor.reactionTimer > 0 ||
    ['FLINCH', 'STAGGER', 'HEAVY_STAGGER'].includes(actor.state.reaction)
  ) {
    return 'Hit';
  }

  if (actor.bracing && handle.animationStates.has('Brace')) return 'Brace';
  if (actor.action && !actor.action.dodge && handle.animationStates.has('Attack')) return 'Attack';
  if ((Math.abs(actor.vx) > 0.16 || actor.retreating) && handle.animationStates.has('Run')) return 'Run';
  return 'Idle';
}

export function createVisualHost(app, kind) {
  const root = new pc.Entity(kind === 'human' ? 'HumanVisualHost' : 'MonsterVisualHost');
  const modelMotion = new pc.Entity(kind === 'human' ? 'HumanModelMotion' : 'MonsterModelMotion');
  root.addChild(modelMotion);
  app.root.addChild(root);

  const placeholder = new pc.Entity(kind === 'human' ? 'HumanLoadingSilhouette' : 'MonsterLoadingSilhouette');
  placeholder.addComponent('render', { type: 'capsule' });
  placeholder.setLocalPosition(0, kind === 'human' ? 0.9 : 0.72, 0);
  placeholder.setLocalScale(
    kind === 'human' ? 0.48 : 0.72,
    kind === 'human' ? 1.55 : 1.25,
    0.42
  );

  const placeholderMaterial = new pc.StandardMaterial();
  placeholderMaterial.diffuse = kind === 'human'
    ? new pc.Color(0.14, 0.26, 0.34)
    : new pc.Color(0.34, 0.12, 0.09);
  placeholderMaterial.emissive = kind === 'human'
    ? new pc.Color(0.015, 0.035, 0.05)
    : new pc.Color(0.05, 0.012, 0.01);
  placeholderMaterial.gloss = 0.08;
  placeholderMaterial.update();
  placeholder.render.material = placeholderMaterial;
  modelMotion.addChild(placeholder);

  const handle = {
    kind,
    root,
    modelMotion,
    placeholder,
    model: null,
    ready: false,
    failed: false,
    error: null,
    animationReady: false,
    animationState: null,
    animationStates: new Set()
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
    configureAnimations(handle, model, asset.resource, config);

    placeholder.enabled = false;
    handle.model = model;
    handle.ready = true;

    console.info('[visual-assets] loaded', kind, {
      title: config.title,
      animations: [...handle.animationStates]
    });
  });

  return handle;
}

export function updateVisualMotion(handle, actor, time) {
  if (!handle) return;

  const nativeState = desiredAnimationState(handle, actor);
  if (nativeState) {
    const blend = nativeState === 'Hit' || nativeState === 'Attack' ? 0.045 : 0.11;
    transitionAnimation(handle, nativeState, blend);
  }

  let x = 0;
  let y = 0;
  let zTilt = 0;
  let scale = 1;

  zTilt += (1 - actor.state.balance) * (handle.kind === 'human' ? 10 : 5) * -actor.facing;

  const down = actor.state.posture === 'DOWN' || actor.state.posture === 'UNCONSCIOUS';
  const gettingUp = actor.state.posture === 'GETTING_UP';
  const speed = Math.abs(actor.vx);

  if (!down && !gettingUp && !handle.animationReady) {
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
    scale += Math.sin(time * 3.1) * 0.006 * (0.2 + actor.state.breathing);

    if (actor.bracing) {
      scale *= 0.97;
      y -= 0.035;
    }

    if (actor.action?.name === 'CHARGE') {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      const arc = Math.sin(p * Math.PI);
      x = actor.facing * arc * 0.18;
      zTilt = -actor.facing * arc * 5;
    } else if (!handle.animationReady && actor.action && !actor.action.dodge) {
      const p = Math.min(1, actor.action.time / actor.action.duration);
      const arc = Math.sin(p * Math.PI);
      x = actor.facing * arc * 0.12;
      zTilt = -actor.facing * arc * 6;
    }
  }

  if (down) {
    if (!handle.animationReady) {
      y = 0.12;
      zTilt = -actor.facing * (handle.kind === 'human' ? 78 : 70);
    }
  } else if (gettingUp && !handle.animationReady) {
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
        source: asset.source,
        clips: Object.values(asset.animations || {}).map((entry) => entry.clip)
      }
    ])
  );
}

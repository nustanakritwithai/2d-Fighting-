import * as pc from 'playcanvas';

export const STAGE_ASSETS = {
  roundTree: {
    title: 'Round-canopy Tree',
    url: './assets/quaternius/stage/round-tree.glb',
    author: 'Quaternius',
    license: 'CC0 1.0'
  },
  broadTree: {
    title: 'Broad-canopy Tree',
    url: './assets/quaternius/stage/broad-tree.glb',
    author: 'Quaternius',
    license: 'CC0 1.0'
  },
  rock: {
    title: 'Rock',
    url: './assets/quaternius/stage/rock.glb',
    author: 'Quaternius',
    license: 'CC0 1.0'
  },
  grassTall: {
    title: 'Tall Grass',
    url: './assets/quaternius/stage/grass-tall.glb',
    author: 'Quaternius',
    license: 'CC0 1.0'
  },
  grassTuft: {
    title: 'Grass Tuft',
    url: './assets/quaternius/stage/grass-tuft.glb',
    author: 'Quaternius',
    license: 'CC0 1.0'
  }
};

const PLACEMENTS = {
  roundTree: [
    [-6.3, 0, -3.25, 0.78, -18],
    [5.9, 0, -3.45, 0.7, 22]
  ],
  broadTree: [
    [-3.75, 0, -3.7, 0.62, 12],
    [3.2, 0, -3.78, 0.58, -14]
  ],
  rock: [
    [-6.65, 0.04, -0.95, 0.82, 12],
    [-5.15, 0.01, 1.05, 0.48, -22],
    [5.2, 0.03, 0.95, 0.62, 18],
    [6.62, 0.02, -1.0, 0.54, -8]
  ],
  grassTall: [
    [-6.9, 0, -1.45, 0.7, 4],
    [-4.95, 0, -1.7, 0.55, -12],
    [4.95, 0, -1.65, 0.62, 9],
    [6.85, 0, -1.42, 0.68, -5]
  ],
  grassTuft: [
    [-5.9, 0, -1.18, 0.64, -8],
    [-4.35, 0, -1.34, 0.52, 10],
    [-3.0, 0, -1.5, 0.46, -16],
    [3.0, 0, -1.5, 0.46, 16],
    [4.35, 0, -1.34, 0.52, -10],
    [5.9, 0, -1.18, 0.64, 8]
  ]
};

function tuneHierarchy(entity, castShadows = true) {
  for (const render of entity.findComponents('render')) {
    render.castShadows = castShadows;
    render.receiveShadows = true;

    for (const meshInstance of render.meshInstances || []) {
      meshInstance.castShadow = castShadows;
      meshInstance.receiveShadow = true;
    }
  }
}

function spawnInstances(parent, resource, key, groundY) {
  const placements = PLACEMENTS[key] || [];

  for (const [x, y, z, scale, yaw] of placements) {
    const host = new pc.Entity(`Stage:${key}`);
    host.setLocalPosition(x, groundY + y, z);
    host.setLocalScale(scale, scale, scale);
    host.setLocalEulerAngles(0, yaw, 0);

    const model = resource.instantiateRenderEntity({
      castShadows: key !== 'grassTall' && key !== 'grassTuft',
      receiveShadows: true
    });
    tuneHierarchy(model, key !== 'grassTall' && key !== 'grassTuft');

    host.addChild(model);
    parent.addChild(host);
  }
}

export function buildStageDressing(app, groundY) {
  const root = new pc.Entity('CC0StageDressing');
  app.root.addChild(root);

  const state = {
    root,
    loaded: new Set(),
    failed: new Map()
  };

  for (const [key, config] of Object.entries(STAGE_ASSETS)) {
    app.assets.loadFromUrl(config.url, 'container', (err, asset) => {
      if (err || !asset?.resource) {
        state.failed.set(key, err || new Error('missing stage asset'));
        console.error('[stage-assets] failed', key, state.failed.get(key));
        return;
      }

      spawnInstances(root, asset.resource, key, groundY);
      state.loaded.add(key);
      console.info('[stage-assets] loaded', key, config.title);
    });
  }

  return state;
}

export function stageAssetSummary() {
  return Object.fromEntries(
    Object.entries(STAGE_ASSETS).map(([key, asset]) => [
      key,
      {
        title: asset.title,
        author: asset.author,
        license: asset.license,
        placements: (PLACEMENTS[key] || []).length
      }
    ])
  );
}

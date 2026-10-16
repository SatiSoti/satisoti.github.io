/** Game adapter for immutable Comic Hatten art packs. No game-state mutations. */
import {loadGeneralPack} from './packs/general-v1.2.0/renderer.mjs';
import {loadCharacterPack} from './packs/v1.0.0/renderer.mjs';

const GENERAL_URL = new URL('./packs/general-v1.2.0/manifest.json', import.meta.url);
const SPECIAL_URL = new URL('./packs/v1.0.0/manifest.json', import.meta.url);
const PART_FIELDS = ['hairId', 'faceId', 'outfitId', 'hairColorId', 'outfitColorId'];
const ACTIONS = new Set(['idle', 'walk', 'work', 'cheer']);
const SURFACE = {width: 80, height: 76, x: 40, y: 70};

function descriptorKey(value) {
  if (!value || typeof value !== 'object') throw new Error('Avatar descriptor is required.');
  if (value.kind === 'specialist' && /^[a-z][a-z0-9_-]*$/.test(value.characterId || '')) return `specialist:${value.characterId}`;
  if (value.kind !== 'general' || !value.appearance || PART_FIELDS.some(k => typeof value.appearance[k] !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(value.appearance[k]))) throw new Error('Unknown avatar descriptor.');
  return `general:${PART_FIELDS.map(k => value.appearance[k]).join('|')}`;
}

/** Dependencies can be supplied by the native-Canvas verification harness. */
export function createAvatarArt({
  document: doc = globalThis.document,
  fetchImpl = globalThis.fetch,
  ImageClass = globalThis.Image,
  createCanvas = (w, h) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; return c; },
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis),
  ObserverClass = globalThis.IntersectionObserver,
  motionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
} = {}) {
  const manifests = new Map(), bundles = new Map(), entries = new Map(), surfaces = new Map();
  const records = new Set(), byCanvas = new WeakMap();
  let animationRequest = null, disposed = false;
  const reducedMotion = () => Boolean(motionQuery?.matches);

  function manifestAt(url) {
    if (!manifests.has(url.href)) manifests.set(url.href, (async () => {
      const response = await fetchImpl(url.href);
      if (!response.ok) throw new Error(`Avatar manifest HTTP ${response.status}.`);
      return response.json();
    })());
    return manifests.get(url.href);
  }

  async function bundleFor(descriptor) {
    if (descriptor.kind === 'specialist') {
      const key = `specialist:${descriptor.characterId}`;
      if (!bundles.has(key)) bundles.set(key, (async () => {
        const manifest = await manifestAt(SPECIAL_URL);
        const person = manifest.characters.find(p => p.id === descriptor.characterId);
        if (!person) throw new Error('Unknown specialist.');
        const subset = {...manifest, characters: [person]};
        const pack = await loadCharacterPack(SPECIAL_URL, {ImageClass, fetchImpl: async () => ({ok: true, url: SPECIAL_URL.href, json: async () => subset})});
        return {kind: 'specialist', pack};
      })());
      return bundles.get(key);
    }
    const manifest = await manifestAt(GENERAL_URL);
    const selected = Object.fromEntries(['hair', 'face', 'outfit'].map(type => {
      const part = manifest.parts[type].find(p => p.id === descriptor.appearance[`${type}Id`]);
      if (!part) throw new Error(`Unknown avatar ${type}.`);
      return [type, part];
    }));
    const key = ['general', ...Object.values(selected).map(p => p.assetId)].join(':');
    if (!bundles.has(key)) bundles.set(key, (async () => {
      // Only the three required atlases are loaded. Source pack files stay intact.
      const ids = new Set(Object.values(selected).map(p => p.assetId));
      const parts = Object.fromEntries(Object.entries(selected).map(([type, part]) => [type, manifest.parts[type].filter(p => p.assetId === part.assetId)]));
      const presets = manifest.presets.filter(p => Object.entries(parts).every(([type, list]) => list.some(part => part.id === p.appearance[`${type}Id`])));
      const subset = {...manifest, assets: manifest.assets.filter(a => ids.has(a.id)), parts,
        presets: presets.length ? presets : [{...manifest.presets[0], appearance: {...descriptor.appearance}}]};
      const pack = await loadGeneralPack(GENERAL_URL, {ImageClass, createCanvas, fetchImpl: async () => ({ok: true, url: GENERAL_URL.href, json: async () => subset})});
      return {kind: 'general', pack};
    })());
    return bundles.get(key);
  }

  function ensure(descriptor) {
    let key;
    try { key = descriptorKey(descriptor); } catch (error) { return Promise.resolve({state: 'error', error}); }
    if (entries.has(key)) return entries.get(key).promise;
    const entry = {key, descriptor: structuredClone(descriptor), state: 'loading', bundle: null, error: null};
    entries.set(key, entry);
    entry.promise = bundleFor(entry.descriptor).then(bundle => {
      if (bundle.kind === 'general') bundle.pack.validateAppearance(entry.descriptor.appearance);
      entry.bundle = bundle; entry.state = 'ready';
      // A paused game still needs one redraw when its asynchronous art arrives.
      doc?.dispatchEvent?.(new Event('comic-hatten:avatar-art-ready'));
      return entry;
    }).catch(error => { entry.state = 'error'; entry.error = error; return entry; });
    return entry.promise;
  }

  function surfaceFor(entry, action, seconds) {
    const {pack, kind} = entry.bundle, d = entry.descriptor;
    const frame = kind === 'general' ? pack.frameAt(action, seconds) : pack.frameAt(d.characterId, action, seconds).index;
    const key = `${entry.key}:${frame}`;
    if (surfaces.has(key)) { const result = surfaces.get(key); surfaces.delete(key); surfaces.set(key, result); return result; }
    const c = createCanvas(SURFACE.width, SURFACE.height), ctx = c.getContext('2d');
    const options = {action, time: seconds, x: SURFACE.x, y: SURFACE.y, scale: 1, shadow: false};
    if (kind === 'general') pack.draw(ctx, {...options, appearance: d.appearance});
    else pack.draw(ctx, {...options, id: d.characterId});
    surfaces.set(key, c);
    if (surfaces.size > 256) surfaces.delete(surfaces.keys().next().value);
    return c;
  }

  /** Synchronous; false means keep the game's fallback sprite this frame. */
  function draw(ctx, descriptor, {x = 0, y = 0, scale = 1, action = 'idle', time = 0, shadow = false, flip = false} = {}) {
    if (disposed || !ctx || !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    let key;
    try { key = descriptorKey(descriptor); } catch { return false; }
    const entry = entries.get(key);
    if (!entry) { void ensure(descriptor); return false; }
    if (entry.state !== 'ready') return false;
    try {
      const canvas = surfaceFor(entry, ACTIONS.has(action) ? action : 'idle', reducedMotion() ? 0 : Math.max(0, Number.isFinite(time) ? time : 0));
      ctx.save();
      try {
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(x), Math.round(y));
        if (shadow) { ctx.fillStyle = '#53402d22'; ctx.fillRect(-10 * scale, -scale, 20 * scale, 3 * scale); }
        ctx.scale(flip ? -scale : scale, scale);
        ctx.drawImage(canvas, -SURFACE.x, -SURFACE.y);
      } finally { ctx.restore(); }
      return true;
    } catch (error) { entry.state = 'error'; entry.error = error; return false; }
  }

  function fallback(record, failed = false) {
    const c = record.canvas, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#e8ede6'; ctx.fillRect(c.width * .2, c.height * .18, c.width * .6, c.height * .62);
    ctx.fillStyle = '#52695b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(12, Math.floor(c.width * .25))}px sans-serif`;
    ctx.fillText(Array.from(record.label || '人物').slice(0, 2).join(''), c.width / 2, c.height / 2);
    c.dataset.avatarState = failed ? 'error' : 'loading';
    c.title = failed ? `${record.label}（画像を読み込めませんでした。ゲームはそのまま遊べます）` : `${record.label}（画像を準備中）`;
  }

  function paint(record, time = 0) {
    if (!record.visible || !record.canvas.isConnected || record.state !== 'ready') return;
    const c = record.canvas, ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!draw(ctx, record.descriptor, {x: c.width / 2, y: c.height * .93, scale: Math.min(c.width / 58, c.height / 70), action: record.action, time, shadow: true, flip: record.flip})) {
      record.state = 'error'; fallback(record, true); return;
    }
    c.dataset.avatarState = 'ready'; c.title = record.label;
  }

  function scheduleAnimation() {
    if (animationRequest !== null || disposed || reducedMotion() || doc?.hidden || !requestFrame) return;
    if (!Array.from(records).some(r => r.visible && r.animate && r.state === 'ready' && r.canvas.isConnected)) return;
    animationRequest = requestFrame(tick);
  }

  function tick(now) {
    animationRequest = null;
    if (disposed || doc?.hidden || reducedMotion()) return;
    for (const record of records) {
      if (!record.canvas.isConnected) { observer?.unobserve(record.canvas); records.delete(record); continue; }
      if (record.visible && record.animate && record.state === 'ready') {
        // Pack animation speed is <= 8 FPS; avoid repainting on every display frame.
        const slot = Math.floor(now / 100);
        if (slot !== record.lastSlot) { record.lastSlot = slot; paint(record, now / 1000); }
      }
    }
    scheduleAnimation();
  }

  function activate(record) {
    record.visible = true;
    if (record.promise) { paint(record); scheduleAnimation(); return record.promise; }
    record.promise = ensure(record.descriptor).then(entry => {
      if (byCanvas.get(record.canvas) !== record) return;
      record.state = entry.state;
      if (entry.state === 'ready') paint(record);
      else fallback(record, true);
      scheduleAnimation();
    });
    return record.promise;
  }

  const observer = typeof ObserverClass === 'function' ? new ObserverClass(changes => {
    for (const change of changes) {
      const record = byCanvas.get(change.target);
      if (!record) continue;
      record.visible = change.isIntersecting;
      if (record.visible) void activate(record);
    }
  }, {rootMargin: '160px'}) : null;

  /** Call after replacing a view's innerHTML. No images load on text-only views. */
  async function refresh(root = doc) {
    if (disposed || !root) return;
    for (const record of records) if (!record.canvas.isConnected) { observer?.unobserve(record.canvas); records.delete(record); }
    const canvases = Array.from(root.querySelectorAll?.('canvas[data-avatar]') || []);
    if (root.matches?.('canvas[data-avatar]')) canvases.unshift(root);
    const pending = [];
    for (const canvas of canvases) {
      const signature = [canvas.dataset.avatar, canvas.dataset.avatarAction, canvas.dataset.avatarAnimate, canvas.dataset.avatarFlip, canvas.dataset.avatarLabel, canvas.width, canvas.height].join('\n');
      const old = byCanvas.get(canvas);
      if (old?.signature === signature) { if (old.visible) pending.push(activate(old)); continue; }
      if (old) { observer?.unobserve(canvas); records.delete(old); }
      const record = {canvas, signature, label: canvas.dataset.avatarLabel || '人物', action: ACTIONS.has(canvas.dataset.avatarAction) ? canvas.dataset.avatarAction : 'idle', animate: canvas.dataset.avatarAnimate === 'true', flip: canvas.dataset.avatarFlip === 'true', visible: !observer, state: 'loading', promise: null};
      byCanvas.set(canvas, record); records.add(record);
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', record.label);
      canvas.style.imageRendering = 'pixelated';
      try { record.descriptor = JSON.parse(canvas.dataset.avatar); descriptorKey(record.descriptor); }
      catch { record.state = 'error'; fallback(record, true); continue; }
      fallback(record);
      if (observer) {
        observer.observe(canvas);
        const rect = canvas.getBoundingClientRect();
        const height = doc?.documentElement?.clientHeight || globalThis.innerHeight || 800;
        if (rect.width > 0 && rect.height > 0 && rect.bottom >= -160 && rect.top <= height + 160) pending.push(activate(record));
      } else pending.push(activate(record));
    }
    await Promise.all(pending);
  }

  function resume() {
    if (reducedMotion() || doc?.hidden) {
      if (animationRequest !== null) cancelFrame?.(animationRequest);
      animationRequest = null;
      if (reducedMotion()) for (const record of records) paint(record, 0);
    } else scheduleAnimation();
  }
  doc?.addEventListener?.('visibilitychange', resume);
  motionQuery?.addEventListener?.('change', resume);

  return {
    draw, ensure, refresh,
    get status() { const values = Array.from(entries.values()); return {ready: values.filter(v => v.state === 'ready').length, loading: values.filter(v => v.state === 'loading').length, failed: values.filter(v => v.state === 'error').length, cachedFrames: surfaces.size, reducedMotion: reducedMotion()}; },
    dispose() { disposed = true; observer?.disconnect(); if (animationRequest !== null) cancelFrame?.(animationRequest); records.clear(); surfaces.clear(); doc?.removeEventListener?.('visibilitychange', resume); motionQuery?.removeEventListener?.('change', resume); }
  };
}

if (globalThis.document) {
  globalThis.CH = globalThis.CH || {};
  globalThis.CH.avatarArt = createAvatarArt();
  void globalThis.CH.avatarArt.refresh();
  globalThis.document.dispatchEvent(new Event('comic-hatten:avatar-art-ready'));
}

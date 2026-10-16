/**
 * Comic Hatten character pack renderer, v1.0.0.
 * No globals, dependencies, timers, pixel reads, or gameplay rules.
 * Coordinates are canvas pixels; (x, y) is the character's feet.
 * Time is elapsed seconds, owned independently by each caller/actor.
 */

const FORMAT = 'comic-hatten.character-pack';

function fail(message) {
  throw new Error(`[CharacterPack] ${message}`);
}

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} must be a finite number.`);
  return value;
}

function validateManifest(manifest) {
  if (!manifest || manifest.format !== FORMAT) fail(`Expected manifest format "${FORMAT}".`);
  if (manifest.schemaVersion !== '1.0.0') fail(`Unsupported schemaVersion: ${manifest.schemaVersion}.`);
  if (!Array.isArray(manifest.characters) || !manifest.characters.length) fail('characters must be a non-empty array.');
  const ids = new Set();
  for (const person of manifest.characters) {
    if (!person || typeof person.id !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/.test(person.id)) fail('Each character needs a stable, URL-safe id.');
    if (ids.has(person.id)) fail(`Duplicate character id: ${person.id}.`);
    ids.add(person.id);
    const sprite = person.sprite;
    if (!sprite || typeof sprite.image !== 'string' || !sprite.image || /^(?:[a-z]+:|\/)/i.test(sprite.image) || sprite.image.split('/').includes('..')) {
      fail(`${person.id}: sprite.image must be a relative path inside the pack.`);
    }
    for (const key of ['width', 'height']) {
      if (!Number.isInteger(sprite[key]) || sprite[key] <= 0) fail(`${person.id}: sprite.${key} must be a positive integer.`);
    }
    if (!Array.isArray(sprite.frames) || !sprite.frames.length) fail(`${person.id}: missing sprite.frames.`);
    const indices = new Set();
    for (const frame of sprite.frames) {
      if (!frame || !Number.isInteger(frame.index) || frame.index < 0 || indices.has(frame.index)) fail(`${person.id}: invalid or duplicate frame index.`);
      indices.add(frame.index);
      if (!Array.isArray(frame.rect) || frame.rect.length !== 4 || frame.rect.some(value => !Number.isInteger(value))) fail(`${person.id}: frame ${frame.index} needs an integer [x, y, width, height] rect.`);
      const [x, y, width, height] = frame.rect;
      if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > sprite.width || y + height > sprite.height) fail(`${person.id}: frame ${frame.index} is outside its sprite image.`);
      if (!Array.isArray(frame.anchor) || frame.anchor.length !== 2 || frame.anchor.some(value => typeof value !== 'number' || !Number.isFinite(value))) fail(`${person.id}: frame ${frame.index} needs a numeric [x, y] anchor.`);
      if (frame.anchor[0] < 0 || frame.anchor[0] > width || frame.anchor[1] < 0 || frame.anchor[1] > height) fail(`${person.id}: frame ${frame.index} anchor is outside its rect.`);
      if (finite(frame.renderHeight, `${person.id}: renderHeight`) <= 0) fail(`${person.id}: renderHeight must be positive.`);
      finite(frame.offsetY, `${person.id}: offsetY`);
    }
    if (!sprite.animations || typeof sprite.animations !== 'object') fail(`${person.id}: missing animations.`);
    for (const required of ['idle', 'walk', 'work', 'cheer']) {
      if (!Object.hasOwn(sprite.animations, required)) fail(`${person.id}: missing animation "${required}".`);
    }
    for (const [name, animation] of Object.entries(sprite.animations)) {
      if (!animation || !Array.isArray(animation.frames) || !animation.frames.length || animation.frames.some(index => !indices.has(index))) fail(`${person.id}: animation "${name}" references an invalid frame.`);
      if (finite(animation.fps, `${person.id}: ${name}.fps`) <= 0) fail(`${person.id}: ${name}.fps must be positive.`);
      if (typeof animation.loop !== 'boolean') fail(`${person.id}: ${name}.loop must be boolean.`);
    }
  }
}

function loadImage(url, person, ImageClass) {
  return new Promise((resolve, reject) => {
    const image = new ImageClass();
    image.onload = () => {
      image.onload = null;
      image.onerror = null;
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width !== person.sprite.width || height !== person.sprite.height) {
        reject(new Error(`[CharacterPack] ${person.id}: image size ${width}×${height} differs from manifest ${person.sprite.width}×${person.sprite.height}.`));
        return;
      }
      resolve(image);
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      reject(new Error(`[CharacterPack] Could not load image for ${person.id}: ${url}`));
    };
    image.src = url;
  });
}

/**
 * Fetch a manifest and its sprite images. Relative image paths resolve from
 * the manifest, so the entire directory can move without editing this code.
 * Serve the example over HTTP(S); browsers do not fetch local file:// JSON.
 */
export async function loadCharacterPack(manifestUrl, {
  fetchImpl = globalThis.fetch,
  ImageClass = globalThis.Image
} = {}) {
  if (typeof fetchImpl !== 'function') fail('A fetch implementation is required.');
  if (typeof ImageClass !== 'function') fail('An Image constructor is required.');
  if (!(typeof manifestUrl === 'string' || manifestUrl instanceof URL)) fail('manifestUrl must be a URL or string.');
  const base = globalThis.location?.href || import.meta.url;
  let resolved;
  try { resolved = new URL(manifestUrl, base); }
  catch { fail(`Invalid manifest URL: ${manifestUrl}`); }
  let response;
  try { response = await fetchImpl(resolved.href); }
  catch (error) { fail(`Could not fetch manifest (${resolved.href}). Use an HTTP(S) server, not file://. ${error?.message || ''}`); }
  if (!response.ok) fail(`Could not fetch manifest: HTTP ${response.status} (${resolved.href}).`);
  let manifest;
  try { manifest = await response.json(); }
  catch { fail(`Manifest is not valid JSON: ${resolved.href}`); }
  validateManifest(manifest);
  // Respect HTTP redirects without making asset paths depend on the page URL.
  const assetBase = response.url || resolved.href;
  const entries = await Promise.all(manifest.characters.map(async person => {
    const image = await loadImage(new URL(person.sprite.image, assetBase).href, person, ImageClass);
    return [person.id, { person, image, frames: new Map(person.sprite.frames.map(frame => [frame.index, frame])) }];
  }));
  const sheets = new Map(entries);

  function sheetById(id) {
    const sheet = sheets.get(id);
    if (!sheet) fail(`Unknown character id: ${String(id)}.`);
    return sheet;
  }

  function byId(id) {
    return sheetById(id).person;
  }

  /** Return the manifest frame selected for this action/time (seconds). */
  function frameAt(id, action = 'idle', time = 0) {
    const sheet = sheetById(id);
    if (!Object.hasOwn(sheet.person.sprite.animations, action)) fail(`${id}: unknown action "${String(action)}".`);
    const animation = sheet.person.sprite.animations[action];
    const seconds = Math.max(0, finite(time, 'time'));
    // Modulo before multiplication also keeps long-running clocks finite.
    const position = animation.loop
      ? Math.floor((seconds % (animation.frames.length / animation.fps)) * animation.fps)
      : Math.min(animation.frames.length - 1, Math.floor(seconds * animation.fps));
    return sheet.frames.get(animation.frames[Math.min(animation.frames.length - 1, position)]);
  }

  /** Draw one actor. This does not move it or advance its clock. */
  function draw(ctx, {
    id, action = 'idle', time = 0, x = 0, y = 0,
    scale = 1, flip = false, shadow = true
  } = {}) {
    if (!ctx || typeof ctx.drawImage !== 'function' || typeof ctx.save !== 'function' || typeof ctx.restore !== 'function') fail('draw requires a CanvasRenderingContext2D.');
    finite(x, 'x'); finite(y, 'y');
    if (finite(scale, 'scale') <= 0) fail('scale must be positive.');
    if (typeof flip !== 'boolean' || typeof shadow !== 'boolean') fail('flip and shadow must be boolean.');
    const sheet = sheetById(id);
    if (flip && !sheet.person.sprite.supportsHorizontalFlip) fail(`${id} does not support horizontal flipping.`);
    const frame = frameAt(id, action, time);
    const [sx, sy, sw, sh] = frame.rect;
    const ratio = frame.renderHeight / sh;
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      ctx.scale(scale, scale);
      if (shadow) {
        ctx.fillStyle = '#53402d22';
        ctx.fillRect(-11, -1, 22, 3);
      }
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(sheet.image, sx, sy, sw, sh,
        Math.round(-frame.anchor[0] * ratio),
        Math.round(-frame.anchor[1] * ratio + frame.offsetY),
        Math.round(sw * ratio), frame.renderHeight);
    } finally {
      ctx.restore();
    }
    return frame;
  }

  return { manifest, characters: manifest.characters, byId, draw, frameAt };
}

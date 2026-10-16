import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Run the real, shipped engine without its browser mount. No DOM replacement,
// network fetch, game RNG mock, or duplicate implementation of its economy.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'comic-hatten/index.html'), 'utf8');
const engine = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .map((m) => m[2]).find((source) => source.includes('C.newGame ='));
assert.ok(engine, 'the shipped inline game engine is present');
const plugin = fs.readFileSync(path.join(root, 'comic-hatten/avatars/game-avatars.js'), 'utf8');
const presentation = fs.readFileSync(path.join(root, 'comic-hatten/avatars/ui.js'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const withoutAvatar = (value) => JSON.parse(JSON.stringify(value, (key, v) =>
  key === 'avatar' || key === 'avatarState' ? undefined : v));

function loadGame(withPlugin = true) {
  const errors = [];
  const context = vm.createContext({ console: {
    log() {}, warn() {}, error(...args) { errors.push(args.map(String).join(' ')); },
  } });
  vm.runInContext(engine, context, { filename: 'comic-hatten/index.html', timeout: 10000 });
  if (withPlugin) {
    vm.runInContext(plugin, context, { filename: 'avatars/game-avatars.js', timeout: 10000 });
    vm.runInContext(presentation, context, { filename: 'avatars/ui.js', timeout: 10000 });
  }
  const CH = context.CH;
  assert.ok(CH?.core?.newGame);
  if (withPlugin) assert.ok(CH.avatars?.ensureWorld);
  return { CH, context, errors, world: (seed = 43127) => CH.core.newGame({ seed }) };
}

function avatarsOf(W) {
  const out = {};
  for (const [id, person] of Object.entries(W.authors)) out['author:' + id] = plain(person.avatar);
  for (const [id, person] of Object.entries(W.editors)) out['editor:' + id] = plain(person.avatar);
  for (const [id, pitch] of Object.entries(W.pitches)) if (pitch.auth) out['pitch:' + id] = plain(pitch.auth.avatar);
  for (const [pid, pub] of Object.entries(W.pubs)) pub.hirePool.forEach((person, i) => {
    out['candidate:' + pid + ':' + i] = plain(person.avatar);
  });
  return out;
}

function ownPitch(W) {
  return Object.values(W.pitches).find((p) => p.pubId === 'p0' && p.auth && p.status === 'open');
}

test('adding avatars preserves the complete initial simulation and first week', () => {
  const baseline = loadGame(false), enhanced = loadGame();
  const a = baseline.world(), b = enhanced.world();
  assert.deepEqual(withoutAvatar(b), withoutAvatar(a));
  assert.equal(Object.values(b.authors).filter((x) => x.homePub === 'p0').length, 6);
  assert.equal(b.pubs.p0.editorIds.length, 3);
  assert.ok(Object.values(b.authors).every((x) => x.avatar?.kind === 'general'));
  assert.ok(Object.values(b.editors).every((x) => x.avatar?.kind === 'general'));
  baseline.CH.core.step(a);
  enhanced.CH.core.step(b);
  assert.equal(b.tick, 1);
  assert.deepEqual(withoutAvatar(JSON.parse(baseline.CH.core.serialize(a))), withoutAvatar(JSON.parse(enhanced.CH.core.serialize(b))));
});

test('existing saves gain deterministic metadata without changing gameplay or names', () => {
  const baseline = loadGame(false), enhanced = loadGame();
  const old = baseline.world(777);
  const oldText = baseline.CH.core.serialize(old);
  const loaded = enhanced.CH.core.deserialize(oldText);
  enhanced.CH.avatars.ensureWorld(loaded);
  assert.deepEqual(withoutAvatar(loaded), withoutAvatar(old));
  const first = avatarsOf(loaded);
  const again = enhanced.CH.core.deserialize(oldText);
  enhanced.CH.avatars.ensureWorld(again);
  assert.deepEqual(avatarsOf(again), first);
  for (const a of Object.values(loaded.authors)) a.name = '改名した作者';
  for (const e of Object.values(loaded.editors)) e.name = '改名した編集者';
  enhanced.CH.avatars.ensureWorld(loaded);
  assert.deepEqual(avatarsOf(loaded), first, 'appearance belongs to identity, not the current name');
});

test('save, compressed save, and reload retain all generated appearances', () => {
  const { CH, world } = loadGame();
  const W = world(3456);
  CH.auth.hirePool(W, 'p0');
  const expected = avatarsOf(W);
  const text = CH.core.serialize(W);
  for (const input of [text, CH.core.compress(text)]) {
    const loaded = CH.core.deserialize(input);
    CH.avatars.ensureWorld(loaded);
    assert.deepEqual(avatarsOf(loaded), expected);
    assert.deepEqual(plain(loaded.avatarState), plain(W.avatarState));
  }
});

test('candidate editor keeps its exact appearance when hired', () => {
  const { CH, world } = loadGame();
  const W = world();
  const candidate = CH.auth.hirePool(W, 'p0')[0];
  const expected = plain(candidate.avatar);
  assert.ok(expected);
  const result = CH.act.hireEditor(W, { index: 0 });
  assert.equal(result.ok, true);
  assert.deepEqual(plain(W.editors[result.editorId].avatar), expected);
  assert.deepEqual(plain(CH.avatars.descriptor(W, 'editor', result.editorId)), expected);
});

test('pitch author keeps its exact appearance on serial adoption and one-shot creation', () => {
  for (const action of ['adoptPitch', 'oneShot']) {
    const { CH, world } = loadGame();
    const W = world();
    const p = ownPitch(W), expected = plain(p.auth.avatar);
    const args = { ptId: p.id, magId: p.targetMagId, editorId: W.pubs.p0.editorIds[0], prepOnly: true,
      typeIdx: p.wishType, themeIdx: p.wishTheme };
    const result = CH.act[action](W, args);
    assert.equal(result.ok, true, action + ': ' + JSON.stringify(result));
    assert.deepEqual(plain(W.authors[result.authorId].avatar), expected, action);
  }
});

test('specialists start locked and are introduced through the correct later recruitment route', () => {
  const { CH, world } = loadGame();
  const W = world(9274);
  const initial = CH.avatars.roster(W);
  assert.equal(initial.length, 6);
  assert.ok(initial.every((x) => x.status === 'locked'));
  assert.ok(initial.every((x) => x.minTick >= 52));
  const editor = initial.filter((x) => x.role === 'editor').sort((a, b) => a.minTick - b.minTick)[0];
  assert.ok(editor);
  W.tick = editor.minTick - 1;
  W.pubs.p0.hirePoolTick = null;
  assert.ok(CH.auth.hirePool(W, 'p0').every((c) => c.avatar.kind === 'general'));
  W.tick = editor.minTick;
  W.pubs.p0.hirePoolTick = null;
  const pool = CH.auth.hirePool(W, 'p0');
  const index = pool.findIndex((c) => c.avatar?.characterId === editor.id);
  assert.ok(index >= 0, 'unlocked editor appears in the native recruitment list');
  const result = CH.act.hireEditor(W, { index });
  assert.equal(result.ok, true);
  assert.equal(W.editors[result.editorId].avatar.characterId, editor.id);
  assert.equal(CH.avatars.roster(W).find((c) => c.id === editor.id).status, 'joined');
  W.pubs.p0.hirePoolTick = null;
  assert.ok(CH.auth.hirePool(W, 'p0').every((c) => c.avatar?.characterId !== editor.id));
  CH.avatars.ensureWorld(W);
  assert.equal(Object.values(W.editors).filter((c) => c.avatar?.characterId === editor.id).length, 1);
});

test('later specialist author is offered once and retains fixed identity after adoption', () => {
  const { CH, world } = loadGame();
  const W = world(2468);
  const specialist = CH.avatars.roster(W).filter((x) => x.role === 'artist' || x.role === 'author')
    .sort((a, b) => a.minTick - b.minTick)[0];
  assert.ok(specialist);
  W.tick = specialist.minTick;
  CH.auth.generatePitches(W, 'p0');
  CH.avatars.ensureWorld(W);
  const matching = () => Object.values(W.pitches).filter((p) => p.auth?.avatar?.characterId === specialist.id && p.status === 'open');
  assert.equal(matching().length, 1, 'first eligible pitch creation offers the fixed author');
  CH.auth.generatePitches(W, 'p0');
  assert.equal(matching().length, 1, 'repeated generation does not duplicate an outstanding specialist pitch');
  const p = matching()[0];
  const result = CH.act.adoptPitch(W, { ptId: p.id, editorId: W.pubs.p0.editorIds[0], magId: p.targetMagId,
    typeIdx: p.wishType, themeIdx: p.wishTheme, prepOnly: true });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(W.authors[result.authorId].avatar.characterId, specialist.id);
  const loaded = CH.core.deserialize(CH.core.serialize(W));
  CH.avatars.ensureWorld(loaded);
  CH.auth.generatePitches(loaded, 'p0');
  assert.equal(Object.values(loaded.authors).filter((a) => a.avatar?.characterId === specialist.id).length, 1);
  assert.ok(Object.values(loaded.pitches).filter((p) => p.status === 'open').every((p) => p.auth?.avatar?.characterId !== specialist.id));
  // Native next-work negotiations may transfer an author. Their remembered
  // identity is retained, while the gallery must stop calling them a colleague.
  loaded.series[result.srId].status = 'finished';
  loaded.authors[result.authorId].homePub = 'p1';
  loaded.authors[result.authorId].state = 'rival';
  assert.equal(CH.avatars.roster(loaded).find((c) => c.id === specialist.id).status, 'departed');
  assert.equal(loaded.authors[result.authorId].avatar.characterId, specialist.id);
});

test('portrait-bearing screens escape authored names and keep rendering valid HTML', () => {
  const { CH, world, errors } = loadGame();
  const W = world();
  const attack = '<img src=x onerror="globalThis.avatarInjection=1">';
  for (const a of Object.values(W.authors)) a.name = attack;
  for (const e of Object.values(W.editors)) e.name = attack;
  for (const p of Object.values(W.pitches)) if (p.auth) p.auth.name = attack;
  for (const c of CH.auth.hirePool(W, 'p0')) c.name = attack;
  const routes = ['#home', '#authors', '#author/' + Object.values(W.authors)[0].id, '#finance', '#plan', '#people'];
  for (const route of routes) {
    const rendered = CH.ui.render(W, route, {});
    assert.ok(!rendered.includes('表示エラー'), route);
    assert.ok(!rendered.includes(attack), route + ' must escape names');
    if (route !== '#home') assert.ok(rendered.includes('&lt;img'), route + ' still shows escaped name');
  }
  assert.deepEqual(errors, []);
});

test('new character gallery is linked and never publishes hidden rival author statistics', () => {
  const { CH, world, errors } = loadGame();
  const W = world();
  const rendered = CH.ui.render(W, '#people', {});
  assert.ok(rendered.includes('編集部の仲間たち'));
  assert.ok(rendered.includes('data-avatar='));
  assert.ok(CH.ui.navItems(W, {}).some((item) => item[0] === '#people'));
  assert.ok(rendered.includes('これからの出会い'));
  assert.ok(!rendered.includes('表示エラー'));
  const ownIds = new Set(CH.ui.idx.authors(W).own.map((a) => a.id));
  for (const [id, a] of Object.entries(W.authors)) {
    if (!ownIds.has(id)) assert.ok(!rendered.includes('href="#author/' + id + '"'), 'gallery only links own authors');
  }
  assert.deepEqual(errors, []);
});

test('assigned parts and fixed character identities exist in the shipped immutable packs', () => {
  const { CH, world } = loadGame();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'comic-hatten/avatars/packs/general-v1.2.0/manifest.json'), 'utf8'));
  const fixed = JSON.parse(fs.readFileSync(path.join(root, 'comic-hatten/avatars/packs/v1.0.0/manifest.json'), 'utf8'));
  const W = world(5912);
  CH.auth.hirePool(W, 'p0');
  for (const [key, avatar] of Object.entries(avatarsOf(W))) {
    assert.equal(avatar.kind, 'general');
    assert.equal(avatar.packVersion, manifest.version);
    for (const [field, group] of [['hairId', 'hair'], ['faceId', 'face'], ['outfitId', 'outfit']]) {
      const part = manifest.parts[group].find((p) => p.id === avatar.appearance[field]);
      assert.ok(part, key + ': ' + field);
      assert.ok(part.styles.includes(avatar.styleGroup), key + ': style matches ' + field);
    }
    for (const [field, group] of [['hairColorId', 'hair'], ['outfitColorId', 'outfit']]) {
      assert.ok(manifest.palettes[group].some((p) => p.id === avatar.appearance[field]), key + ': palette ' + field);
    }
  }
  for (const character of CH.avatars.roster(W)) {
    const asset = fixed.characters.find((c) => c.id === character.id);
    assert.ok(asset, character.id + ': fixed asset exists');
    assert.equal(character.name, asset.name);
    assert.equal(character.role, asset.role);
  }
});

test('normal weekly progression reaches the first specialist without opening the finance screen', () => {
  const { CH, world } = loadGame();
  const W = world(12904);
  // Funding is a fixture for a unattended year: this test exercises the native
  // periodic hire-pool hook, not player choices or balance tuning.
  W.pubs.p0.cash = 200000000;
  W.flags.sandbox = true;
  for (let week = 0; week < 53; week++) CH.core.step(W);
  assert.equal(W.tick, 53);
  const candidates = W.pubs.p0.hirePool.filter((c) => c.avatar?.kind === 'specialist');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].avatar.characterId, 'kazama');
  assert.ok(W.notifs.some((n) => n.kind === 'avatar_arrival'));
  const loaded = CH.core.deserialize(CH.core.serialize(W));
  assert.deepEqual(avatarsOf(loaded), avatarsOf(W));
});

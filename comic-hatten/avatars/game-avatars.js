/* Avatar identities and specialist arrivals for the existing game engine.
 * Art packs are immutable: general 1.2.0 / specialists 1.0.0.
 * This classic, DOM-free script must run after CH modules and before UI mount.
 * Visual assignment never uses CH.core.rng/stream or changes existing people.
 */
(function (CH) {
  'use strict';
  if (!CH || !CH.core || !CH.auth || CH.avatars) return;
  const C = CH.core, AU = CH.auth, A = CH.act;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const PARTS = {
    male: {
      hairId: ['short', 'center', 'crop', 'adult_buzz', 'adult_part', 'mature_short', 'senior_sparse'],
      faceId: ['bright', 'gentle', 'sharp', 'smile', 'adult_calm', 'adult_bold', 'mature_moustache', 'senior_kind'],
      outfitId: ['casual', 'jacket', 'apron']
    },
    female: {
      hairId: ['bob', 'ponytail', 'wavy', 'mature_perm', 'senior_bun'],
      faceId: ['bright', 'gentle', 'sharp', 'smile', 'mature_soft', 'senior_glasses'],
      outfitId: ['women_casual', 'women_jacket', 'women_apron']
    }
  };
  const COLORS = {hairColorId: ['dark', 'brown', 'copper', 'silver'], outfitColorId: ['sage', 'coral', 'indigo', 'mustard', 'plum', 'teal']};
  const OPEN_PITCH = new Set(['open', 'improving', 'oneshot']);
  const SPECIALISTS = [
    {id: 'kazama', name: '風間 晴', role: 'editor', epithet: 'ヒットの発掘屋', minTick: 52,
      profile: '青緑のブルゾンと黄色い肩掛けバッグ。新しい才能を探す行動派。', specialties: ['新人発掘', '取材・情報収集'],
      editorSkill: 64, types: ['T01', 'T15'], themes: ['S02', 'S11', 'S13']},
    {id: 'hanamori', name: '花守 リリカ', role: 'artist', epithet: 'ときめきの名手', minTick: 104,
      profile: '星のベレー帽と柔らかな巻き髪。人物の感情を繊細に描く恋愛・幻想漫画の名手。', specialties: ['恋愛', 'ファンタジー'],
      authorType: 'responsive', autonomy: 38, collab: 80, extWill: 55, skill: [52, 58, 70, 56], speed: 48, H0: 60, types: ['T04', 'T23'], themes: ['S02', 'S46', 'S06'], pref: [35, 65, 35, 40, 45]},
    {id: 'nukui', name: '温井 誠', role: 'editor', epithet: '育成の達人', minTick: 156,
      profile: '丸眼鏡と蝶ネクタイ。じっくり話を聞き、新人の持ち味を育てる伴走役。', specialties: ['新人育成', '作家との対話'],
      editorSkill: 68, types: ['T05', 'T14'], themes: ['S06', 'S07', 'S11']},
    {id: 'hoshino', name: '星乃 トオル', role: 'artist', epithet: '構成の奇才', minTick: 208,
      profile: '白い前髪とゴーグル、青緑のマフラー。緻密な伏線で読者を驚かせる作家。', specialties: ['SF', 'ミステリー'],
      authorType: 'planner', autonomy: 82, collab: 38, extWill: 28, skill: [74, 51, 56, 66], speed: 40, H0: 72, types: ['T08', 'T17'], themes: ['S58', 'S51', 'S23'], pref: [75, 75, 60, 80, 65]},
    {id: 'takamine', name: '鷹峰 律子', role: 'editor', epithet: '赤ペンの司令塔', minTick: 260,
      profile: '赤い眼鏡とワイン色のジャケット。作品の核を見抜き、連載の方向を決める編集者。', specialties: ['企画の見極め', '連載方針'],
      editorSkill: 75, types: ['T05', 'T09'], themes: ['S11', 'S21', 'S22']},
    {id: 'sumitani', name: '墨谷 玄舟', role: 'artist', epithet: '墨の巨匠', minTick: 312,
      profile: '銀髪と藍色の羽織が目印。重厚な時代劇と、筆の勢いで魅せる大御所。', specialties: ['時代劇', 'アクション'],
      authorType: 'discoverer', autonomy: 67, collab: 45, extWill: 62, skill: [66, 78, 64, 57], speed: 38, H0: 96, types: ['T02', 'T05'], themes: ['S37', 'S44', 'S38'], pref: [85, 30, 65, 80, 80]}
  ];
  const byId = new Map(SPECIALISTS.map((s) => [s.id, s]));
  const ids = (W, map) => Object.keys(W[map] || {}).sort();
  const normalizeRole = (role) => role === 'author' ? 'artist' : role;
  const fixed = (id) => ({kind: 'specialist', characterId: id, packVersion: '1.0.0'});
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
    return h >>> 0;
  }
  function general(W, role, key) {
    const salt = String(W.seed >>> 0) + '|avatar-v1|' + normalizeRole(role) + '|' + key;
    const pick = (list, axis) => list[hash(salt + '|' + axis) % list.length];
    const styleGroup = pick(['male', 'female'], 'style'), options = PARTS[styleGroup];
    const hairId = pick(options.hairId, 'hair');
    let faces = ['bright', 'gentle', 'sharp', 'smile'];
    if (hairId === 'senior_sparse') faces = ['senior_kind', 'mature_moustache'];
    else if (hairId === 'senior_bun') faces = ['senior_glasses', 'mature_soft'];
    else if (hairId === 'mature_short') faces = ['adult_calm', 'mature_moustache'];
    else if (hairId === 'mature_perm') faces = ['gentle', 'mature_soft'];
    else if (hairId === 'adult_buzz' || hairId === 'adult_part') faces = ['adult_calm', 'adult_bold', 'sharp'];
    const outfits = normalizeRole(role) === 'editor' ? options.outfitId.slice(0, 2) : options.outfitId;
    return {kind: 'general', packVersion: '1.2.0', styleGroup, appearance: {
      hairId, faceId: pick(faces, 'face'), outfitId: pick(outfits, 'outfit'),
      hairColorId: pick(COLORS.hairColorId, 'hair-color'), outfitColorId: pick(COLORS.outfitColorId, 'outfit-color')
    }};
  }
  function valid(avatar) {
    if (!avatar || typeof avatar !== 'object') return false;
    if (avatar.kind === 'specialist') return byId.has(avatar.characterId);
    if (avatar.kind !== 'general' || !avatar.appearance) return false;
    return ['hairId', 'faceId', 'outfitId', 'hairColorId', 'outfitColorId'].every((key) => {
      const allowed = COLORS[key] || PARTS.male[key].concat(PARTS.female[key]);
      return allowed.includes(avatar.appearance[key]);
    });
  }
  function identity(W, role, entity, key) {
    if (!entity) return general(W, role, key || 'unknown');
    if (!valid(entity.avatar)) entity.avatar = general(W, role, key || entity.id || entity.name || 'unknown');
    return entity.avatar;
  }
  function state(W) {
    if (!W.avatarState || typeof W.avatarState !== 'object') W.avatarState = {version: 1, specialists: {}};
    if (!W.avatarState.specialists || typeof W.avatarState.specialists !== 'object') W.avatarState.specialists = {};
    return W.avatarState;
  }
  function record(W, characterId) {
    const records = state(W).specialists;
    if (!records[characterId]) records[characterId] = {introducedTick: null, lastOfferedTick: null, entityId: null, pitchId: null, recruitedTick: null};
    return records[characterId];
  }
  function remember(W, entity) {
    if (entity && entity.avatar && entity.avatar.kind === 'specialist' && byId.has(entity.avatar.characterId)) {
      const r = record(W, entity.avatar.characterId);
      r.entityId = entity.id;
      if (r.recruitedTick === null) r.recruitedTick = W.tick;
    }
  }
  function ensureCandidates(W, pid) {
    const pub = W.pubs && W.pubs[pid];
    if (!pub) return;
    for (let i = 0; i < (pub.hirePool || []).length; i++) {
      const candidate = pub.hirePool[i];
      identity(W, 'editor', candidate, pid + '|hire|' + pub.hirePoolTick + '|' + i + '|' + candidate.name);
    }
  }
  function ensurePitch(W, p) {
    if (!p) return;
    const author = p.authorId && W.authors[p.authorId];
    if (author) { identity(W, 'artist', author, author.id); if (p.auth && !valid(p.auth.avatar)) p.auth.avatar = clone(author.avatar); }
    else if (p.auth) identity(W, 'artist', p.auth, 'pitch|' + p.id);
  }
  function ensureWorld(W) {
    if (!W || !W.pubs) return W;
    state(W);
    for (const id of ids(W, 'authors')) { identity(W, 'artist', W.authors[id], id); remember(W, W.authors[id]); }
    for (const id of ids(W, 'editors')) { identity(W, 'editor', W.editors[id], id); remember(W, W.editors[id]); }
    for (const id of ids(W, 'pitches')) ensurePitch(W, W.pitches[id]);
    for (const pid of ids(W, 'pubs')) ensureCandidates(W, pid);
    return W;
  }
  function descriptor(W, role, value) {
    if (!W) return null;
    role = normalizeRole(role);
    if (role === 'pitch') {
      const p = typeof value === 'string' ? (W.pitches || {})[value] : value;
      if (!p) return null;
      ensurePitch(W, p);
      const a = p.authorId && W.authors[p.authorId];
      return a ? a.avatar : p.auth ? p.auth.avatar : null;
    }
    if (role === 'candidate') {
      ensureCandidates(W, 'p0');
      const candidate = typeof value === 'number' || typeof value === 'string' ? (W.pubs.p0.hirePool || [])[Number(value)] : value;
      return candidate ? identity(W, 'editor', candidate, 'candidate|' + candidate.name) : null;
    }
    const map = role === 'editor' ? W.editors : W.authors;
    const entity = typeof value === 'string' ? (map || {})[value] : value;
    return entity ? identity(W, role, entity, entity.id) : null;
  }
  function findPitch(W, characterId) {
    for (const id of ids(W, 'pitches')) {
      const p = W.pitches[id];
      const a = p.authorId && W.authors[p.authorId];
      const av = a ? a.avatar : p.auth && p.auth.avatar;
      if (p.pubId === 'p0' && OPEN_PITCH.has(p.status) && av && av.kind === 'specialist' && av.characterId === characterId) return p;
    }
    return null;
  }
  function roster(W) {
    ensureWorld(W);
    return SPECIALISTS.map((s) => {
      const r = state(W).specialists[s.id] || {}, entity = r.entityId ? ((s.role === 'editor' ? W.editors : W.authors) || {})[r.entityId] : null;
      const p = s.role === 'artist' ? findPitch(W, s.id) : null;
      const candidate = s.role === 'editor' && W.pubs.p0 && (W.pubs.p0.hirePool || []).some((c) => c.avatar && c.avatar.characterId === s.id);
      let status = W.tick < s.minTick ? 'locked' : 'available';
      if (r.entityId) {
        const active = entity && (s.role === 'editor' ? entity.pubId === 'p0'
          : (entity.homePub === 'p0' && !['independent', 'free'].includes(entity.state))
            || (entity.seriesIds || []).some((id) => W.series[id] && W.series[id].pubId === 'p0' && ['prep', 'running', 'ending', 'hiatus'].includes(W.series[id].status)));
        status = active ? 'joined' : p ? 'offered' : 'departed';
      }
      else if (p || candidate) status = 'offered';
      return {id: s.id, name: s.name, role: s.role, epithet: s.epithet, profile: s.profile, specialties: s.specialties.slice(),
        minTick: s.minTick, unlockText: '経営' + (s.minTick / 52 + 1) + '年目から',
        remainingWeeks: Math.max(0, s.minTick - W.tick), progress: Math.min(1, Math.max(0, W.tick / s.minTick)),
        status, entityId: r.entityId || null, pitchId: p ? p.id : null, descriptor: fixed(s.id)};
    });
  }
  function indices(kind, list, W) {
    const master = typeof DATA !== 'undefined' ? DATA[kind] : [];
    return list.map((id) => master.findIndex((v) => v.id === id)).filter((i) => i >= 0 && (kind !== 'themes' || C.themeUnlocked(W, i, W.tick)));
  }
  function announced(W, s, r, ref) {
    if (r.introducedTick !== null) return;
    r.introducedTick = W.tick;
    C.notify(W, 'p0', 'normal', 'avatar_arrival', s.name + '（' + s.epithet + '）' + (s.role === 'editor'
      ? 'が採用候補に加わりました。経営画面から採用できます。採用後は通常の編集者給与が発生します。'
      : 'から企画が届きました。企画会議で条件を確認し、連載や読み切りを検討できます。'), ref);
  }
  function offerEditors(W) {
    const pub = W.pubs && W.pubs.p0;
    if (!pub || pub.hirePoolTick === null) return;
    for (const s of SPECIALISTS) {
      if (s.role !== 'editor' || W.tick < s.minTick) continue;
      const r = record(W, s.id);
      if (r.entityId || pub.hirePool.some((v) => v.avatar && v.avatar.characterId === s.id)) continue;
      pub.hirePool.push({name: s.name, skill: s.editorSkill, favTypes: indices('types', s.types, W), favThemes: indices('themes', s.themes, W), avatar: fixed(s.id)});
      r.lastOfferedTick = W.tick;
      announced(W, s, r, {type: 'route', id: '#finance'});
    }
    ensureCandidates(W, 'p0');
  }
  function offerAuthor(W, pitches) {
    // Reuse one newly generated submission. Do not edit already visible pitches or existing people.
    const p = pitches.find((v) => v && v.auth && !v.authorId && (!v.auth.avatar || v.auth.avatar.kind !== 'specialist'));
    if (!p) return;
    for (const s of SPECIALISTS) {
      if (s.role !== 'artist' || W.tick < s.minTick) continue;
      const r = record(W, s.id);
      if (r.entityId || findPitch(W, s.id) || (r.lastOfferedTick !== null && W.tick - r.lastOfferedTick < 52)) continue;
      const a = p.auth, oldSkill = a.skill.slice();
      a.name = s.name; a.kind = 'veteran'; a.talent = 'normal'; a.type = s.authorType; a.skill = s.skill.slice(); a.speed = s.speed;
      a.autonomy = s.autonomy; a.collab = s.collab; a.extWill = s.extWill;
      a.pref = s.pref.slice(); a.favTypes = indices('types', s.types, W); a.favThemes = indices('themes', s.themes, W); a.H0 = s.H0;
      a.avatar = fixed(s.id);
      p.typeIdx = p.wishType = a.favTypes[0]; p.themeIdx = p.wishTheme = a.favThemes[0]; p.H0 = s.H0;
      p.cbase = a.skill.map((x, i) => x + (p.cbase[i] - oldSkill[i]));
      const bonus = C.X('x.pitch.fav_bonus', W) * 2;
      p.concept = p.cbase.map((x) => C.clamp(x + bonus, 0, 100));
      r.pitchId = p.id; r.lastOfferedTick = W.tick;
      announced(W, s, r, {type: 'pitch', id: p.id});
      break;
    }
  }
  function after(target, key, fn) {
    const original = target[key];
    if (typeof original !== 'function') return;
    target[key] = function (...args) { const result = original.apply(this, args); fn(result, args); return result; };
  }
  after(C, 'newGame', (W) => ensureWorld(W));
  after(C, 'deserialize', (W) => ensureWorld(W));
  after(AU, 'createAuthor', (a, args) => {
    const [W, o] = args;
    if (o.stats && valid(o.stats.avatar)) a.avatar = clone(o.stats.avatar);
    identity(W, 'artist', a, a.id); remember(W, a);
  });
  after(AU, 'createEditor', (e, args) => { const W = args[0]; identity(W, 'editor', e, e.id); });
  after(AU, 'generatePitches', (pitches, args) => {
    const [W, pid] = args;
    if (pid === 'p0') offerAuthor(W, pitches || []);
    for (const p of pitches || []) ensurePitch(W, p);
  });
  // periodic() reaches locally scoped award/editor-pitch creation and hire-pool refreshes.
  after(AU, 'periodic', (_, args) => { const W = args[0]; ensureWorld(W); offerEditors(W); });
  const originalPool = AU.hirePool;
  AU.hirePool = function (W, pid) {
    pid = pid || 'p0'; originalPool.call(this, W, pid);
    if (pid === 'p0') offerEditors(W);
    ensureCandidates(W, pid);
    return W.pubs[pid] ? W.pubs[pid].hirePool.slice() : [];
  };
  const originalHire = A.hireEditor;
  A.hireEditor = function (W, args) {
    args = args || {}; const pid = args.pid || 'p0';
    const pub = W.pubs[pid];
    // Keep candidate indices stable: only the existing native null-pool initialisation can precede an action.
    if (pub && pub.hirePoolTick === null) AU.hirePool(W, pid);
    ensureCandidates(W, pid);
    const candidate = pub && pub.hirePool[args.index === undefined ? 0 : args.index];
    const avatar = candidate && valid(candidate.avatar) ? clone(candidate.avatar) : null;
    const result = originalHire.call(this, W, args);
    if (result && result.ok && avatar) { W.editors[result.editorId].avatar = avatar; remember(W, W.editors[result.editorId]); }
    return result;
  };
  // Saved older pitches get their identity before native createAuthor copies their stats.
  for (const key of ['adoptPitch', 'oneShot']) {
    const original = A[key];
    if (typeof original !== 'function') continue;
    A[key] = function (W, args) {
      const p = args && W.pitches[args.ptId || args.pitchId]; ensurePitch(W, p);
      return original.call(this, W, args);
    };
  }
  CH.avatars = Object.freeze({version: '1.0.0', ensureWorld, descriptor, roster,
    generalPackVersion: '1.2.0', specialistPackVersion: '1.0.0'});
})(typeof CH !== 'undefined' ? CH : null);

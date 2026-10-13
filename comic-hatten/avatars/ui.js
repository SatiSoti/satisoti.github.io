/* Avatar presentation only; economics and recruitment remain in the game core. */
(function (CH) {
'use strict';
const U = CH.ui;
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API = CH.avatarUI = {};
API.portrait = (W, role, person, name, large) => {
  if (!CH.avatars || person == null) return '';
  const descriptor = CH.avatars.descriptor(W, role, person);
  if (!descriptor) return '';
  return '<span class="avatar-frame' + (large ? ' avatar-large' : '') + '"><canvas width="96" height="112" data-avatar="' + esc(JSON.stringify(descriptor)) + '" data-avatar-label="' + esc(name || 'キャラクター') + '" aria-label="' + esc(name || 'キャラクター') + 'のアバター" role="img">' + esc(name || '人物') + '</canvas></span>';
};
API.office = (cx, avatar, x, y, mode, time, index) => {
  if (!avatar || !CH.avatarArt) return false;
  const action = mode === 'draw' || mode === 'tired' ? 'work' : 'idle';
  return CH.avatarArt.draw(cx, avatar, {x, y, scale: .53, action, time: time / 1000 + index * .3, shadow: false});
};
U.ROUTES.push(['#people', 'people']);
const nav = U.navItems;
U.navItems = (W, o) => { const items = nav(W, o); items.splice(items.findIndex(x => x[2] === 'authors') + 1, 0, ['#people','人物図鑑','people']); return items; };
const statusNames = {locked:'これからの出会い',available:'登場準備中',offered:'会いに行けます',joined:'仲間になりました',departed:'出会った人物'};
U.views.people = W => {
  CH.avatars.ensureWorld(W);
  const own = U.idx.authors(W).own;
  const editors = U.idx.editors(W);
  const employee = (p, role) => '<article class="koma card avatar-person">' + API.portrait(W, role, p.id, p.name, true)
    + '<div><p class="eyebrow">' + (role === 'author' ? '漫画家' : '編集者') + '</p><h3>' + esc(p.name) + '</h3>'
    + '<a href="' + (role === 'author' ? '#author/' + encodeURIComponent(p.id) : '#finance') + '">仕事と状態を見る →</a></div></article>';
  const roster = CH.avatars.roster(W);
  let html = '<div class="head"><h1>編集部の仲間たち</h1><p class="muted">ひとりひとりに、顔のある出版社。</p></div>'
    + '<section class="koma card"><h2>いま一緒につくる人</h2><p class="k">同じ人は、保存して読み直しても同じ見た目で登場します。</p>'
    + '<div class="avatar-people-grid">' + own.map(p => employee(p,'author')).join('') + editors.map(p => employee(p,'editor')).join('') + '</div></section>'
    + '<section class="koma card"><h2>これから出会う６人</h2><p class="k">経営を続けると、個性ある漫画家や編集者が登場します。漫画家は企画会議へ、編集者は経営の採用候補へ。登場してから、条件や能力を見て迎えるか決められます。</p><div class="avatar-people-grid">';
  for (const p of roster) {
    const face = '<span class="avatar-frame avatar-large"><canvas width="96" height="112" data-avatar="' + esc(JSON.stringify(p.descriptor)) + '" data-avatar-label="' + esc(p.name) + '" aria-label="' + esc(p.name) + '" role="img">' + esc(p.name) + '</canvas></span>';
    const dest = p.role === 'editor' ? '#finance' : p.status === 'offered' ? '#plan' : p.entityId ? '#author/' + encodeURIComponent(p.entityId) : '#plan';
    html += '<article class="avatar-specialist' + (p.status === 'locked' ? ' is-locked' : '') + '"><div class="avatar-specialist-top">' + face
      + '<div><small>' + (p.role === 'artist' ? '漫画家' : '編集者') + ' · ' + esc(p.epithet) + '</small><h3>' + esc(p.name) + '</h3><span class="tag">' + esc(statusNames[p.status] || p.status) + '</span></div></div>'
      + '<p>' + esc(p.profile) + '</p><p class="k">' + esc(p.unlockText) + (p.remainingWeeks > 0 ? ' · あと' + esc(p.remainingWeeks) + '週' : '') + '</p>'
      + (p.status === 'locked' ? '<progress max="1" value="' + Math.max(0,Math.min(1,p.progress || 0)) + '" aria-label="登場までの進行度"></progress>' : '<a class="btn sub small" href="' + dest + '">' + (p.role === 'editor' ? '経営・採用候補へ' : p.status === 'offered' ? '企画会議へ' : p.entityId ? '作者を見る' : '企画会議へ') + ' →</a>') + '</article>';
  }
  return html + '</div></section>';
};
})(CH);

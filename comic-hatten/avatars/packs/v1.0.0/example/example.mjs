import { loadCharacterPack } from '../renderer.mjs';

const labels = { idle: '待つ', walk: '歩く', work: '仕事', cheer: '喜ぶ' };
const canvas = document.querySelector('#preview');
const ctx = canvas.getContext('2d');
const roster = document.querySelector('#roster');
const pauseButton = document.querySelector('#pause');
const flipInput = document.querySelector('#flip');
const actionButtons = [...document.querySelectorAll('[data-action]')];
let pack;
let selectedId;
let action = 'walk';
let elapsed = 0;
let paused = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
let lastTime;
let lastFrameIndex = -1;

function updateControls() {
  for (const button of roster.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === selectedId));
  for (const button of actionButtons) button.setAttribute('aria-pressed', String(button.dataset.action === action));
  pauseButton.textContent = paused ? '再生する' : '一時停止';
  pauseButton.setAttribute('aria-pressed', String(paused));
  document.querySelector('#action-label').textContent = `${labels[action]}${paused ? ' · 停止中' : ''}`;
  const person = pack.byId(selectedId);
  document.querySelector('#role').textContent = `${person.roleLabel} / ${person.epithet}`;
  document.querySelector('#name').textContent = person.name;
  document.querySelector('#description').textContent = person.profile;
  canvas.setAttribute('aria-label', `${person.name}の「${labels[action]}」アニメーション`);
}

function paint() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e9eee1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#dce3d2';
  ctx.lineWidth = 1;
  for (let x = 0; x < 420; x += 30) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 55); ctx.lineTo(x + 0.5, 280); ctx.stroke();
  }
  for (let y = 70; y < 290; y += 30) {
    ctx.beginPath(); ctx.moveTo(25, y + 0.5); ctx.lineTo(395, y + 0.5); ctx.stroke();
  }
  ctx.fillStyle = '#d9dfc8';
  ctx.fillRect(127, 258, 166, 3);
  ctx.fillStyle = '#a4b08e';
  ctx.fillRect(200, 269, 20, 2);
  const frame = pack.draw(ctx, { id: selectedId, action, time: elapsed, x: 210, y: 257, scale: 3, flip: flipInput.checked });
  if (lastFrameIndex !== frame.index) {
    document.querySelector('#frame-label').textContent = `FRAME ${String(frame.index + 1).padStart(2, '0')} / 08`;
    lastFrameIndex = frame.index;
  }
}

function tick(now) {
  const dt = lastTime === undefined ? 0 : Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (!paused && !document.hidden) {
    elapsed += dt;
    paint();
  }
  requestAnimationFrame(tick);
}

function addCharacter(person) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'person';
  button.dataset.id = person.id;
  button.setAttribute('aria-pressed', String(person.id === selectedId));
  button.setAttribute('aria-label', `${person.name}、${person.roleLabel}`);
  const portrait = document.createElement('canvas');
  portrait.width = 84;
  portrait.height = 120;
  portrait.setAttribute('aria-hidden', 'true');
  pack.draw(portrait.getContext('2d'), { id: person.id, action: 'idle', x: 42, y: 116, scale: 1.8, shadow: false });
  const text = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = person.name;
  const role = document.createElement('small');
  role.textContent = person.roleLabel;
  text.append(name, role);
  button.append(portrait, text);
  button.addEventListener('click', () => {
    selectedId = person.id;
    elapsed = 0;
    updateControls();
    paint();
  });
  roster.append(button);
}

try {
  pack = await loadCharacterPack(new URL('../manifest.json', import.meta.url));
  selectedId = pack.characters[0].id;
  document.querySelector('#version').textContent = `v${pack.manifest.version}`;
  document.querySelector('#count').textContent = `${pack.characters.length} 人 / ${new Set(pack.characters.map(person => person.role)).size} 職種`;
  for (const person of pack.characters) addCharacter(person);
  for (const button of actionButtons) {
    button.disabled = false;
    button.addEventListener('click', () => {
      action = button.dataset.action;
      elapsed = 0;
      updateControls();
      paint();
    });
  }
  pauseButton.disabled = false;
  flipInput.disabled = false;
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    updateControls();
    paint();
  });
  flipInput.addEventListener('change', paint);
  document.addEventListener('visibilitychange', () => { lastTime = undefined; });
  updateControls();
  paint();
  requestAnimationFrame(tick);
} catch (error) {
  const message = document.querySelector('#error');
  message.hidden = false;
  message.textContent = `素材を読み込めませんでした。ZIP を開いた場合は、HTTP サーバーからこのページを開いてください。詳細: ${error.message}`;
  document.querySelector('#name').textContent = '読み込みを確認してください';
  document.querySelector('#description').textContent = 'manifest.json・renderer.mjs・assets・example を、同じ素材セットのフォルダ構成のまま配置してください。';
  document.querySelector('#action-label').textContent = '読み込みエラー';
}

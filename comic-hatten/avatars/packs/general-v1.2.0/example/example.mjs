import { loadGeneralPack } from '../renderer.mjs';

const element = id => document.getElementById(id);
const roles = { artist: '漫画家', editor: '編集者' };
const actionLabels = { idle: '待つ', walk: '歩く', work: '仕事', cheer: '喜ぶ' };
const groups = {
  hairId: 'hair', faceId: 'face', outfitId: 'outfit',
  hairColorId: 'hairColors', outfitColorId: 'outfitColors'
};
const canvas = element('preview');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;
let pack;
let appearance;
let styleGroup = 'male';
let elapsed = 0;
let lastTime = null;
let lastDraw = -Infinity;
let action = 'walk';
let flipped = false;
let paused = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function render() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  pack.draw(context, { appearance, action, time: elapsed, x: 160, y: 285, scale: 4, flip: flipped, shadow: true });
}

function updateLabels() {
  element('play').textContent = paused ? '再生する' : '一時停止';
  element('play').setAttribute('aria-pressed', String(paused));
  element('status').textContent = `${actionLabels[action]}・${paused ? '停止中' : '再生中'}`;
  element('appearance').textContent = JSON.stringify({
    packId: pack.manifest.packId,
    packVersion: pack.manifest.version,
    styleGroup, appearance
  }, null, 2);
}

function choosePreset() {
  const selected = pack.presets.find(record => record.id === element('preset').value) || pack.presets[0];
  styleGroup = selected.styleGroup;
  appearance = { ...selected.appearance };
  pack.validateAppearance(appearance);
  elapsed = 0;
  element('character-name').textContent = selected.name;
  element('character-role').textContent = roles[selected.role];
  updateLabels();
  render();
}

function tick(now) {
  if (lastTime !== null && !paused && !document.hidden) elapsed += Math.min(Math.max((now - lastTime) / 1000, 0), 0.1);
  lastTime = now;
  if (!document.hidden && !paused && now - lastDraw >= 1000 / 30) {
    render();
    lastDraw = now;
  }
  requestAnimationFrame(tick);
}

async function start() {
  try {
    pack = await loadGeneralPack(new URL('../manifest.json', import.meta.url));
    for (const preset of pack.presets) {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = `${preset.name}（${roles[preset.role]}）`;
      element('preset').append(option);
    }
    element('preset').value = pack.presets[0].id;
    element('combination-count').textContent = ['male','female'].reduce((sum, style) => sum + Object.values(groups).reduce((count, key) => count * pack.optionsForStyle(style)[key].length, 1), 0).toLocaleString('ja-JP');
    choosePreset();
    element('preset').addEventListener('change', choosePreset);
    element('action').addEventListener('change', () => {
      action = element('action').value;
      elapsed = 0;
      updateLabels();
      render();
    });
    element('flip').addEventListener('change', () => {
      flipped = element('flip').checked;
      render();
    });
    element('play').addEventListener('click', () => {
      paused = !paused;
      lastTime = null;
      updateLabels();
      render();
    });
    element('randomize').addEventListener('click', () => {
      appearance = Object.fromEntries(Object.entries(groups).map(([field, key]) => {
        const options = pack.optionsForStyle(styleGroup)[key];
        return [field, options[Math.floor(Math.random() * options.length)].id];
      }));
      pack.validateAppearance(appearance);
      element('character-name').textContent = '新しい組み合わせ';
      element('character-role').textContent = '名前と役割はゲーム本体で設定できます';
      element('preset').selectedIndex = -1;
      updateLabels();
      render();
    });
    document.addEventListener('visibilitychange', () => { lastTime = null; });
    for (const id of ['preset', 'action', 'flip', 'play', 'randomize']) element(id).disabled = false;
    requestAnimationFrame(tick);
  } catch (error) {
    element('error').hidden = false;
    element('error').textContent = '素材を読み込めませんでした。フォルダー全体を HTTP / HTTPS で配信し、manifest.json・renderer.mjs・assets/ が同じパックに含まれているか確認してください。';
    element('character-name').textContent = '読み込みに失敗しました';
    element('status').textContent = '素材を確認して再読み込みしてください。';
    element('appearance').textContent = '未読み込み';
  }
}

start();

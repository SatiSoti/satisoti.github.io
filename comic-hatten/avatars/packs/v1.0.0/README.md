# コミック発展国 キャラクター素材セット v1.0.0

更新日：2026-10-12（日本時間）

コミック発展国に組み込むための、漫画家３人・編集者３人の固定キャラクター素材です。画像、設定データ、動きの定義、Canvas 用の描画コードをまとめています。ゲーム本体とは独立して制作しており、このセットの作成によって本体のコードやセーブデータは変更していません。

この版は「キャラクター素材の初版」です。採用、能力、登場条件、育成、経営シミュレーションとの接続は、ゲーム本体側で実装してください。

## 収録キャラクター

全員、このプロジェクト用の架空のオリジナルキャラクターです。

| 固定 ID | 名前 | 役割 | デザイン |
| --- | --- | --- | --- |
| `sumitani` | 墨谷 玄舟 | 漫画家 | 銀髪、藍色の羽織、筆。重厚な時代劇を描く「墨の巨匠」 |
| `hanamori` | 花守 リリカ | 漫画家 | 星のベレー帽、巻き髪。恋愛・幻想漫画の「ときめきの名手」 |
| `hoshino` | 星乃 トオル | 漫画家 | 白い前髪、ゴーグル、青緑のマフラー。SF・ミステリーの「構成の奇才」 |
| `takamine` | 鷹峰 律子 | 編集者 | 赤い眼鏡、ワイン色のジャケット。「赤ペンの司令塔」 |
| `nukui` | 温井 誠 | 編集者 | 丸眼鏡、蝶ネクタイ、ベスト。新人に寄り添う「育成の達人」 |
| `kazama` | 風間 晴 | 編集者 | 青緑のブルゾン、黄色い肩掛けバッグ、赤い手帳。「ヒットの発掘屋」 |

ID はセーブデータやゲーム内の人物との対応に使う識別子です。名前やプロフィールを後で直しても、同じ人物の ID は変えません。名前や配列の順番を人物の識別に使わないでください。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `manifest.json` | キャラクター設定、画像参照、切り出し範囲、描画位置、アニメーション定義 |
| `manifest.schema.json` | 設定データの JSON Schema |
| `renderer.mjs` | 外部依存のない Canvas 2D 描画モジュール |
| `assets/<ID>.png` | キャラ別の透明背景スプライトシート６点 |
| `example/index.html`, `example/example.mjs` | 単独で６人と４動作を確認するための利用例 |
| `checksums.json` | 配布ファイルの SHA-256。コピーや受け渡しで変化していないか確認するための値 |
| `README.md` | 素材と描画 API の説明 |
| `AI-HANDOFF.md` | ゲーム本体を担当する AI への受け渡し手順 |
| `CHANGELOG.md` | バージョン別の変更履歴 |

フォルダー全体をコピーしてください。画像だけを取り出す場合も、`manifest.json` の切り出し座標と足元の基準位置を一緒に使ってください。

## 素材・アニメーションの仕様

各 PNG は 1536 × 1024 px、４列 × ２行、透明背景です。画像生成で制作した８コマを収録しています。素材の切り出し範囲は `sprite.frames` に明示しており、読み込み時に画像の透明部分を解析する必要はありません。

| 動作名 | フレーム番号（０始まり） | fps | 表示内容 |
| --- | --- | --- | --- |
| `idle` | `0` | 1 | 待機 |
| `walk` | `1, 2, 3, 4` | 6 | 歩行ループ |
| `work` | `5, 6` | 2.7 | 漫画家は描く、編集者は原稿を確認する |
| `cheer` | `0, 7` | 2.3 | 待機と喜びのポーズを交互に表示 |

各フレームの `rect` はシート上の `[x, y, width, height]`、`anchor` は切り出した画像内の足元の `[x, y]` です。`renderHeight` は基本表示の高さ、`offsetY` は動作に合わせた上下のずれです。等分セル全体を描くと余白によって位置がずれるため、これらの値を使います。

基本表示は待機・歩行が高さ 58 px、仕事が 51 px、喜びの専用コマが 60 px です。`scale` で全体を拡大できます。足元を基準に配置するため、机や床との重なりはゲーム側で調整してください。

絵の向きは斜め正面が基本で、左右反転に対応します。上向き・背面を含む４方向の専用素材はありません。歩行は４コマありますが、脚の左右が厳密に交互になる専用の歩行原画としては調整の余地があります。ゲームの移動処理、当たり判定、経路探索はこの素材セットには含みません。

固定キャラクターでは顔・髪型・衣装・持ち物を一体のデザインとして扱います。通常キャラ用の髪型抽選、服の色変更、パーツ交換を適用しないでください。

## 最小の表示例

このフォルダーを HTTP/HTTPS で配信し、次のコードを同じフォルダーに置いた HTML から実行する例です。画像の参照は `manifest.json` の URL を基準に解決されます。

```html
<canvas id="character" width="240" height="220"
        aria-label="墨谷玄舟の歩行アニメーション"></canvas>
<button id="pause" type="button">一時停止</button>
<style>
  canvas { image-rendering: pixelated; }
</style>
<script type="module">
  import { loadCharacterPack } from './renderer.mjs';

  const canvas = document.querySelector('#character');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const pack = await loadCharacterPack(
    new URL('./manifest.json', import.meta.url)
  );
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let previous;
  let time = 0;
  const pauseButton = document.querySelector('#pause');

  function updateButton() {
    pauseButton.textContent = paused ? '再生' : '一時停止';
    pauseButton.setAttribute('aria-pressed', String(paused));
  }
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    updateButton();
  });
  updateButton();

  function tick(now) {
    if (previous !== undefined && !paused && !document.hidden) {
      time += Math.min((now - previous) / 1000, 0.1);
    }
    previous = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pack.draw(ctx, {
      id: 'sumitani', action: 'walk', time,
      x: 120, y: 200, scale: 3, flip: false, shadow: true
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
</script>
```

上の例は読み込み成功時の最小例です。本体では読み込み失敗の表示と再試行も、本体の画面設計に合わせて追加してください。`file://` で直接開く用途ではなく、既存ゲームの配信環境に置いて使用します。

### 描画 API

`loadCharacterPack(manifestUrl, { fetchImpl, ImageClass })` は Promise を返します。通常のブラウザでは第２引数を省略できます。テストや別の実行環境では、互換性のある読み込み実装を明示できます。

読み込み後のオブジェクトは `manifest`、`characters`、`byId(id)`、`frameAt(id, action, time)`、`draw(ctx, options)` を提供します。

- `time` は秒です。各キャラに別の時間を持たせれば、動きをずらせます。
- `x` と `y` は Canvas 上の足元の位置です。左上座標ではありません。
- `scale` は倍率、`flip` は左右反転、`shadow` は足元の影の表示です。
- `frameAt` は選択されたフレームの `{ index, rect, anchor, renderHeight, offsetY }` を返します。別エンジンへ移植する場合も、マニフェストの矩形・足元・表示寸法を基準にしてください。

不明な ID・動作名、不正な座標や時刻、０以下の倍率は `[CharacterPack]` を含むエラーになります。負の有限な `time` は０として扱います。画像の実寸とマニフェストの寸法が異なる場合も読み込みに失敗します。

このモジュールは外部ライブラリ、CDN、フォント、外部 API を必要としません。読み込むのは同梱の JSON と PNG です。別ドメインから配信する場合は、ゲーム側の配信設定に合わせて CORS を設定してください。

実行環境には ES Modules、`fetch`、`Image`、Canvas 2D、`Object.hasOwn` が必要です。古いブラウザ向けの変換処理や互換コードは同梱していません。描画モジュールは実行時に SHA-256 を照合しないため、配布物の照合は取り込み時に行ってください。

## ゲームの数値との分離

`role` は `artist` / `editor`、`roleLabel` は表示用の「漫画家」/「編集者」です。肩書きや得意分野はキャラの設定であり、能力値の大小を決める計算式ではありません。

`gameplay` 内の `stats`、`unlockConditions`、`recruitmentCost` は `null` です。これは「本体側で未決定」を表し、０、無料、無条件登場、能力なしという意味ではありません。既存のゲームバランスを上書きせず、本体担当がゲームの仕様に合わせて割り当ててください。

`production.status: "ready"` は素材を受け渡せる状態を示します。`gameplay.implementationStatus: "not_integrated"` が示すとおり、ゲーム本体への組み込み完了を意味しません。

## バージョンと受け渡し

初版は `1.0.0` です。公開した版の内容を無言で上書きせず、変更は新しいバージョンと変更履歴で渡します。

- パッチ版：互換性を保つ誤記や軽微な修正。
- マイナー版：既存 ID と読み込み方を維持したキャラや素材の追加。
- メジャー版：既存の読み込み形式などを壊す変更。移行手順を添えます。

同一人物の ID は版が変わっても維持し、削除した ID を別人に再利用しません。新しい版は別フォルダーへ配置し、読み込みとセーブデータの対応を確認してから参照先を切り替えます。旧版は確認が済むまで残します。試作サイトの変更が本体へ自動反映される仕組みはありません。

受け渡しには `comic-hatten-characters-v1.0.0.zip` を使えます。ZIP の直下に `manifest.json` などが入っているため、専用の空フォルダーへ展開してください。試作サイトの URL は閲覧にログインが必要な場合があるため、別の AI には ZIP と `AI-HANDOFF.md` を渡す方法が確実です。詳細な取り込み手順は `AI-HANDOFF.md` を参照してください。

# コミック発展国 一般キャラクター素材セット v1.2.0

更新日：2026-10-13（日本時間）

髪型・顔・服・色を組み合わせて、漫画家と編集者を増やすための素材です。固定キャラクター６人の素材セットとは独立した追加パックで、ゲーム本体のコードやセーブデータは変更していません。

本パックの識別子は `comic-hatten-general`、バージョンは `1.2.0` です。固定キャラ用の `comic-hatten-specialists` と区別して読み込んでください。

## 組み合わせられるもの

| 項目 | 種類 | 保存するキー |
| --- | --- | --- |
| 髪型を含む頭部 | 12種類 | `hairId` |
| 目・鼻・口をまとめた顔 | 10種類 | `faceId` |
| 服装 | 男性向け３種類・女性向け３種類（計６種類） | `outfitId` |
| 髪色 | 墨色／栗色／赤茶／銀色の４色 | `hairColorId` |
| 服の色 | セージ／コーラル／インディゴ／マスタード／プラム／ティールの６色 | `outfitColorId` |

男性向けは **７ × ８ × ３ × ４ × ６ = 4,032 通り**、女性向けは **５ × ６ × ３ × ４ × ６ = 2,160 通り**。分類内の組み合わせは計 **6,192 通り**です。名前・役割・動作はこの数に含めていません。すべての見た目を漫画家・編集者のどちらにも使用できます。

顔は、目・鼻・口の位置が崩れないように１セットとして交換します。目・鼻・口をそれぞれ別々に選ぶ機能、体型や肌色の選択、前髪と後ろ髪の個別交換は、この版にはありません。顔は動作によって自動変更されず、「喜ぶ」でも選んだ顔のままポーズが変わります。

頭と顔を別の画像にし、身体 → 頭 → 顔の順で重ねます。顔のパーツは肌の範囲にだけ描画し、前髪や輪郭を覆いません。身体の接合点は襟元に置き、原画に含まれる２つの首が縦に並ばないようにしています。共通の位置情報を使うため、髪型を変えても同じ服・顔・動作を利用できます。服と髪の色変更は対象の色領域に適用し、画像全体への色フィルターにはしていません。

初期プリセットは次の14人です。すべて組み合わせを変更できます。

| ID | 名前 | 役割 |
| --- | --- | --- |
| `general_naoto` | 田島 直人 | 漫画家 |
| `general_ken` | 三浦 健 | 編集者 |
| `general_shigeru` | 松岡 茂 | 漫画家 |
| `general_yoko` | 野沢 洋子 | 編集者 |
| `general_gen` | 大原 源 | 漫画家 |
| `general_fumie` | 小森 文江 | 編集者 |
| `general_aoki` | 青木 はじめ | 漫画家 |
| `general_koharu` | 小春 つむぎ | 漫画家 |
| `general_ren` | 水瀬 蓮 | 漫画家 |
| `general_mao` | 七瀬 真央 | 漫画家 |
| `general_fumi` | 白石 文 | 編集者 |
| `general_nao` | 佐伯 直 | 編集者 |
| `general_kaoru` | 森野 薫 | 編集者 |
| `general_kanade` | 高原 奏 | 編集者 |

新しい６人は若い男性２人、中年男性・中年女性・高齢男性・高齢女性を各１人。年齢・性別は見た目のデザインで、能力値や雇用条件を決める項目ではありません。各パーツは役割を問わず利用できます。

## 同梱物

| ファイル | 内容 |
| --- | --- |
| `manifest.json` | パーツ一覧、色、切り出し位置、アニメーション、14人分の初期プリセット |
| `manifest.schema.json` | マニフェストの JSON Schema |
| `character.schema.json` | 管理画面で受け渡す人物 JSON の JSON Schema |
| `renderer.mjs` | Canvas 2D 用のパーツ合成・描画モジュール |
| `assets/heads.png` | 顔の描かれていない頭部６種類（３列 × ２行） |
| `assets/faces.png` | 目・鼻・口をまとめた顔４種類（２列 × ２行） |
| `assets/age-heads.png` | 成人男性・中年男女・高齢男女の頭部６種類（３列 × ２行） |
| `assets/age-faces.png` | 男性的な顔・口ひげ・しわ・眼鏡などの顔６種類（３列 × ２行） |
| `assets/casual.png` | カジュアル服の頭なし身体、８フレーム |
| `assets/jacket.png` | ジャケットの頭なし身体、８フレーム |
| `assets/women-casual.png`, `assets/women-jacket.png`, `assets/women-apron.png` | 女性向けのブラウス＋パンツ／ジャケット＋スカート／エプロン＋スカート。各８フレーム |
| `STYLE-ART-PROMPTS.json` | 女性向け服装３枚の内蔵画像生成プロンプト |
| `assets/apron.png` | エプロンの頭なし身体、８フレーム |
| `example/index.html`, `example/example.mjs` | パック単独で動作を確認するための表示例 |
| `ART-PROMPTS.json` | 内蔵画像生成で制作した追加素材と首調整の生成指示 |
| `checksums.json` | 配布ファイルの SHA-256 |
| `README.md` | 素材・API・データの説明 |
| `AI-HANDOFF.md` | ゲーム本体を担当する AI への取り込み手順 |
| `CHANGELOG.md` | 変更履歴 |

画像は透明背景の PNG です。生成した原画をパーツ素材として使用しています。原画の切り出し座標や重ね位置は `manifest.json` を正とし、等分セルだけを基準に描画しないでください。

## 動作

身体シートは４列 × ２行の８フレームです。フレーム番号は０から数えます。

| 動作 ID | 使用フレーム | 内容 |
| --- | --- | --- |
| `idle` | `0` | 待機 |
| `walk` | `1, 2, 3, 4` | 歩行 |
| `work` | `5, 6` | 机で作業する動き |
| `cheer` | `0, 7` | 喜ぶポーズ |

フレーム順と再生速度は `manifest.json` 直下の `animations` を正とします。役割によってシートを分けず、同じ作業動作を漫画家・編集者の両方に利用します。移動、机への着席、当たり判定、経路探索、作業の進行はゲーム本体側の処理です。

向きは斜め正面を基本とし、左右反転に対応します。背面や上向きを含む４方向分の原画はありません。専用の４方向歩行が必要なゲームでは、別途素材を追加してください。

## 最小の表示例

パックを HTTP/HTTPS で配信する場合の例です。HTML をパック直下に置く想定で、`file://` からの直接起動は対象にしていません。

```html
<canvas id="character" width="240" height="220"
        aria-label="一般キャラクターの歩行プレビュー"></canvas>
<style>canvas { image-rendering: pixelated; }</style>
<script type="module">
  import { loadGeneralPack } from './renderer.mjs';

  const canvas = document.querySelector('#character');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const pack = await loadGeneralPack(
    new URL('./manifest.json', import.meta.url)
  );
  const appearance = { ...pack.presets[0].appearance };
  pack.validateAppearance(appearance);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let previous;
  let time = 0;

  function tick(now) {
    if (previous !== undefined && !document.hidden && !reducedMotion) {
      time += Math.min((now - previous) / 1000, 0.1);
    }
    previous = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pack.draw(ctx, {
      appearance, action: 'walk', time,
      x: 120, y: 200, scale: 2.5, flip: false, shadow: true
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
</script>
```

これは読み込み成功時の最小例です。本体では読み込み失敗時の表示、再試行、画面切り替え時の再生停止を既存の仕組みに合わせて実装してください。

### API

`loadGeneralPack(manifestURL, { fetchImpl?, ImageClass?, createCanvas? })` は Promise を返します。通常のブラウザでは第２引数を省略できます。テストなどでは互換性のある読み込み・Canvas 実装を渡せます。

| 戻り値の項目 | 用途 |
| --- | --- |
| `manifest` | 読み込んだマニフェスト |
| `options.hair` / `options.face` / `options.outfit` | 選択可能な各パーツ |
| `options.hairColors` / `options.outfitColors` | 選択可能な色 |
| `optionsForStyle("male" / "female")` | 分類内のパーツ・共通の色を取得 |
| `inferStyle(appearance)` | 旧データの髪型から一覧の分類を補完 |
| `presets` | 初期プリセット14人 |
| `validateAppearance(appearance)` | 組み合わせを描画・保存する前の検証 |
| `frameAt(action, time)` | 動作と秒数から、使用するフレーム番号を取得 |
| `draw(ctx, options)` | 指定した見た目と動作の描画 |

`draw` の `appearance` は上記５キーを持つオブジェクト、`action` は `idle` / `walk` / `work` / `cheer`、`time` は秒です。`x` と `y` は **足元の座標**です。`scale` は倍率、`flip` は左右反転、`shadow` は影の表示です。８コマを順番に書き出すときは `frameIndex` を０〜７で明示します。通常のアニメーション再生では `frameIndex` を省略します。

各人物が独立した `time` を持つと、動きをずらせます。人物を毎フレーム作り直したり、毎回ランダムに見た目を選び直したりせず、生成時に決めた `appearance` を保持してください。

`appearance` は５つの ID だけを持つオブジェクトです。名前や役割をその中へ混ぜず、人物データの別項目に置いてください。存在しないパーツ・色・動作、不正な座標や倍率は `[GeneralPack]` を含むエラーになります。`validateAppearance` は成功時に `true` を返します。マニフェストの寸法と画像の実寸が異なる場合も読み込みに失敗します。

パックは相対パスの JSON と PNG のみを読み込みます。外部ライブラリ・CDN・API・試作サイトへの接続は不要です。描画は画像のピクセルを読み取って色を変更するため、別ドメインから使う場合はその配信元の CORS 設定も必要です。同一オリジンでの配信を基本にしてください。

## 管理画面で作った人物の受け渡し

試作サイトの一般キャラ画面では、名前・役割・見た目を選び、人物をブラウザに保存できます。この保存は **そのブラウザの `localStorage`** です。クラウド同期ではなく、別端末や別ブラウザには自動で移りません。サイトデータを消すと失われるため、残したい人物は JSON を書き出してください。

人物 JSON の形式は次のとおりです。

- `format`: `comic-hatten.general-character`
- `schemaVersion`: `1.0.0`
- `packId`: `comic-hatten-general`
- `packVersion`: `1.2.0`
- `character`: `id`、`name`、`role`、`styleGroup`、`appearance`、`gameplay` を含む人物データ
- `exportedSheet`: 合成済み PNG のシート情報。管理画面では PNG を保存していなくても JSON に含めます。

自作人物の ID は `general_custom_` に一意の識別文字列（通常は UUID）を続けた形式です。同じ人物の名前や見た目を修正しても ID は保持します。別の人物として複製・追加するときは新しい ID を作ります。プリセットの番号や名前は人物の永続 ID の代わりにはなりません。

### パーツで合成する方法

ゲームでは人物の `appearance` と `packId` / `packVersion` を保存し、本パックの描画モジュールで合成する方法を推奨します。素材の重複を抑え、組み合わせを後から再現できます。

### 合成済み PNG を使う方法

管理画面から書き出す合成済みシートは **512 × 320 px、４列 × ２行、１セル 128 × 160 px** です。フレーム順は０〜７、各セル内の足元は **`[64, 148]`**、合成時の倍率は **２倍**です。JSON の `exportedSheet` にファイル名・列数・行数・セルサイズ・足元・倍率を記録し、`frames` に各フレームの `index`、`rect`、`anchor` を持たせています。

この PNG はパーツ原画と異なる寸法・座標系です。**合成済み PNG に、原画用の切り出し座標やアンカーを流用しないでください。** JSON の `exportedSheet` を使います。元の描画倍率１相当で表示する場合は、書き出し画像を半分の大きさで描きます。名前や役割、見た目の設定を維持するため、PNG だけでなく人物 JSON も一緒に渡してください。

## ゲーム設定とバージョン

`role` は `artist` / `editor` です。見た目から役割、能力、性別、性格、得意ジャンルを自動決定する仕様は含みません。

`gameplay.stats`、`gameplay.unlockConditions`、`gameplay.recruitmentCost` は `null`、`gameplay.implementationStatus` は `not_integrated` です。`null` は本体側で未決定という意味で、能力０・無料・無条件登場ではありません。能力や採用条件は本体担当が既存仕様に合わせて定めます。

配布 ZIP は `comic-hatten-general-v1.2.0.zip` です。ZIP 直下に `manifest.json` などが入っているため、専用の空フォルダーへ展開してください。公開した版は変更せず、追加・修正は新しい版として配布します。パーツ ID・人物 ID を別の意味で再利用せず、旧版と新しい版を並べて置ける構成を保ちます。

固定６人の `comic-hatten-characters-v1.0.0.zip` は別パックとしてそのまま保持します。一般キャラ用のランダム生成・色変更を固定６人に適用しないでください。試作サイトでの編集内容がゲーム本体へ自動反映される仕組みはありません。

## 1.0.0 からの互換性

パーツID、人物ID、８コマの書き出し寸法は同じです。工房は旧版の設定JSONとブラウザ保存を読み込み、再保存・書き出し時に `packVersion: "1.2.0"` を付けます。既存のPNG自体は変化しないため、修正した外見のPNGが必要なら再度書き出してください。

## 服装ごとの方向補正（1.2.0）

`parts.outfit[].assemblyFlipX` を服装ごとに適用します。この版ではカジュアル服が `true`、ジャケットとエプロンは `false` です。全服装を一律反転するとジャケット・エプロンが逆向きになるため、必ず各服装の値を参照してください。`true` は身体だけを首の接合点のまわりで左右反転する指定です。同梱 renderer は自動で適用します。独自描画の場合も必ずこの値を反映してください。各コマの `rect` と `neck` は反転前の原画の座標です。

この処理の後に、人物全体の `flip` を適用します。工房から書き出す合成済みPNGには身体の補正が含まれるので、PNGにもう一度 `assemblyFlipX` を適用してはいけません。1.0.0 / 1.0.1 の人物ID・パーツIDは共通で、再選択不要です。旧PNGは再出力してください。

## 1.2.0 の分類と互換性

`parts.hair/face/outfit[].styles` は `male` / `female` の配列です。共通の基本表情４種類には両方が入ります。男性向けは頭７・表情８・服３、女性向けは頭５・表情６・服３。髪色４・服色６は共通です。`styleGroup` は人物直下に保存する外見選択用の分類で、能力や役割には影響しません。

新規選択・おまかせ生成には `optionsForStyle` を使います。互換性のため `options` と `validateAppearance` は全パーツ間の既存の組み合わせ（17,280通り）も受け付けます。この数は工房の分類内の組み合わせ数ではありません。

旧版（1.0.0〜1.1.0）JSONの読み込み時は、存在しない `styleGroup` だけを `inferStyle` で補います。ID、名前、役割、appearanceは変更しません。旧服装も保持し、一覧に「以前の設定」として表示します。利用者が分類を切り替えたときだけ、不適合のパーツをその分類の先頭パーツへ置き換えます。基本表情・色など適合する選択は維持します。

新規の女性向けサンプル６人は新服装を使用します。旧版の保存済み人物は同名のサンプルで置き換えません。プリセットIDは維持していますが、サンプルの服装は版により異なります。書き出した人物JSONは `styleGroup` を含む1.2.0スキーマに従います。旧版JSONは旧版スキーマで検証してから補完してください。

女性向け３服装の `assemblyFlipX` はすべて `false`。旧３服装の画像・座標・向きは1.1.0から維持しました。

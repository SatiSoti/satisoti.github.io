# 本体担当 AI への引き継ぎ：一般キャラクター v1.2.0

この ZIP は「コミック発展国」の一般キャラクターをパーツから合成するための、追加素材パックです。本体担当 AI がゲームの作業環境で取り込んでください。素材制作側は本体リポジトリを編集していません。

## 最初に守る境界

1. ゲーム本体の `AGENTS.md` と既存の人物・描画・セーブデータの仕様を確認してください。
2. 固定６人の既存パック `comic-hatten-specialists` と、本パック `comic-hatten-general` を別の名前空間で扱ってください。一般キャラ用の着せ替えや色変更を固定６人へ適用しません。
3. 本パックのために試作サイト全体や旧ゲームをコピーしないでください。必要な素材とデータ、描画モジュールだけを組み込みます。
4. 能力、採用費、登場条件、作家の健康や意欲などのゲーム値は本体が管理します。素材側の `null` で既存値を上書きしません。
5. 未コミットの本体変更や、別の AI が作業中のファイルを上書きしないでください。接続箇所と担当範囲を確かめてから変更します。

## 取り込み手順

1. `comic-hatten-general-v1.2.0.zip` を専用フォルダーへ展開します。ZIP 直下がパック本体です。配置例は `assets/characters/comic-hatten-general/v1.2.0/` です。
2. `checksums.json` の `algorithm: "sha256"` と `files` を使って、配布物が改変・欠損していないか確認します。パスはパック直下を基準にします。
3. `manifest.json` の `format: "comic-hatten.general-character-pack"`、`packId: "comic-hatten-general"`、`schemaVersion: "1.0.0"`、`version: "1.2.0"` を確認します。
4. まず `example/` を HTTP/HTTPS で配信し、パック単独の描画を確認します。`file://` で開く形を前提にしません。
5. 既存の人物に見た目の種類を識別する項目を設け、固定キャラとパーツ合成キャラを分岐させます。既存の同等項目がある場合は、それに合わせます。
6. 一般キャラの生成時に `appearance` を一度選び、人物 ID と一緒にセーブします。ロード時は保存した ID 群を復元し、描画時に再抽選しません。
7. 本体の足元座標、縮尺、前後関係、動作状態に描画を接続します。部屋の座標系や移動ロジックをこのパックに置き換える必要はありません。
8. 既存の固定キャラとセーブデータを含めて確認し、実際に接続できた範囲を報告してください。素材を置いただけで「ゲームに組み込み済み」と扱わないでください。

## 合成キャラの保存データ

人物ごとに必要なのは、安定した人物 ID、名前、役割、パックの ID と版、５つのパーツ・色 ID です。

```js
const characterAppearance = {
  packId: 'comic-hatten-general',
  packVersion: '1.2.0',
  appearance: {
    hairId: selectedHair.id,
    faceId: selectedFace.id,
    outfitId: selectedOutfit.id,
    hairColorId: selectedHairColor.id,
    outfitColorId: selectedOutfitColor.id
  }
};
```

上の `selected...` はマニフェストに含まれる選択肢です。文字列 ID を推測せず、`pack.options` または `manifest.json` から取得してください。人物 ID と見た目の ID は別物です。同じ組み合わせの人物が２人いても、それぞれ異なる人物 ID を持てます。

名前やプロフィールを変更しても同じ人物 ID を保持します。管理画面で作った人物は `general_custom_` で始まる一意の ID（通常は UUID を使用）を持ちます。ゲーム本体の ID 体系へ変換する必要がある場合は、元 ID との対応を記録し、インポートのたびに重複作成しないようにしてください。

## 描画の接続例

```js
import { loadGeneralPack } from
  './assets/characters/comic-hatten-general/v1.2.0/renderer.mjs';

const generalPack = await loadGeneralPack(new URL(
  './assets/characters/comic-hatten-general/v1.2.0/manifest.json',
  import.meta.url
));

// character は本体側の人物。appearance はロード時・生成時にも検証します。
generalPack.validateAppearance(character.appearance);
generalPack.draw(ctx, {
  appearance: character.appearance,
  action: 'walk',
  time: animationTimeInSeconds,
  x: feetX,
  y: feetY,
  scale: 1,
  flip: movingLeft,
  shadow: true
});
```

パスは呼び出し元モジュールの位置に合わせて変更してください。`x` / `y` は足元で、`time` は秒です。上の例は本体の `character` や時計・座標変数がある前提の接続断片で、単独の HTML ではありません。単独実行には `example/` を使ってください。

頭・顔・身体はマニフェストのアンカーに従って重ねます。別エンジンへ移植する場合も、身体 → 頭 → 顔の順と、各パーツの縮尺・基準点を保ってください。画像寸法から一律の頭位置を推測しないでください。

動作は `idle`、`walk`、`work`、`cheer` の４つです。仕事中にキャラを机の奥へ描くか、身体の一部を机で隠すかは本体の描画順で調整します。動作に連動する顔の差し替えはなく、選んだ顔を保持します。左右反転はできますが、４方向分の原画はありません。

## 管理画面の人物 JSON を取り込む場合

人物 JSON の `format` は `comic-hatten.general-character` です。パックのマニフェストとは別形式で、対応するスキーマは `character.schema.json` です。`schemaVersion`、`packId`、`packVersion` を検証し、`character.appearance` を `validateAppearance` に渡してください。`character.role` は `artist` / `editor` です。

管理画面の保存先は利用者のブラウザの `localStorage` で、ゲームとの共有データベースではありません。取り込みには書き出した JSON を使います。受け取った名前などの文字列を HTML として解釈せず、表示用テキストとして扱ってください。

`gameplay.stats`、`unlockConditions`、`recruitmentCost` の `null` は未定を意味します。本体にすでに値がある場合は維持し、新規人物の場合は本体の規則で割り当てます。`implementationStatus: "not_integrated"` は素材制作時点の状態です。

## 合成済み PNG を使う場合

軽量な画像表示だけを必要とする本体では、管理画面から書き出した PNG と人物 JSON を取り込むこともできます。その場合は次の仕様を使用します。

| 項目 | 値 |
| --- | --- |
| 画像寸法 | 512 × 320 px |
| 配置 | ４列 × ２行 |
| セル寸法 | 128 × 160 px |
| 各セル内の足元 | `[64, 148]` |
| 合成時の倍率 | ２ |
| フレーム順 | `0, 1, 2, 3, 4, 5, 6, 7` |
| 待機／歩行／仕事／喜び | `0` ／ `1,2,3,4` ／ `5,6` ／ `0,7` |

人物 JSON の `exportedSheet` を正として読み込みます。フレーム `i` のセル左上は `[(i % 4) × 128, Math.floor(i / 4) × 160]` です。表示倍率１相当では画像を 0.5 倍に描き、足元も `[32, 74]` 相当になります。

**原画パーツ用の `manifest.json` の切り出し矩形・アンカーを、書き出し PNG に適用しないでください。** シート形式が異なります。合成済み PNG は見た目を焼き付けたものなので、着せ替え・色替えが必要な人物にはパーツから合成する方式を使用してください。

## 本体側で確認すること

- 保存して読み直しても同じ人物・同じ見た目になり、名前変更で人物が増えない。
- パーツ・色の ID が存在しない場合に、無言で別人へ変えず、扱いを決めて記録する。
- 待機・歩行・仕事・喜びで足元と顔の位置が不自然にずれない。
- 複数人物が独立して動き、停止・画面切り替え時の処理が既存ゲームに従う。
- 一般キャラの色変更が固定６人や他の人物に波及しない。
- 資材の読み込み失敗が分かり、外部 CDN や試作サイトへの通信を必要としない。
- 既存セーブを読み込める。既存人物の能力や採用条件を `null` で消していない。

## 更新時の扱い

本パック v1.2.0 と、固定６人の既存 v1.0.0 は変更しません。新しい素材セットは新しい版のフォルダーへ追加し、参照先を明示的に切り替えます。パーツの ID や人物 ID を別の意味で再利用しないでください。

ゲーム側で行う能力値や描画位置の調整は、ゲーム側の設定・アダプターに置くと、素材パックを次の版へ更新しやすくなります。一般キャラと固定キャラはそれぞれ独立して更新できる構成を維持してください。

## 1.0.1 の表示修正

首の接合点を襟元へ移し、顔の縦横比と配置を修正しました。顔パーツは頭部の肌マスク内に合成するため、前髪・輪郭の上に目や眉を描画しません。IDと操作APIは共通で、人物データのパーツ再選択は不要です。1.0.0 の設定JSONを引き継ぐ場合は `appearance` を検証して新パックで描画し、保存する `packVersion` を1.2.0へ更新します。旧PNGを利用している場合は再出力が必要です。

## 服装ごとの方向補正（1.2.0）

`parts.outfit[].assemblyFlipX` を服装ごとに適用します。この版ではカジュアル服が `true`、ジャケットとエプロンは `false` です。全服装を一律反転するとジャケット・エプロンが逆向きになるため、必ず各服装の値を参照してください。`true` は身体だけを首の接合点のまわりで左右反転する指定です。同梱 renderer は自動で適用します。独自描画の場合も必ずこの値を反映してください。各コマの `rect` と `neck` は反転前の原画の座標です。

この処理の後に、人物全体の `flip` を適用します。工房から書き出す合成済みPNGには身体の補正が含まれるので、PNGにもう一度 `assemblyFlipX` を適用してはいけません。1.0.0 / 1.0.1 の人物ID・パーツIDは共通で、再選択不要です。旧PNGは再出力してください。

## 世代別パーツの追加

1.2.0は頭部６種・顔６種・見本６人を追加しています。全頭部12、顔10、服３、髪色４、服色６、見本14人です。`age-heads.png` と `age-faces.png` も同梱してください。既存のパーツIDは変わりません。1.0.0〜1.0.2の設定JSONは、パーツを検証して1.2.0へ引き継げます。年齢の印象は外見だけで、ゲーム内の年齢・性別・能力値を自動で確定する仕様ではありません。

## 1.2.0：男性向け／女性向けの選択

人物直下の `styleGroup: "male" | "female"` を保存してください。外見の分類にだけ利用し、能力や役割と結び付けません。髪型・顔・服装には `styles` 配列があります。基本表情４種類と色は両方で共通です。

```js
const styleGroup = 'female';
const choices = generalPack.optionsForStyle(styleGroup);
const fields = {hairId:'hair', faceId:'face', outfitId:'outfit', hairColorId:'hairColors', outfitColorId:'outfitColors'};
const appearance = Object.fromEntries(Object.entries(fields).map(([field, key]) => {
  const list = choices[key];
  return [field, list[Math.floor(Math.random() * list.length)].id];
}));
// 人物ID・styleGroup・appearanceを一度だけ決定し、セーブへ保存する。
```

男性向け4,032通り、女性向け2,160通りです。旧版人物にstyleGroupがなければ `generalPack.inferStyle(character.appearance)` で分類のみ補完します。旧版人物のappearanceは変更しないでください。`validateAppearance` は分類をまたぐ旧組み合わせも受け付けます。旧女性キャラのcasual/jacket/apronを、ロード時にwomen_*へ自動置換しません。新規女性プリセットはwomen_casual/women_jacket/women_apronを使います。

新しい人物JSONのスキーマではstyleGroupが必須です。旧1.0.0〜1.1.0は旧スキーマで検証→分類補完→新形式保存の順に処理します。PNGの寸法・足元・８コマ構成に変更はありません。

今回の確認はネイティブCanvasによる合成画像、48コマの画像範囲、DOMハーネスによる分類切替・ランダム・復元・旧保存の保持です。実ブラウザのレイアウト／操作確認とゲームへの統合確認は未実施です。

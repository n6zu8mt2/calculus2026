# 解析学 2026 講義ページ

ビルド不要の静的サイトです（HTML / CSS / JavaScript のみ。数式表示に MathJax を CDN から読み込みます）。

## 構成
- `index.html` … トップページ
- `assets/style.css` … 共通デザイン（スマホ〜PC対応、ダークモード対応）
- `assets/common.js` … ヘッダー・目次・数式・スライダー等の共通部品
- `assets/plot.js` … Canvas グラフとドラッグ可能なハンドル
- `assets/chapter.css` … 章ページ用のスタイル（章の一覧・ゴール・前後の章ボタンなど）
- `polynomial/` … 第1回「多項式」
  - `index.html` … 第1回の目次とまとめ
  - `1-1.html` 〜 `1-6.html` … 1.1章 一次関数／1.2章 二次関数／1.3章 放物線／1.4章 イージング／1.5章 ベジェ曲線／1.6章 ラグランジュ補間
  - `polynomial.js` … 各章の図（ページにある図だけが動きます）
- `explog/` … 第2回「指数関数・対数関数」
  - `index.html` … 第2回の目次とまとめ
  - `2-1.html` 〜 `2-6.html` … 2.1章 指数を広げる／2.2章 指数関数のグラフ／2.3章 倍々ゲームの威力／2.4章 対数／2.5章 対数の応用／2.6章 ネイピア数 e
  - `explog.js` … 各章の図とチャレンジ
- `assets/game.js` … チャレンジ（ゲーム）の共通部品（ステージ・★・ヒント・答え・紙吹雪など）

## GitHub Pages で公開
リポジトリの Settings → Pages で Branch を `main`（または現在のブランチ）/ `(root)` に設定するだけです。
すべて相対パスなので `https://<user>.github.io/calculus2026/` のようなサブパスでも動作します。

## ローカルで確認
```
python3 -m http.server 8000
```
→ http://localhost:8000/ を開く（`index.html` を直接開いても動作します）。

## 新しい回の追加
1. `polynomial/` をコピーして新しいフォルダ（例：`differential/`）を作り、`2-1.html` のように章ページを作る
2. `assets/common.js` の `pages` 配列にリンクを追加し、トップの `index.html` にカードを追加する
3. CSS・JS を変更したときは、各 HTML の `?v=...` の数字を更新する（利用者のブラウザに古いファイルが残らないように）

# 解析学 2026 講義ページ

ビルド不要の静的サイトです（HTML / CSS / JavaScript のみ。数式表示に MathJax を CDN から読み込みます）。

## 構成
- `index.html` … トップページ
- `assets/style.css` … 共通デザイン（スマホ〜PC対応、ダークモード対応）
- `assets/common.js` … ヘッダー・目次・数式・スライダー等の共通部品
- `assets/plot.js` … Canvas グラフとドラッグ可能なハンドル
- `polynomial/` … 第1回「多項式」（一次関数・二次関数・イージング・ベジェ曲線）

## GitHub Pages で公開
リポジトリの Settings → Pages で Branch を `main`（または現在のブランチ）/ `(root)` に設定するだけです。
すべて相対パスなので `https://<user>.github.io/calculus2026/` のようなサブパスでも動作します。

## ローカルで確認
```
python3 -m http.server 8000
```
→ http://localhost:8000/ を開く（`index.html` を直接開いても動作します）。

## 新しいトピックの追加
1. `polynomial/` をコピーして新しいフォルダを作る
2. `assets/common.js` の `pages` 配列にリンクを追加、`index.html` のカードを追加

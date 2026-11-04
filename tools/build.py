#!/usr/bin/env python3
"""サイトの仕上げ処理（変更したら必ず実行する）

  python3 tools/build.py

1. 各回の「覚える」一覧ページ（polynomial/keys.html, explog/keys.html）を、
   各章ページの <div class="key ..."> から作り直す。
2. すべての HTML の ?v=… を現在時刻（YYYYMMDDHHMM）にそろえる（ブラウザのキャッシュ対策）。
3. よくあるミス（$…$ の中の生の "<"、未定義の \\neq など）を簡単にチェックする。
"""
import datetime
import glob
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

LECTURES = [  # (フォルダ, 回の名前, 章ファイル)
    ('polynomial', '第1章 多項式', ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6']),
    ('explog', '第2章 指数関数・対数関数', ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6']),
    ('trig', '第3章 三角関数', ['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8', '3-9']),
    ('diff', '第4章 微分', ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9']),  # 4-10（誤差逆伝播法）は偏微分の章へ移す予定で保留
]


def div_blocks(s, cls_pat):
    """class が cls_pat に合う <div> を、入れ子を数えて丸ごと取り出す"""
    out = []
    for m in re.finditer(r'<div class="(' + cls_pat + r')[^"]*">', s):
        i, depth = m.start(), 0
        for t in re.finditer(r'<div\b|</div>', s[i:]):
            depth += 1 if t.group(0) != '</div>' else -1
            if depth == 0:
                out.append(s[i:i + t.end()])
                break
    return out


def build_keys(folder, name, chapters):
    first = open(os.path.join(folder, chapters[0] + '.html'), encoding='utf-8').read()
    head = first[:first.index('<body')]
    head = re.sub(r'<title>.*?</title>', '<title>覚えることのまとめ | ' + name + ' | 解析学 2026</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="' + name + 'の各節の「覚える」をまとめたページ（印刷用）">', head)
    nav = re.search(r'<nav class="toc chapnav".*?</nav>', first, re.S).group(0)
    nav = nav.replace(' class="active" aria-current="page"', '')
    current = re.search(r'data-current="([^"]+)"', first).group(1)
    body = []
    for ch in chapters:
        s = open(os.path.join(folder, ch + '.html'), encoding='utf-8').read()
        title = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<h1>(.*?)</h1>', s, re.S).group(1))).strip()
        keys = [k for k in div_blocks(s, 'key') if 'summary' not in k[:40]]
        summ = [k for k in div_blocks(s, 'key summary')]
        body.append('    <section class="sec keys-ch">\n      <h2 class="h-sub"><a href="' + ch + '.html">' + html.escape(title) + '</a></h2>')
        body.extend('      ' + k for k in (summ or keys))
        body.append('    </section>')
    page = (head + '<body class="chapter calm keys-page">\n'
            '<header id="site-header" data-root="../" data-current="' + current + '"></header>\n\n'
            '<div class="layout">\n  ' + nav + '\n\n<main>\n'
            '  <header class="chap-hero"><div><div class="eyebrow">' + name + '</div>'
            '<h1>覚えることのまとめ</h1></div></header>\n'
            '  <p class="keys-intro">各節の「覚える｜この節のまとめ」を集めたページです。節の名前を押すとその節に移動します。'
            '<button class="btn small" type="button" onclick="window.print()">🖨 このページを印刷</button></p>\n'
            + '\n'.join(body) + '\n</main>\n</div>\n\n'
            '<footer class="site-footer">解析学 2026 ／ ' + name + ' ／ 覚えることのまとめ（tools/build.py で自動生成）</footer>\n\n'
            '<script src="../assets/common.js?v=0"></script>\n</body>\n</html>\n')
    open(os.path.join(folder, 'keys.html'), 'w', encoding='utf-8').write(page)
    print('  作成:', os.path.join(folder, 'keys.html'))


def bump_versions():
    v = datetime.datetime.now().strftime('%Y%m%d%H%M')
    n = 0
    for p in glob.glob('*.html') + glob.glob('*/*.html'):
        s = open(p, encoding='utf-8').read()
        t = re.sub(r'\?v=\d+', '?v=' + v, s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    print('  キャッシュ番号 v=' + v + '（' + str(n) + ' ファイル）')


def lint():
    bad = 0
    for p in glob.glob('*.html') + glob.glob('*/*.html'):
        s = open(p, encoding='utf-8').read()
        for m in re.finditer(r'(?<!\$)\$([^$]+)\$', s):
            if re.search(r'<(?![a-z/])', m.group(1)):
                print('  注意: $…$ の中に生の "<"（\\lt を使う）:', p, m.group(0)[:60]); bad += 1
        if re.search(r'a\s*\n?eq ?1', s.replace('\\neq', '')) and 'eq1' in s:
            print('  注意: \\neq が壊れているかも:', p); bad += 1
    print('  チェック完了（注意 ' + str(bad) + ' 件）')


if __name__ == '__main__':
    print('覚える一覧ページ:')
    for f, n, c in LECTURES:
        build_keys(f, n, c)
    print('キャッシュ番号:')
    bump_versions()
    print('チェック:')
    lint()

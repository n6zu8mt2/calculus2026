/* MathJax の設定と読み込み（全ページ共通）
 * まずサイト内の assets/vendor/mathjax（MathJax 3.2.2）を読み、失敗したら CDN を読む。
 * 色マクロ \amber{…} などは style.css の .tx-* で色がつく。 */
(function () {
  var here = document.currentScript && document.currentScript.src;
  var local = here ? here.replace(/mathjax\.js(\?.*)?$/, 'vendor/mathjax') : 'assets/vendor/mathjax';
  var CDN = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5';
  window.MathJax = {
    loader: { load: ['[tex]/html', '[tex]/cancel'] },
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$']],
      packages: { '[+]': ['html', 'cancel'] },
      macros: {
        amber: ['\\class{tx-amber}{#1}', 1],
        red: ['\\class{tx-red}{#1}', 1],
        blue: ['\\class{tx-blue}{#1}', 1],
        violet: ['\\class{tx-violet}{#1}', 1],
        teal: ['\\class{tx-teal}{#1}', 1],
        slate: ['\\class{tx-slate}{#1}', 1],
        brown: ['\\class{tx-brown}{#1}', 1]
      }
    },
    options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
    startup: {
      pageReady: function () {
        return MathJax.startup.defaultPageReady().then(function () {
          document.dispatchEvent(new Event('mathjax-ready'));
        });
      }
    }
  };
  function load(root, fallback) {
    var s = document.createElement('script');
    s.src = root + '/tex-chtml.js';
    s.defer = true;
    window.MathJax.loader.paths = { mathjax: root };
    if (fallback) s.onerror = function () { s.remove(); load(fallback, null); };
    document.head.appendChild(s);
  }
  load(local, CDN);
})();

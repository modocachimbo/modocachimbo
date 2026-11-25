/* Temas con teoría del Prospecto (Ordinario, beta): en <curso>/prospecto/temario.html agrega
   los temas de prospecto/teoria/index.json a la lista, en orden por número, como los temas de CPU.
   Cada uno abre tema-ord.html (Teoría, Ejercicios MC, Material extra, Practicar). */
(function () {
  var m = location.pathname.match(/\/([a-z0-9-]+)\/prospecto\/temario\.html$/);
  var list = document.getElementById('temaList');
  if (!m || !list) return;
  var curso = m[1];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var FLECHA = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  var LIBRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M8 7h7M8 11h5"/></svg>';
  fetch('teoria/index.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (temas) {
    if (!Array.isArray(temas) || !temas.length) return;
    var st = document.createElement('style');
    st.textContent = '.tema-card.pt-teo .tema-num{background:#C6E000;color:#151A03}' +
      '.pt-tag{flex:none;font:900 10px Nunito,sans-serif;padding:3px 7px;border-radius:7px;background:#FF5FA2;color:#fff;letter-spacing:.04em}' +
      '.pt-teo .count{display:flex;align-items:center;gap:5px}.pt-teo .count svg{width:14px;height:14px;flex:none}';
    document.head.appendChild(st);
    var anio = new URLSearchParams(location.search).get('year');
    if (!anio) {
      var p = document.querySelector('.page-title p');
      if (p) p.textContent = 'Elige un tema: teoría paso a paso, ejercicios resueltos por Modo Cachimbo, material extra y práctica.';
      // Sin año (aún no hay ciclos subidos): «atrás» vuelve a Ordinario del curso
      var back = document.querySelector('a.back');
      if (back) { back.setAttribute('href', '../ordinario.html'); var n = back.lastChild; if (n && n.nodeType === 3) n.textContent = ' Ordinario'; }
    }
    temas.forEach(function (t) {
      var a = document.createElement('a');
      a.className = 'tema-card pt-teo'; a.dataset.mcNav = 'tema';
      a.href = '../../tema-ord.html?curso=' + encodeURIComponent(curso) + '&t=' + encodeURIComponent(t.id);
      a.innerHTML = '<div class="tema-num">' + esc(t.num || '') + '</div><div class="tema-info"><div class="name">' + esc(t.titulo) +
        '</div><div class="count">' + LIBRO + '<span>Teoría · Ejercicios · Material extra</span></div></div>' +
        (t.demo ? '<span class="pt-tag">EJEMPLO</span>' : '') + FLECHA;
      list.appendChild(a);
    });
    function ordenar() {
      [].slice.call(list.querySelectorAll('.state-msg')).forEach(function (x) { x.remove(); });
      var cards = [].slice.call(list.querySelectorAll('.tema-card'));
      var num = function (c) { var n = c.querySelector('.tema-num'); return parseFloat(n ? n.textContent : '') || 999; };
      var ok = cards.every(function (c, i) { return !i || num(cards[i - 1]) <= num(c); });
      if (ok) return;
      cards.sort(function (x, y) { return num(x) - num(y); }).forEach(function (c) { list.appendChild(c); });
    }
    ordenar();
    // Los temas del año llegan después (fetch): se vuelven a ordenar
    new MutationObserver(function () { ordenar(); }).observe(list, { childList: true });
  }).catch(function () {});
})();

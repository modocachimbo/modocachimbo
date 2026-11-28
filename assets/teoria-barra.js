/* =========================================================
   Modo Cachimbo · Barra «Teoría» en el tema de CPU (<curso>/libros/tema.html)
   Si el tema tiene "teoria": "<código>" en data/<año>.json (se vincula en
   Panel → Teoría), muestra una barra delgada sobre Flashcards/Practicar
   con el avance y un botón cuadrado que abre teoria.html. Si no tiene, nada.
   ========================================================= */
(function () {
  var m = location.pathname.match(/\/([a-z0-9-]+)\/libros\/tema\.html$/);
  if (!m) return;
  var curso = m[1], q = new URLSearchParams(location.search);
  var year = q.get('year') || '', tema = q.get('tema') || '';
  if (!/^[A-Za-z0-9-]+$/.test(year) || !/^\d{1,3}$/.test(tema)) return;
  function pad(t) { return /^\d$/.test(t) ? '0' + t : t; }

  fetch('data/' + year + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (temas) {
    var t = (temas || []).filter(function (x) { return pad(String(x.num)) === pad(tema); })[0];
    var cod = t && t.teoria;
    if (!cod || !/^[a-z0-9-]+$/.test(cod)) return;
    return fetch('../teoria/index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (lista) {
      var info = (lista || []).filter(function (x) { return x.codigo === cod; })[0];
      if (!info) return;
      pintar(cod, info);
    });
  }).catch(function () {});

  function pintar(cod, info) {
    var a = {}; try { a = JSON.parse(localStorage.getItem('mc_teo_' + curso + '_' + cod) || '{}') || {}; } catch (e) {}
    var n = Math.max(1, info.partes || 1), vista = Math.min(n, a.fin ? n : (a.vista || 0));
    var st = document.createElement('style');
    st.textContent = '.mc-tbar{display:flex;align-items:center;gap:12px;background:#151127;border:2px solid #2C2549;border-bottom:4px solid #C6E000;border-radius:16px;padding:10px 10px 10px 12px;margin:0 0 16px;color:#EEEAF7;text-decoration:none;font-family:Nunito,system-ui,sans-serif;transition:transform .1s}' +
      '.mc-tbar:active{transform:translateY(2px)}' +
      '.mc-tbar .ic{width:34px;height:34px;flex:none;fill:#C6E000}' +
      '.mc-tbar .mid{flex:1;min-width:0}' +
      '.mc-tbar .tt{font:900 italic 22px "Barlow Condensed",Nunito,sans-serif;text-transform:uppercase;line-height:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}' +
      '.mc-tbar .tt small{font:800 12px Nunito,sans-serif;font-style:normal;text-transform:none;color:#A99FC8}' +
      '.mc-tbar .mini{height:7px;border-radius:99px;background:#292245;overflow:hidden;margin-top:6px}.mc-tbar .mini i{display:block;height:100%;background:#C6E000;border-radius:99px;min-width:7px}' +
      '.mc-tbar .go{width:48px;height:48px;flex:none;border-radius:13px;background:#C6E000;border-bottom:4px solid #7a8a00;display:grid;place-items:center}' +
      '.mc-tbar .go svg{width:22px;height:22px}';
    document.head.appendChild(st);
    var el = document.createElement('a');
    el.className = 'mc-tbar';
    el.href = '../../teoria.html?curso=' + encodeURIComponent(curso) + '&c=' + encodeURIComponent(cod) + '&volver=' + encodeURIComponent(curso + '/libros/tema.html?year=' + year + '&tema=' + pad(tema));
    el.setAttribute('aria-label', 'Abrir la teoría: ' + (info.titulo || ''));
    el.innerHTML = '<svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><path fill-rule="evenodd" d="M16 4h36a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H17a3 3 0 0 0 0 6h37a2 2 0 0 1 0 4H17a7 7 0 0 1-7-7V10a6 6 0 0 1 6-6zM19 4h3v48h-3zM28 14v12h20V14zm4 4h12v4H32z"/><path d="M17 54h37v2H17z" opacity=".55"/></svg>' +
      '<div class="mid"><div class="tt">Teoría <small>' + (a.fin ? 'Completa · ' + n + ' partes' : vista + ' de ' + n + (n === 1 ? ' parte' : ' partes')) + '</small></div><div class="mini"><i style="width:' + Math.round(vista / n * 100) + '%"></i></div></div>' +
      '<span class="go"><svg viewBox="0 0 24 24" fill="none" stroke="#151A03" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>';
    var cta = document.querySelector('.quiz-cta');
    if (cta && cta.parentNode) cta.parentNode.insertBefore(el, cta);
  }
})();

/* =========================================================
   Modo Cachimbo · «Siguiente tema» al terminar una práctica
   Lo usan los quiz.html de Seminarios, Banqueo y Libros (y sus plantillas).
   - showEnd() manda el evento 'mc:fin-ronda' con { anio, tema, todas }.
   - Si respondió TODAS bien y hay un tema después (en el orden del temario),
     debajo de «Repetir ronda» sale «Siguiente tema › <nombre>».
   - Al tocarlo abre el tema siguiente y empieza solo (?seguir=1), sin pasar
     por el temario ni tocar «Empezar».
   ========================================================= */
(function () {
  if (window.MCSiguienteTema) return;
  window.MCSiguienteTema = true;

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function css() {
    if (document.getElementById('mc-sig-css')) return;
    var st = document.createElement('style'); st.id = 'mc-sig-css';
    st.textContent =
      '.mc-sig-tema{display:flex;align-items:baseline;justify-content:center;flex-wrap:wrap;gap:4px 10px;width:100%;box-sizing:border-box;margin-top:12px;' +
        'padding:12px 14px 10px;border-radius:16px;border:2px solid #C6E000;border-bottom-width:5px;background:transparent;color:#C6E000;text-decoration:none;' +
        'font:900 14px/1.2 Nunito,Inter,sans-serif;text-transform:uppercase;letter-spacing:.4px;' +
        'animation:mcSigIn .45s cubic-bezier(.2,1.4,.4,1) both;-webkit-tap-highlight-color:transparent}' +
      '.mc-sig-tema:hover{background:rgba(198,224,0,.08)}' +
      '.mc-sig-tema b{font-size:18px;line-height:0;margin-left:5px;vertical-align:-1px}' +
      '.mc-sig-tema small{font:800 11.5px/1.2 Nunito,Inter,sans-serif;opacity:.8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.mc-sig-tema:active{transform:translateY(3px);border-bottom-width:2px;margin-bottom:3px}' +
      '.mc-sig-fin{flex-direction:column;align-items:center;gap:6px;cursor:default;color:#fff;border-color:#FFC800;background:rgba(255,200,0,.06)}' +
      '.mc-sig-fin small{color:#cfc8ef;opacity:1;text-transform:none;letter-spacing:0;font-size:12px}' +
      '.mc-sig-fin a{margin-top:4px;padding:8px 16px;border-radius:12px;background:#C6E000;color:#1a1f00;border-bottom:4px solid #8fa300;text-decoration:none;font:900 13px/1 Nunito,Inter,sans-serif;text-transform:uppercase;letter-spacing:.4px}' +
      '.mc-sig-fin:hover{background:rgba(255,200,0,.06)}' +
      '@keyframes mcSigIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '@media (prefers-reduced-motion:reduce){.mc-sig-tema{animation:none}}';
    document.head.appendChild(st);
  }

  document.addEventListener('mc:fin-ronda', function (e) {
    var d = e.detail || {}, fin = document.getElementById('endScreen');
    if (!fin) return;
    var viejo = fin.querySelector('.mc-sig-tema'); if (viejo) viejo.remove();
    if (!d.todas || !d.tema || !d.anio) return;
    fetch('data/' + encodeURIComponent(d.anio) + '.json').then(function (r) { return r.json(); }).then(function (temas) {
      if (!Array.isArray(temas)) return;
      var i = -1, sig = null;
      temas.forEach(function (t, k) { if (String(t.num) === String(d.tema)) i = k; });
      if (i < 0) return;
      for (var k = i + 1; k < temas.length && !sig; k++) if ((temas[k].questions || []).length) sig = temas[k];
      if (!fin.classList.contains('show') || fin.querySelector('.mc-sig-tema')) return;
      var rep = document.getElementById('btnRestart');
      css();
      // Era el último tema con preguntas: lo felicitamos y lo llevamos al temario
      if (!sig) {
        var z = document.createElement('div');
        z.className = 'mc-sig-tema mc-sig-fin';
        z.innerHTML = '<span>🎉 ¡Terminaste todos los temas!</span><small>No hay más temas después de este.</small>' +
          '<a href="temario.html?year=' + encodeURIComponent(d.anio) + '">Volver al temario</a>';
        if (rep && rep.parentNode === fin) rep.after(z); else fin.appendChild(z);
        return;
      }
      var p = new URLSearchParams(location.search);
      p.set('tema', sig.num); p.set('seguir', '1');
      var a = document.createElement('a');
      a.className = 'mc-sig-tema';
      a.href = location.pathname + '?' + p.toString();
      a.innerHTML = '<span>Siguiente tema<b>›</b></span><small>' + esc(sig.name || 'Tema ' + sig.num) + '</small>';
      if (rep && rep.parentNode === fin) rep.after(a); else fin.appendChild(a);
    }).catch(function () {});
  });

  // Llegó desde «Siguiente tema»: empieza solo apenas cargan las preguntas
  var q = new URLSearchParams(location.search);
  if (q.get('seguir') === '1') {
    q.delete('seguir');
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash); } catch (e) {}
    var n = 0, t = setInterval(function () {
      var ini = document.getElementById('startScreen'), btn = document.getElementById('btnStart');
      var cerrado = document.documentElement.classList.contains('mc-cerrado') || document.getElementById('mckFondo');
      if (++n > 80 || cerrado) { clearInterval(t); return; }
      if (ini && btn && !btn.disabled && ini.classList.contains('show') && btn.offsetParent) { clearInterval(t); btn.click(); }
    }, 150);
  }
})();

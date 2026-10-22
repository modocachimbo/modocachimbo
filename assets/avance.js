/* =========================================================
   Modo Cachimbo · Avance del temario (Libros)
   El título "Curso — 10 temas" pasa a "Curso · 4 de 10 temas" y arriba
   de los temas va una barra del ancho de las tarjetas, del color del área.
   ========================================================= */
(function () {
  var h1 = document.querySelector('.page-title h1');
  var lista = document.getElementById('temaList');
  if (!h1 || !lista) return;
  var m = h1.textContent.match(/^(.*?)\s*—\s*(\d+)\s*temas?\s*$/);
  if (!m) return;
  var curso = m[1], total = +m[2];

  var st = document.createElement('style');
  st.textContent =
    '.mc-avance{margin-top:22px}' +
    '.mc-avance .barra{height:14px;border-radius:10px;background:#231D3C;border:2px solid #2C2549;overflow:hidden}' +
    '.mc-avance .barra i{display:block;height:100%;width:0;border-radius:8px;background:var(--ac,#C6E000);box-shadow:inset 0 -3px 0 var(--ac-d,#8fa300);transition:width .8s cubic-bezier(.2,.8,.3,1)}' +
    '.mc-avance small{display:block;margin-top:8px;font:800 13px Nunito,Inter,sans-serif;color:#9a9a9a}' +
    '.mc-avance + .tema-list{margin-top:18px}';
  document.head.appendChild(st);

  function pintar() {
    var n = lista.querySelectorAll('.tema-card').length;
    if (!n) return false;
    var k = Math.min(n, total);
    h1.textContent = curso + ' · ' + (k < total ? k + ' de ' + total + ' temas' : total + ' temas');
    var caja = document.querySelector('.mc-avance');
    if (!caja) {
      caja = document.createElement('div'); caja.className = 'mc-avance';
      caja.innerHTML = '<div class="barra"><i></i></div><small></small>';
      lista.parentNode.insertBefore(caja, lista);
    }
    caja.querySelector('small').textContent = k < total
      ? 'Van ' + k + ' tema' + (k === 1 ? '' : 's') + ' publicado' + (k === 1 ? '' : 's') + '. Los demás llegan pronto.'
      : '¡Temario completo!';
    requestAnimationFrame(function () { caja.querySelector('.barra i').style.width = Math.round(k / total * 100) + '%'; });
    return true;
  }
  if (!pintar()) {
    var obs = new MutationObserver(function () { if (pintar()) obs.disconnect(); });
    obs.observe(lista, { childList: true });
  }
})();

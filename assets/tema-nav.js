/* =========================================================
   Modo Cachimbo · «Siguiente tema» en el modo estudio
   (libros/, seminarios/ y banqueo/ → tema.html)
   Al final de las preguntas sale una tarjeta con el tema anterior
   y el siguiente del mismo año. Usa el mismo data/<año>.json que la
   página (ya está en caché), así que no gasta más datos.
   El alumno la apaga o prende con el ojo «Navegación rápida» de la
   página de cada área (assets/nav-rapida.js); vale solo para los cursos
   de esa área. Viene prendida.
   ========================================================= */
(function () {
  var CSS = '' +
    '.tnav{margin:26px 0 10px;border:2px solid #322B52;border-bottom-width:5px;border-radius:20px;background:#18132B;padding:16px;font-family:Nunito,Inter,sans-serif}' +
    '.tnav-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}' +
    '.tnav-top b{font-weight:900;font-size:15px;color:var(--text,#EEEAF7)}' +
    '.tnav-top span{flex:none;white-space:nowrap;font-weight:800;font-size:12px;color:var(--text-dim,#A99FC8);letter-spacing:.5px}' +
    '.tnav-bar{height:6px;border-radius:9px;background:#272041;overflow:hidden;margin-bottom:14px}' +
    '.tnav-bar i{display:block;height:100%;background:var(--accent,#C6E000);border-radius:9px}' +
    '.tnav-btns{display:grid;grid-template-columns:1fr 1.6fr;gap:10px}' +
    '.tnav-btns.solo{grid-template-columns:1fr}' +
    '.tnav a{display:flex;align-items:center;gap:10px;text-decoration:none;border-radius:16px;padding:12px 14px;min-width:0;transition:transform .08s}' +
    '.tnav a:active{transform:translateY(4px)}' +
    '.tnav a .tx{display:flex;flex-direction:column;min-width:0}' +
    '.tnav a small{font-weight:900;font-size:11px;letter-spacing:1px;text-transform:uppercase;opacity:.8}' +
    '.tnav a em{font-style:normal;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tnav a svg{flex:none;width:20px;height:20px}' +
    '.tnav .ant{background:#1F1936;color:var(--text,#EEEAF7);border:2px solid #3a3360;border-bottom-width:5px}' +
    '.tnav .sig{background:var(--accent,#C6E000);color:#2b3300;border:2px solid var(--accent,#C6E000);box-shadow:0 5px 0 #8fa300;margin-bottom:5px;justify-content:space-between}' +
    '.tnav .sig .tx{align-items:flex-start}' +
    '.tnav .fin{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;font-size:14px;color:var(--text-dim,#A99FC8);border:2px dashed #3a3360;border-radius:16px;padding:12px}' +
    '@media (max-width:560px){.tnav-btns{grid-template-columns:1fr}.tnav .sig{order:-1}}';
  var FLECHA_I = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var FLECHA_D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function link(t, year) { return 'tema.html?year=' + encodeURIComponent(year) + '&tema=' + encodeURIComponent(t.num); }

  // ¿El alumno la apagó en el área de este curso? (assets/cursos.json dice el área)
  var areaProm = null;
  function areaDe(curso) {
    if (!areaProm) areaProm = fetch('../../assets/cursos.json').then(function (r) { return r.json(); })
      .then(function (reg) { var c = (reg.cursos || []).filter(function (x) { return x.id === curso; })[0]; return c && c.area || ''; }, function () { return ''; });
    return areaProm;
  }
  function apagada(area) { try { return !!area && localStorage.getItem('mc_nav_temas:' + area) === '0'; } catch (e) { return false; } }
  function pintar() {
    var M = window.MC_TEMA, lista = document.getElementById('qlist');
    if (!M || !lista || document.getElementById('temaNav')) return;
    areaDe(String(M.carpeta || '').split('--')[0]).then(function (area) {
      if (apagada(area)) return null;
      return fetch('data/' + M.year + '.json').then(function (r) { return r.json(); });
    }).then(function (temas) {
      if (!temas) return;
      temas = (temas || []).filter(function (t) { return t && (t.questions || []).length; });
      var i = temas.findIndex(function (t) { return String(t.num) === String(M.num); });
      if (i < 0 || temas.length < 2 || document.getElementById('temaNav')) return;
      var ant = temas[i - 1], sig = temas[i + 1];
      if (!document.getElementById('tnavCss')) { var st = document.createElement('style'); st.id = 'tnavCss'; st.textContent = CSS; document.head.appendChild(st); }
      var d = document.createElement('nav');
      d.className = 'tnav'; d.id = 'temaNav'; d.setAttribute('aria-label', 'Otros temas');
      d.innerHTML =
        '<div class="tnav-top"><b>' + (sig ? '¿Listo? Sigue con el próximo tema' : '¡Terminaste el último tema!') + '</b><span>TEMA ' + (i + 1) + ' DE ' + temas.length + '</span></div>' +
        '<div class="tnav-bar"><i style="width:' + Math.round((i + 1) / temas.length * 100) + '%"></i></div>' +
        '<div class="tnav-btns' + (ant && (sig || true) ? '' : ' solo') + '">' +
          (ant ? '<a class="ant" href="' + link(ant, M.year) + '">' + FLECHA_I + '<span class="tx"><small>Anterior</small><em>' + esc(ant.name) + '</em></span></a>' : '') +
          (sig ? '<a class="sig" href="' + link(sig, M.year) + '"><span class="tx"><small>Siguiente tema · ' + esc(sig.num) + '</small><em>' + esc(sig.name) + '</em></span>' + FLECHA_D + '</a>'
               : '<a class="sig" href="temario.html?year=' + encodeURIComponent(M.year) + '"><span class="tx"><small>Volver</small><em>Ver todos los temas</em></span>' + FLECHA_D + '</a>') +
        '</div>';
      if (!ant) d.querySelector('.tnav-btns').classList.add('solo');
      lista.parentNode.insertBefore(d, lista.nextSibling);
    }).catch(function () {});
  }
  if (window.MC_TEMA) pintar();
  document.addEventListener('mc:tema-listo', pintar);
})();

/* Temas de Ordinario con teoría (beta): en <curso>/ordinario.html lista los temas de
   <curso>/prospecto/teoria/index.json y abre cada uno en tema-ord.html (Teoría, Ejercicios MC,
   Material extra, Practicar). Si el curso aún no tiene temas, no muestra nada. */
(function () {
  var m = location.pathname.match(/\/([a-z0-9-]+)\/ordinario\.html$/);
  if (!m) return;
  var curso = m[1];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('prospecto/teoria/index.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (lista) {
    if (!Array.isArray(lista) || !lista.length) return;
    var css = '@import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,900&display=swap");' +
      '.ot-sec{margin:28px 0 12px;font:italic 900 28px/1 "Barlow Condensed","Arial Narrow",Impact,sans-serif;text-transform:uppercase;display:flex;align-items:center;gap:10px}' +
      '.ot-sec::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,#3a3360,transparent)}' +
      '.ot-lista{display:grid;gap:10px}@media(min-width:700px){.ot-lista{grid-template-columns:1fr 1fr}}' +
      '.ot-tema{display:flex;align-items:center;gap:14px;background:#151127;border:2px solid #2C2549;border-bottom:5px solid #C6E000;border-radius:18px;padding:14px;color:#EEEAF7;text-decoration:none}' +
      '.ot-n{flex:none;width:52px;height:52px;border-radius:14px;background:#C6E000;color:#151A03;display:grid;place-items:center;font:italic 900 26px "Barlow Condensed",Impact,sans-serif}' +
      '.ot-tema b{display:block;font:900 17px Nunito,sans-serif}.ot-tema small{display:block;color:#A99FC8;font:700 12.5px Nunito,sans-serif;margin-top:2px}' +
      '.ot-tag{margin-left:auto;flex:none;font:900 10px Nunito,sans-serif;padding:3px 7px;border-radius:7px;background:#FF5FA2;color:#fff}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var box = document.createElement('section');
    box.innerHTML = '<h2 class="ot-sec">Temas del prospecto</h2><div class="ot-lista">' + lista.map(function (t) {
      return '<a class="ot-tema" href="../tema-ord.html?curso=' + encodeURIComponent(curso) + '&t=' + encodeURIComponent(t.id) + '"><span class="ot-n">' + esc(t.num || '') + '</span><span><b>' + esc(t.titulo) + '</b><small>Teoría · Ejercicios MC · Material extra · Practicar</small></span>' + (t.demo ? '<span class="ot-tag">EJEMPLO</span>' : '') + '</a>';
    }).join('') + '</div>';
    var cursos = document.querySelector('.wrap .courses');
    if (cursos) cursos.parentNode.insertBefore(box, cursos.nextSibling);
  }).catch(function () {});
})();

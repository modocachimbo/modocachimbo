/* Página del área en modo Ordinario (beta): areas/<area>.html?mod=ordinario
   Es la misma página del CPU (mismo bloque de cursos), pero cada curso abre
   su página de Ordinario (<curso>/ordinario.html). El Repaso mixto es del CPU y se oculta. */
(function () {
  if (!/[?&]mod=ordinario\b/.test(location.search)) return;
  function aplicar() {
    var t = document.querySelector('.section-title');
    if (t && !t.querySelector('.ord-tag')) t.insertAdjacentHTML('beforeend', ' <span class="ord-tag">Ordinario</span>');
    var m = document.querySelector('.mixto');
    if (m) m.style.display = 'none';
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var h = a.getAttribute('href');
      if (/^\.\.\/[a-z0-9-]+\/index\.html$/.test(h)) a.setAttribute('href', h.replace(/index\.html$/, 'ordinario.html'));
    });
    var st = document.createElement('style');
    st.textContent = '.ord-tag{display:inline-block;vertical-align:middle;margin-left:8px;padding:4px 10px;border-radius:999px;background:#C6E000;color:#151A03;font:900 12px Nunito,Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase}';
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar); else aplicar();
})();

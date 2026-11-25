/* =========================================================
   Panel · Calendario propio para los campos de fecha
   El calendario que trae Chrome sale gris y feo con el tema oscuro.
   Este reemplaza al de TODOS los <input type="date"> del panel
   (Agenda, Temáticas, Anuncios, Códigos…), también los que se crean
   después. El campo sigue siendo el mismo: se puede escribir la fecha
   a mano y el valor queda como AAAA-MM-DD (input y change se disparan).
   ========================================================= */
(function () {
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  var FLECHA_I = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var FLECHA_D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  var ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/></svg>';

  var st = document.createElement('style');
  st.textContent =
    'input[type=date].fc-on{color-scheme:dark;cursor:pointer;padding-right:44px!important;background-image:none}' +
    'input[type=date].fc-on::-webkit-calendar-picker-indicator{opacity:0;pointer-events:none;width:0;margin:0;padding:0}' +
    '.fc-caja{position:relative;display:block}' +
    '.fc-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:20px;height:20px;color:var(--accent,#C6E000);pointer-events:none}' +
    '.fc-pop{position:fixed;z-index:10000;width:292px;padding:14px 14px 10px;border-radius:18px;background:#1B1631;border:2px solid #3A3360;border-bottom-width:5px;' +
      'box-shadow:0 18px 40px rgba(0,0,0,.55);font-family:Nunito,Inter,sans-serif;color:#EEEAF7;user-select:none}' +
    '.fc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}' +
    '.fc-mes{font-weight:900;font-size:16px;letter-spacing:.2px}.fc-mes span{color:#A99FC8;font-weight:800;margin-left:6px}' +
    '.fc-nav{display:flex;gap:6px}' +
    '.fc-nav button{width:34px;height:34px;border-radius:11px;border:2px solid #3A3360;border-bottom-width:4px;background:#241E40;color:#EEEAF7;display:grid;place-items:center;cursor:pointer;padding:0}' +
    '.fc-nav button svg{width:16px;height:16px}.fc-nav button:hover{border-color:#5A5190}.fc-nav button:active{transform:translateY(2px);border-bottom-width:2px}' +
    '.fc-sem,.fc-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}' +
    '.fc-sem b{font-size:11px;font-weight:900;color:#6F6690;text-align:center;padding:4px 0 6px;letter-spacing:.5px}' +
    '.fc-dias button{height:36px;border-radius:11px;border:0;background:none;color:#EEEAF7;font:800 14px Nunito,Inter,sans-serif;cursor:pointer;padding:0}' +
    '.fc-dias button:hover{background:#2A2348}' +
    '.fc-dias button.fuera{color:#4F4772}' +
    '.fc-dias button.finde{color:#C9C1E6}' +
    '.fc-dias button.hoy{box-shadow:inset 0 0 0 2px rgba(198,224,0,.65);color:var(--accent,#C6E000)}' +
    '.fc-dias button.sel{background:var(--accent,#C6E000);color:#1b2000;box-shadow:0 3px 0 #8fa300}' +
    '.fc-pie{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:9px;border-top:1px solid #2F284E}' +
    '.fc-pie button{border:0;background:none;font:800 13px Nunito,Inter,sans-serif;cursor:pointer;padding:6px 8px;border-radius:9px}' +
    '.fc-pie .fc-hoy{color:var(--accent,#C6E000)}.fc-pie .fc-borrar{color:#A99FC8}.fc-pie button:hover{background:#2A2348}';
  document.head.appendChild(st);

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function iso(a, m, d) { return a + '-' + dos(m + 1) + '-' + dos(d); }
  function hoyIso() { var h = new Date(); return iso(h.getFullYear(), h.getMonth(), h.getDate()); }

  var pop = null, campo = null, vista = null;
  function cerrar() { if (pop) { pop.remove(); pop = null; campo = null; } }
  function poner(v) {
    if (!campo) return;
    campo.value = v;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function pintar() {
    var a = vista.a, m = vista.m, sel = campo.value, hoy = hoyIso();
    var min = campo.min || '', max = campo.max || '';
    var primero = (new Date(a, m, 1).getDay() + 6) % 7;   // lunes = 0
    var html = '';
    for (var i = 0; i < 42; i++) {
      var f = new Date(a, m, 1 - primero + i), v = iso(f.getFullYear(), f.getMonth(), f.getDate());
      if (i >= 35 && f.getMonth() !== m) break;            // sin fila sobrante
      var cl = (f.getMonth() !== m ? ' fuera' : '') + (f.getDay() === 0 || f.getDay() === 6 ? ' finde' : '') + (v === hoy ? ' hoy' : '') + (v === sel ? ' sel' : '');
      var off = (min && v < min) || (max && v > max);
      html += '<button type="button" data-v="' + v + '" class="' + cl.trim() + '"' + (off ? ' disabled style="opacity:.3;cursor:default"' : '') + '>' + f.getDate() + '</button>';
    }
    pop.innerHTML =
      '<div class="fc-top"><div class="fc-mes">' + MESES[m] + '<span>' + a + '</span></div>' +
        '<div class="fc-nav"><button type="button" data-n="-1" aria-label="Mes anterior">' + FLECHA_I + '</button><button type="button" data-n="1" aria-label="Mes siguiente">' + FLECHA_D + '</button></div></div>' +
      '<div class="fc-sem">' + DIAS.map(function (d) { return '<b>' + d + '</b>'; }).join('') + '</div>' +
      '<div class="fc-dias">' + html + '</div>' +
      '<div class="fc-pie"><button type="button" class="fc-borrar" data-x="borrar">Borrar</button><button type="button" class="fc-hoy" data-x="hoy">Hoy</button></div>';
    ubicar();
  }
  function ubicar() {
    if (!pop || !campo) return;
    var r = campo.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    var top = r.bottom + 8;
    if (top + h > innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    pop.style.top = Math.max(8, top) + 'px';
    pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  }
  function abrir(inp) {
    if (pop && campo === inp) return;
    cerrar();
    campo = inp;
    var base = /^\d{4}-\d{2}-\d{2}$/.test(inp.value) ? inp.value : (inp.min && inp.min > hoyIso() ? inp.min : hoyIso());
    vista = { a: +base.slice(0, 4), m: +base.slice(5, 7) - 1 };
    pop = document.createElement('div');
    pop.className = 'fc-pop';
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Elegir fecha');
    pop.addEventListener('mousedown', function (e) { e.preventDefault(); });   // no le quita el foco al campo
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.n) { vista.m += +b.dataset.n; if (vista.m < 0) { vista.m = 11; vista.a--; } if (vista.m > 11) { vista.m = 0; vista.a++; } pintar(); return; }
      if (b.dataset.v) { poner(b.dataset.v); cerrar(); return; }
      if (b.dataset.x === 'hoy') { poner(hoyIso()); cerrar(); return; }
      if (b.dataset.x === 'borrar') { poner(''); cerrar(); }
    });
    document.body.appendChild(pop);
    pintar();
  }
  // Cada campo de fecha: ícono propio y abre este calendario al tocarlo
  function preparar(inp) {
    if (inp._fc) return;
    inp._fc = true;
    inp.classList.add('fc-on');
    var caja = document.createElement('span'); caja.className = 'fc-caja';
    inp.parentNode.insertBefore(caja, inp); caja.appendChild(inp);
    caja.insertAdjacentHTML('beforeend', '<span class="fc-ico">' + ICONO + '</span>');
    inp.addEventListener('click', function (e) { e.preventDefault(); abrir(inp); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); abrir(inp); }
    });
    // Si escribe la fecha a mano, el calendario la sigue
    inp.addEventListener('input', function () { if (pop && campo === inp && /^\d{4}-\d{2}-\d{2}$/.test(inp.value)) { vista = { a: +inp.value.slice(0, 4), m: +inp.value.slice(5, 7) - 1 }; pintar(); } });
    // Chrome abre el suyo con showPicker(): se cambia por este
    try { inp.showPicker = function () { abrir(inp); }; } catch (e) {}
  }
  function revisar(raiz) {
    if (raiz.matches && raiz.matches('input[type=date]')) preparar(raiz);
    if (raiz.querySelectorAll) [].forEach.call(raiz.querySelectorAll('input[type=date]'), preparar);
  }
  document.addEventListener('mousedown', function (e) { if (pop && !pop.contains(e.target) && e.target !== campo) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  addEventListener('resize', cerrar);
  addEventListener('scroll', ubicar, true);
  revisar(document.body);
  new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) revisar(n); }); if (pop && campo && !campo.isConnected) cerrar(); }); })
    .observe(document.body, { childList: true, subtree: true });
})();

/* Práctica a lo ancho: en tablet y PC la tarjeta del quiz usa casi toda la pantalla.
   - Celular (< 640 px): igual que antes.
   - Tablet vertical (640–899): la tarjeta llena el ancho, letra un poco más grande.
   - Tablet horizontal / PC (>= 900 y pantalla echada): tarjeta ancha con la pregunta a la
     izquierda y las alternativas a la derecha, para que todo entre sin bajar.
   - Pantallas anchas pero no echadas (>= 900): tarjeta de 880–980 px; si todas las alternativas
     son cortas, van en 2 columnas.
   Se carga en el <head> (después del <style> de la página) para que no se vea un salto. */
(function () {
  var css = '' +
    '@media (min-width:640px){' +
      'html body{padding:20px 16px!important}' +
      'html body .card{max-width:calc(100vw - 32px)!important}' +
      'html body .question p{font-size:18px!important}' +
      'html body .option span.text{font-size:16.5px!important}' +
    '}' +
    '@media (min-width:900px){' +
      'html body{padding:28px 24px!important}' +
      'html body .card{max-width:880px!important}' +
      'html body .question p{font-size:20px!important}' +
      'html body .option span.text{font-size:17.5px!important}' +
      'html body .options.op-2{display:grid!important;grid-template-columns:1fr 1fr;align-items:start}' +
      'html body .options.op-2 .option{height:100%;box-sizing:border-box}' +
    '}' +
    /* Pantalla echada (tablet horizontal, PC): pregunta a la izquierda, alternativas a la derecha */
    '@media (min-width:900px) and (min-aspect-ratio:4/3){' +
      'html body .card{max-width:min(1240px,calc(100vw - 48px))!important}' +
      /* Dos columnas independientes: izquierda = tema + pregunta + gráfico; derecha = alternativas + aviso +
         botones. Así el gráfico va pegado debajo de la pregunta (antes quedaba abajo de todo, fuera de la
         pantalla) y los botones no bajan aunque el gráfico sea alto. */
      'html body .qa-split.qa-dos:not([style*="none"]){display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);column-gap:26px;align-items:start;padding:0 28px}' +
      'html body .qa-split>.qa-col>*{margin-left:0!important;margin-right:0!important}' +
      'html body .qa-split>.qa-izq>.badge{display:inline-flex}' +
      'html body .qa-split>.qa-izq>.question{margin-bottom:12px!important}' +
      'html body .qa-split>.qa-izq>.q-graphic{margin:0!important}' +
      /* El gráfico entra en la pantalla: alto máximo según el alto de la ventana, sin deformarse */
      'html body .qa-split .q-graphic img,html body .qa-split .q-graphic svg{max-height:var(--qa-graf-alto,max(220px,calc(100vh - 330px)))!important;width:auto!important;max-width:100%!important;height:auto!important;object-fit:contain}' +
      'html body .qa-split>.qa-der>.options{padding:0!important}' +
      'html body .qa-split>.qa-der>.navrow{padding-left:0!important;padding-right:0!important}' +
      'html body .qa-split>.qa-der>.options.op-2{grid-template-columns:1fr}' +
      /* Con gráfico (como en el examen): pregunta a la izquierda, gráfico a la derecha y las
         alternativas debajo, a todo el ancho */
      'html body .qa-split.qa-dos.qa-graf:not([style*="none"]){grid-template-columns:minmax(0,1fr) minmax(0,.9fr);column-gap:22px;row-gap:0}' +
      'html body .qa-split.qa-graf>.qa-izq{display:contents}' +
      'html body .qa-split.qa-graf>.qa-izq>.badge{grid-column:1/-1;grid-row:1;justify-self:start}' +
      'html body .qa-split.qa-graf>.qa-izq>.question{grid-column:1/-1;grid-row:2}' +
      'html body .qa-split.qa-graf>.qa-izq>.q-graphic{grid-column:2;grid-row:3;align-self:start;margin:4px 0 0!important}' +
      'html body .qa-split.qa-graf>.qa-der{grid-column:1;grid-row:3}' +
      'html body .qa-split.qa-graf>.qa-der>.options{padding:4px 0 0!important}' +
      /* Atrás / Siguiente: abajo del todo, a la derecha (debajo de la pregunta y de las claves) */
      'html body .qa-split.qa-dos>.navrow{grid-column:1/-1;width:min(560px,100%);justify-self:end;margin:14px 0 0!important;padding-left:0!important;padding-right:0!important}' +
      'html body .qa-split>.qa-der>.navrow{padding-left:0!important;padding-right:0!important}' +
      'html body .qa-split .qa-oculta{display:none!important}' +
      /* Gráfico aparte: al centro, debajo de la pregunta (las claves debajo, en columnas) */
      'html body .qa-split.qa-centro .q-graphic{display:flex!important;justify-content:center;align-items:center;width:100%;margin:0 0 14px!important;box-sizing:border-box;background:#fff;border-radius:14px;padding:14px}' +
      /* Imagen derecha: el recuadro blanco ocupa todo el alto de las claves y la imagen lo llena, centrada */
      'html body .qa-split.qa-graf>.qa-izq>.qa-fig{align-self:stretch!important;position:relative;min-height:240px;background:#fff;border-radius:14px;padding:0!important;margin:4px 0 0!important;box-sizing:border-box}' +
      'html body .qa-split.qa-graf>.qa-izq>.qa-fig>img,html body .qa-split.qa-graf>.qa-izq>.qa-fig>svg{position:absolute;top:12px;left:12px;width:calc(100% - 24px)!important;height:calc(100% - 24px)!important;max-width:none!important;max-height:none!important;object-fit:contain;margin:0!important;border-radius:0!important}' +
      /* Sin gráfico: alternativas en UNA columna (A, B, C, D, E una debajo de otra) a la derecha */
      'html body .qa-split:not(.qa-graf):not(.qa-apilada)>.qa-der>.options{display:grid!important;grid-template-columns:minmax(0,1fr)!important}' +
      /* Pregunta corta con alternativas largas: pregunta arriba a todo el ancho y alternativas abajo */
      'html body .qa-split.qa-dos.qa-apilada:not([style*="none"]){grid-template-columns:minmax(0,1fr)}' +
      'html body .qa-split.qa-apilada>.qa-col{grid-column:1}' +
      'html body .qa-split.qa-apilada>.qa-der>.options{padding:4px 0 0!important}' +

      'html body .qa-split.qa-ap2>.qa-der>.options{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
      'html body .qa-split.qa-ap5>.qa-der>.options{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important}' +
      'html body .qa-split.qa-ap3>.qa-der>.options{grid-template-columns:repeat(3,minmax(0,1fr))!important}' +
      'html body .qa-split.qa-ap5>.qa-der>.options,html body .qa-split.qa-ap3>.qa-der>.options,html body .qa-split.qa-ap2>.qa-der>.options{display:grid!important}' +
      'html body .qa-split.qa-ap1>.qa-der>.options{display:grid!important;grid-template-columns:minmax(0,1fr)!important}' +
      /* Con imagen, igual que en el panel: pregunta arriba a todo el ancho, claves a la izquierda
         (una debajo de otra) y la imagen a su lado */
      'html body .qa-split.qa-graf>.qa-der>.options{display:grid!important;grid-template-columns:minmax(0,1fr)!important}' +
      'html body .qa-split .qa-fig{display:flex;justify-content:center}' +
      'html body .qa-split .qa-fig .mcq-graf{width:100%;margin:0}' +
      'html body .qa-split .option{padding:12px 16px!important}' +
      'html body .qa-split .option span.text{font-size:16.5px!important}' +
      'html body .qa-split .question{padding:18px 22px!important}' +
      'html body .qa-split .question p{font-size:19px!important}' +
      'html body .card .header{padding:18px 28px 10px!important}' +
      'html body .card .title{font-size:24px!important}' +
      'html body .card .topbar{margin-top:8px}' +
      'html body .card .progress-track{margin-top:10px}' +
      'html body .card .footer{padding:12px 28px 14px!important}' +
      /* Pantalla de inicio (búho + título | cuadros + Empezar + Cómo funciona) y pantalla final (búho | puntaje) */
      'html body .qa-dos.show{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);column-gap:34px;align-items:center;padding:26px 32px!important}' +
      'html body .qa-dos>.qa-col{display:block;min-width:0}' +
      'html body .qa-dos .rp-hero{margin-top:0!important}' +
      'html body .qa-dos .qa-izq .rp-buho{margin:0 auto!important}' +
      'html body .endscreen.qa-dos{grid-template-columns:minmax(0,.8fr) minmax(0,1fr)}' +
      'html body .endscreen.qa-dos .qa-izq .rp-buho{transform:scale(1.35);margin:34px auto!important}' +
    '}' +
    '@media (min-width:1280px){' +
      'html body .card{max-width:980px!important}' +
      'html body .question p{font-size:21px!important}' +
      'html body .option span.text{font-size:18px!important}' +
    '}';
  var st = document.createElement('style');
  st.id = 'quiz-ancho';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  // Columnas para inicio y final: fuera de la pantalla echada son display:contents (no cambian nada)
  st.textContent += '.qa-col{display:contents}';
  function col(caja, cls, hijos) {
    var c = document.createElement('div');
    c.className = 'qa-col ' + cls;
    caja.insertBefore(c, hijos[0]);
    for (var i = 0; i < hijos.length; i++) c.appendChild(hijos[i]);
    return c;
  }
  function dosColumnas(caja, corte) {
    if (!caja || caja._qaCol) return;
    var hijos = [].slice.call(caja.children);
    var k = -1;
    for (var i = 0; i < hijos.length; i++) if (corte(hijos[i], i)) { k = i; break; }
    if (k <= 0) return;
    caja._qaCol = true;
    col(caja, 'qa-izq', hijos.slice(0, k));
    var der = col(caja, 'qa-der', hijos.slice(k));
    caja.classList.add('qa-dos');
    // Lo que se agregue después (ej. «Siguiente tema») va a la columna derecha
    new MutationObserver(function () {
      if (!der.parentNode) { caja._qaCol = false; caja.classList.remove('qa-dos'); return; }
      [].slice.call(caja.children).forEach(function (h) { if (!h.classList.contains('qa-col') && !h.classList.contains('navrow')) der.appendChild(h); });
    }).observe(caja, { childList: true });
  }
  function pantallas() {
    var ini = document.querySelector('.card .startscreen');
    if (ini && ini.querySelector(':scope > .rp-hero') && ini.querySelector(':scope > .rp-stats'))
      dosColumnas(ini, function (h) { return h.classList.contains('rp-stats'); });
    var fin = document.querySelector('.card .endscreen');
    if (fin && fin.firstElementChild && fin.firstElementChild.classList.contains('rp-buho') && fin.children.length > 1)
      dosColumnas(fin, function (h, i) { return i === 1; });
  }

  var CORTA = 34;
  function revisar(box) {
    var ops = box.querySelectorAll('.option');
    var ok = ops.length >= 2;
    for (var i = 0; ok && i < ops.length; i++) {
      var t = ops[i].querySelector('.text') || ops[i];
      if (t.querySelector('img, table, svg, .katex-display, .mcq-base-ancha')) ok = false;
      else if ((t.textContent || '').replace(/\s+/g, ' ').trim().length > CORTA) ok = false;
    }
    box.classList.remove('op-2');   // las claves se ven igual que en el panel (sin columnas extra)
    var padre = box.parentElement;
    if (padre && padre.querySelector(':scope > .question')) {
      padre.classList.add('qa-split');
      // Izquierda: todo lo que va antes de las alternativas; derecha: desde las alternativas
      dosColumnas(padre, function (h) { return h === box; });
    }
  }
  function vigilar(box) {
    if (box._qa) return;
    box._qa = true;
    revisar(box);
    new MutationObserver(function () { revisar(box); }).observe(box, { childList: true, subtree: true, characterData: true });
  }
  // El gráfico usa el alto que queda desde donde empieza hasta el borde de la pantalla
  // (mínimo 200 px), así en una laptop se ve completo sin bajar
  var ECHADA = window.matchMedia ? window.matchMedia('(min-width:900px) and (min-aspect-ratio:4/3)') : null;
  // Imagen [IMG-DER] (pregunta.js la pone dentro de la lista de alternativas, a su lado): en PC
  // echada se pasa al lado derecho de la pregunta, igual que el gráfico, y las alternativas abajo
  function imagenDerecha() {
    var caja = document.querySelector('.qa-split');
    if (!caja) return;
    var ops = caja.querySelector('.options'), fig = ops && ops.querySelector(':scope > .mcq-der');
    var hold = caja.querySelector('.qa-fig'), q = caja.querySelector('.question');
    if (!fig || !ECHADA || !ECHADA.matches) {
      if (hold) hold.remove();
      if (fig) { fig.classList.remove('qa-oculta'); ops.classList.add('mcq-con-der'); }
      return;
    }
    if (!fig.classList.contains('qa-oculta') || !hold) {
      if (!hold) { hold = document.createElement('div'); hold.className = 'q-graphic qa-fig'; }
      if (q && hold.previousSibling !== q) q.parentNode.insertBefore(hold, q.nextSibling);
      hold.innerHTML = fig.innerHTML;
      fig.classList.add('qa-oculta');
    }
    ops.classList.remove('mcq-con-der');
  }
  // ¿Pregunta corta y alternativas largas? Entonces van una debajo de la otra (no lado a lado)
  function forma(caja, conGraf) {
    if (!caja) return;
    var q = caja.querySelector('.question'), ops = caja.querySelectorAll('.options .option');
    // Largo de lo que se VE (sin la copia oculta que KaTeX guarda de cada fórmula)
    function largo(el) {
      if (!el) return 0;
      var n = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
      var ms = el.querySelectorAll('.katex-mathml');
      for (var k = 0; k < ms.length; k++) n -= (ms[k].textContent || '').replace(/\s+/g, ' ').trim().length;
      return Math.max(0, n);
    }
    var lq = largo(q), mx = 0, larga = false;
    for (var i = 0; i < ops.length; i++) {
      var t = ops[i].querySelector('.text') || ops[i];
      mx = Math.max(mx, largo(t));
      if (t.querySelector('table, .katex-display, .mcq-base-ancha')) larga = true;
    }
    // Claves a la derecha: empiezan a la altura de la pregunta (no del rótulo del tema)
    var der = caja.querySelector(':scope > .qa-der'), izq = caja.querySelector(':scope > .qa-izq');
    if (der) der.style.marginTop = '';
    // Pregunta con tabla (Estadística): a todo el ancho para que la tabla entre completa
    var tabla = !!(q && q.querySelector('table'));
    function aplicar(ap) {
      if (der) der.style.marginTop = '';
      // Botones: con claves a la derecha, justo debajo de ellas; con claves abajo, al final a la derecha
      var nav = caja.querySelector(':scope > .navrow') || caja.querySelector(':scope > .qa-col > .navrow');
      if (nav && der) {
        if (ap || conGraf) { if (nav.parentNode !== caja) caja.appendChild(nav); }
        else if (nav.parentNode !== der) der.appendChild(nav);
      }
      caja.classList.toggle('qa-apilada', ap);
      // Claves de hasta ~110 letras: en dos columnas; cortas (hasta ~30): todas en una fila
      // Claves abajo: muy cortas (números, fracciones) en una fila; cortas en 3 columnas;
      // medianas en 2; largas una debajo de otra
      // Claves según su largo: muy cortas (números, fracciones) las 5 en una fila; cortas en 3
      // columnas; medianas en 2; largas una debajo de otra (también con gráfico)
      caja.classList.toggle('qa-ap5', !larga && mx <= 14);
      caja.classList.toggle('qa-ap3', !larga && mx > 14 && mx <= 40);
      caja.classList.toggle('qa-ap2', !larga && mx > 40 && mx <= 110 && ops.length >= 4);
      caja.classList.toggle('qa-ap1', larga || mx > 110 || (mx > 40 && ops.length < 4));
      if (der && q && izq && !ap && !conGraf && ECHADA && ECHADA.matches) {
        var dy = q.getBoundingClientRect().top - izq.getBoundingClientRect().top;
        if (dy > 0) der.style.marginTop = Math.round(dy) + 'px';
      }
    }
    // Igual que en el panel: la pregunta completa arriba y las claves debajo (en 1, 2, 3 o 5
    // columnas según su largo). Solo con gráfico o imagen: pregunta a la izquierda, imagen a la
    // derecha y claves abajo.
    var clave = '', ap = !conGraf;
    caja._qaClave = clave; caja._qaAp = ap;
    aplicar(ap);
  }
  function altoGrafico() {
    imagenDerecha();
    var fig = document.querySelector('.qa-split .qa-fig');               // [IMG-DER]: al lado de las claves
    var gc = document.querySelector('.qa-split .q-graphic:not(.qa-fig)'); // gráfico aparte: al centro
    var caja = (fig || gc) && (fig || gc).closest('.qa-split');
    if (!caja) return;
    var der = !!fig && !!fig.innerHTML.trim();
    var centro = !der && !!gc && gc.style.display !== 'none' && !!gc.innerHTML.trim();
    caja.classList.toggle('qa-graf', der);
    caja.classList.toggle('qa-centro', centro);
    forma(caja, der);
    var g = der ? fig : centro ? gc : null;
    [fig, gc].forEach(function (x) { if (x && x !== g) x.style.removeProperty('--qa-graf-alto'); });
    if (!g || !ECHADA || !ECHADA.matches) { if (g) g.style.removeProperty('--qa-graf-alto'); return; }
    var arriba = g.getBoundingClientRect().top + (window.scrollY || 0), alto;
    if (der) {
      // Al lado de las claves: lo que queda de pantalla (menos los botones)
      alto = Math.max(220, Math.min(Math.round(window.innerHeight * 0.62), Math.round(window.innerHeight - arriba - 90)));
    } else {
      // Al centro, entre la pregunta y las claves: que deje ver las claves
      alto = Math.max(260, Math.min(Math.round(window.innerHeight * 0.55), Math.round(window.innerHeight - arriba - 200)));
    }
    g.style.setProperty('--qa-graf-alto', alto + 'px');
  }
  window.addEventListener('resize', altoGrafico);
  // La pregunta se vuelve a pintar (innerHTML) al empezar: se buscan las cajas nuevas
  function buscar() {
    var cajas = document.querySelectorAll('.card .options');
    for (var i = 0; i < cajas.length; i++) vigilar(cajas[i]);
    pantallas();
    altoGrafico();
  }
  var pend = false;
  function iniciar() {
    buscar();
    new MutationObserver(function () {
      if (pend) return; pend = true;
      (window.requestAnimationFrame || setTimeout)(function () { pend = false; buscar(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

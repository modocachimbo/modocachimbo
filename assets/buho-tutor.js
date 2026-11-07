/* =========================================================
   Modo Cachimbo · Búho tutor
   Resolución guardada de cada pregunta, en 3 niveles. Se escribe en el
   panel (Subir tema o Editar pregunta) y va en el JSON del tema:
     q.res = { rapido: '…', pasos: '…', cero: '…' }   (cualquiera puede faltar)
   No usa IA en vivo: el alumno solo lee lo guardado.

   - Modo estudio (tema.html): al evento mc:tema-listo pone el botón
     "Búho tutor" en cada pregunta que tenga resolución.
   - Práctica, Repaso, Fijas y Falladas: después de responder, la página
     llama MCBuhoTutor.feedback(feedback, q) y el botón sale debajo.
   - MCBuhoTutor.boton(q, {num}) y MCBuhoTutor.abrir(q, {num}) para otras páginas.
   Se ve como chat: primero el nivel más corto que haya, revelado línea
   por línea (tocar el globo lo muestra todo), y abajo las burbujas
   "Explícame paso a paso" / "Explícame desde cero". El búho es el oficial
   (assets/buho/avatar/<área>.webp), disfrazado según el área del curso.
   La carga assets/pregunta.js. El texto se arma con MCPregunta.armar
   (fórmulas, negrita, tablas y [GRÁFICO] igual que en las preguntas).
   ========================================================= */
(function () {
  if (window.MCBuhoTutor) return;
  var script = document.currentScript;
  var RAIZ = script ? new URL('../', script.src).href : '/';

  var NIVELES = [
    { k: 'rapido', ico: '⚡', nom: 'Al toque', sub: 'Para los que ya tienen base: lo directo' },
    { k: 'pasos', ico: '📝', nom: 'Paso a paso', sub: 'Explicado con calma, sin saltarse pasos' },
    { k: 'cero', ico: '🍎', nom: 'Desde cero', sub: 'Si recién empiezas: con ejemplos de la vida diaria' }
  ];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function niveles(q) {
    var r = q && q.res;
    if (!r || typeof r !== 'object') return [];
    return NIVELES.filter(function (n) { return typeof r[n.k] === 'string' && r[n.k].trim(); });
  }
  function tiene(q) { return niveles(q).length > 0; }

  // El búho oficial (verde), disfrazado según el área del curso: assets/buho/avatar/<área>.webp
  // (misma tabla que assets/buho/escena.js). Fuera de un curso, el clásico.
  var AREAS = {
    biologia: 'ciencia-tecnologia', anatomia: 'ciencia-tecnologia', quimica: 'ciencia-tecnologia', fisica: 'ciencia-tecnologia',
    algebra: 'matematica', aritmetica: 'matematica', geometria: 'matematica', trigonometria: 'matematica', estadistica: 'matematica',
    'raz-verbal': 'comunicacion', literatura: 'comunicacion', lenguaje: 'comunicacion',
    'historia-peru': 'ciencias-sociales', 'historia-universal': 'ciencias-sociales', geografia: 'ciencias-sociales', economia: 'ciencias-sociales',
    ciudadania: 'ciencias-sociales', psicologia: 'ciencias-sociales', filosofia: 'ciencias-sociales'
  };
  function areaActual() {
    var rel = location.href.indexOf(RAIZ) === 0 ? location.href.slice(RAIZ.length) : location.pathname.replace(/^\//, '');
    var curso = rel.split(/[/?#]/)[0];
    if (AREAS[curso]) return AREAS[curso];
    var a = document.documentElement.getAttribute('data-area');
    return a && /^(matematica|ciencia-tecnologia|comunicacion|ciencias-sociales)$/.test(a) ? a : 'clasico';
  }
  function buho(tam) {
    return '<img src="' + RAIZ + 'assets/buho/avatar/' + areaActual() + '.webp" width="' + tam + '" height="' + tam + '" alt="" decoding="async">';
  }

  var CSS =
    '.bt-btn{display:inline-flex;align-items:center;gap:7px;font:800 13px/1 "Nunito","Inter",sans-serif;color:#0B0B0B;background:#C6E000;border:0;border-bottom:3px solid #9DB300;border-radius:12px;padding:7px 12px 6px 8px;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.bt-btn:hover{filter:brightness(1.05)}.bt-btn:active{transform:translateY(1px);border-bottom-width:2px}.bt-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '.bt-btn .bt-ico{width:24px;height:24px;display:inline-grid;place-items:center}.bt-btn .bt-ico svg,.bt-btn .bt-ico img{width:24px;height:24px}' +
    '.rep-row.bt-fila{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}' +
    '.bt-fb{margin-top:10px}' +
    '.bt-velo{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;animation:btVelo .2s ease}' +
    '.bt-sheet{--bt-bg:#14161B;--bt-tx:#EDEFF3;--bt-dim:#9AA0AB;--bt-caja:rgba(255,255,255,.045);--bt-borde:rgba(255,255,255,.09);--bt-chip:rgba(255,255,255,.07);--bt-chiptx:#C9CDD5;--bt-acento:#C6E000;' +
    'position:fixed;z-index:9999;background:var(--bt-bg);color:var(--bt-tx);display:flex;flex-direction:column;font-family:"Inter",sans-serif;box-shadow:0 -10px 40px rgba(0,0,0,.45)}' +
    'html[data-modo="claro"] .bt-sheet{--bt-bg:#fff;--bt-tx:#1B1B22;--bt-dim:#6A6878;--bt-caja:#F5F6EE;--bt-borde:#E4E4DA;--bt-chip:#F0F0E8;--bt-chiptx:#3A3A44;--bt-acento:#5E7300}' +
    '@media (max-width:899px){.bt-sheet{left:0;right:0;bottom:0;max-height:88vh;height:88vh;border-radius:22px 22px 0 0;animation:btSube .25s ease}}' +
    '@media (min-width:900px){.bt-sheet{top:0;right:0;bottom:0;width:480px;border-left:1px solid var(--bt-borde);animation:btLado .25s ease}}' +
    '@keyframes btVelo{from{opacity:0}}@keyframes btSube{from{transform:translateY(40px);opacity:.4}}@keyframes btLado{from{transform:translateX(40px);opacity:.4}}' +
    '@media (prefers-reduced-motion:reduce){.bt-sheet,.bt-velo{animation:none}}' +
    '.bt-asa{width:42px;height:5px;border-radius:3px;background:var(--bt-borde);margin:8px auto 0;flex:none}@media (min-width:900px){.bt-asa{display:none}}' +
    '.bt-head{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;flex:none}' +
    '.bt-head .bt-av{width:44px;height:44px;flex:none;display:grid;place-items:center}.bt-head .bt-av svg,.bt-head .bt-av img{width:44px;height:44px}' +
    '.bt-head b{font:800 17px "Sora","Inter",sans-serif;display:block}.bt-head small{color:var(--bt-dim);font-size:12.5px;display:block;margin-top:1px}' +
    '.bt-x{margin-left:auto;flex:none;background:var(--bt-chip);border:0;color:inherit;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer}' +
    '.bt-x:focus-visible{outline:2px solid var(--bt-acento);outline-offset:2px}' +
    '.bt-body{flex:1;overflow:auto;padding:4px 16px 18px;font-size:15px;line-height:1.6;overscroll-behavior:contain}' +
    '.bt-clave{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font:800 13.5px "Nunito","Inter",sans-serif;color:#58CC02;background:rgba(88,204,2,.1);border:1.5px solid rgba(88,204,2,.35);border-radius:12px;padding:8px 12px;margin-bottom:10px}' +
    '.bt-clave .bt-op{color:var(--bt-tx);font-weight:700}' +
    '.bt-texto .mcq-p{display:block;margin:0 0 10px}.bt-texto .mcq-p:last-child{margin-bottom:0}' +
    '.bt-texto strong{color:var(--bt-acento)}.bt-texto .katex-display{overflow-x:auto;overflow-y:hidden;margin:.5em 0;padding:2px 0}' +
    '.bt-pie{border-top:1px solid var(--bt-borde);padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));flex:none}.bt-pie:empty{display:none}' +
    '.bt-sugs{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}' +
    '.bt-sug{font:800 13.5px "Nunito","Inter",sans-serif;color:var(--bt-acento);background:transparent;border:2px solid currentColor;border-radius:999px;padding:8px 14px;cursor:pointer}' +
    '.bt-sug:hover{background:var(--bt-chip)}.bt-sug:focus-visible{outline:2px solid var(--bt-acento);outline-offset:2px}' +
    '.bt-gracias{color:var(--bt-dim);border-color:var(--bt-borde)}' +
    '.bt-msg{margin:10px 0;animation:btMsg .25s ease}@keyframes btMsg{from{opacity:0;transform:translateY(6px)}}' +
    '.bt-el{display:flex;gap:8px;align-items:flex-end}.bt-mini{width:30px;height:30px;flex:none;display:grid;place-items:center}.bt-mini svg,.bt-mini img{width:30px;height:30px}' +
    '.bt-glob{min-width:0;flex:1;background:var(--bt-caja);border:1px solid var(--bt-borde);border-radius:18px 18px 18px 6px;padding:10px 13px}' +
    '.bt-glob .bt-texto{background:none;border:0;padding:0;border-radius:0}.bt-intro{margin:0 0 6px;font:800 14px "Nunito","Inter",sans-serif;color:var(--bt-dim)}' +
    '.bt-el:has(.bt-texto[data-n="cero"]) .bt-glob{background:rgba(255,143,177,.08);border-color:rgba(255,143,177,.3)}' +
    '.bt-yo{margin-left:auto;width:fit-content;max-width:85%;background:#C6E000;color:#0B0B0B;border-radius:18px 18px 6px 18px;padding:9px 13px;font:800 14px "Nunito","Inter",sans-serif}' +
    '.bt-dots{display:inline-flex;gap:4px;padding:4px 2px}.bt-dots i{width:7px;height:7px;border-radius:50%;background:var(--bt-dim);animation:btDot 1s infinite}.bt-dots i:nth-child(2){animation-delay:.15s}.bt-dots i:nth-child(3){animation-delay:.3s}' +
    '@keyframes btDot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}' +
    '.bt-oculto{display:none!important}.bt-oculto+br{display:none}.bt-entra{animation:btMsg .35s ease}.bt-dots-in{display:flex;margin-top:4px}' +
    '@media (prefers-reduced-motion:reduce){.bt-msg,.bt-dots i,.bt-entra{animation:none}}' +
    'body.bt-abierto{overflow:hidden}';
  function estilos() {
    if (document.getElementById('bt-css')) return;
    var st = document.createElement('style'); st.id = 'bt-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function dibujarMate(el) {
    if (window.renderMathInElement) {
      try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
    } else document.addEventListener('mc:katex', function () { dibujarMate(el); }, { once: true });
  }
  // "Paso 1:" al inicio de una línea sale en negrita
  function armarTexto(t) {
    t = String(t || '').replace(/^\s*(Paso\s*\d{1,2}\s*[:.)-])/gim, '**$1**').replace(/^\s*[*-]\s+(?=\S)/gm, '• ');
    if (window.MCPregunta) return MCPregunta.armar(t).html;
    return esc(t).replace(/\n/g, '<br>');
  }

  // Cada línea de un párrafo en su <span class="bt-l"> (para soltarlas una por una)
  function enLineas(html) {
    var caja = document.createElement('div'); caja.innerHTML = html;
    caja.querySelectorAll('.mcq-p').forEach(function (p) {
      p.innerHTML = p.innerHTML.split(/<br\s*\/?>/i).map(function (l) { return '<span class="bt-l">' + l + '</span>'; }).join('<br>');
    });
    return caja.innerHTML;
  }

  var abierto = null;
  function cerrar() {
    if (!abierto) return;
    abierto.velo.remove(); abierto.hoja.remove();
    document.body.classList.remove('bt-abierto');
    document.removeEventListener('keydown', abierto.tecla);
    var b = abierto.desde; abierto = null;
    if (b && b.focus) b.focus();
  }

  // Se ve como un chat con el búho, pero todo es la resolución guardada:
  // primero el nivel más corto y debajo burbujas para pedir los otros
  var PIDE = { rapido: '⚡ Dímelo al toque', pasos: '📝 Explícame paso a paso', cero: '🍎 Explícame desde cero' };
  var INTRO = { rapido: 'Va, al toque:', pasos: 'Claro, vamos paso a paso:', cero: 'Tranqui, empecemos desde cero:' };
  var lento = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function abrir(q, opts) {
    opts = opts || {};
    var ns = niveles(q);
    if (!ns.length) return;
    cerrar(); estilos();
    var velo = document.createElement('div'); velo.className = 'bt-velo';
    var hoja = document.createElement('div'); hoja.className = 'bt-sheet';
    hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-modal', 'true'); hoja.setAttribute('aria-label', 'Búho tutor');
    hoja.innerHTML = '<div class="bt-asa"></div>' +
      '<div class="bt-head"><span class="bt-av">' + buho(44) + '</span><div><b>Búho tutor</b><small>' + esc(opts.titulo || (opts.num ? 'Pregunta ' + opts.num : 'Resolución')) + '</small></div>' +
      '<button type="button" class="bt-x" aria-label="Cerrar">✕</button></div>' +
      '<div class="bt-body" aria-live="polite"></div><div class="bt-pie"></div>';
    document.body.appendChild(velo); document.body.appendChild(hoja);
    document.body.classList.add('bt-abierto');
    var body = hoja.querySelector('.bt-body'), pie = hoja.querySelector('.bt-pie');
    var vistos = {}, ocupado = false;
    var op = q.options && q.options[q.correct];
    var clave = op ? '<div class="bt-clave">✓ Respuesta: ' + esc(op.letter) + ') <span class="bt-op">' + (window.MCPregunta ? MCPregunta.formato(op.text) : esc(op.text)) + '</span></div>' : '';

    function burbujaBuho(html, k) {
      var d = document.createElement('div'); d.className = 'bt-msg bt-el';
      d.innerHTML = '<span class="bt-mini">' + buho(30) + '</span><div class="bt-glob">' + html + '</div>';
      body.appendChild(d); return d;
    }
    function escribiendo(fn) {
      if (!lento) return fn();
      var d = burbujaBuho('<span class="bt-dots"><i></i><i></i><i></i></span>');
      body.scrollTop = body.scrollHeight;
      setTimeout(function () { d.remove(); fn(); }, 650);
    }
    function responder(k, primera) {
      vistos[k] = true; ocupado = true; sugerencias();
      escribiendo(function () {
        var d = burbujaBuho((primera ? clave : '') + '<p class="bt-intro">' + esc(primera ? (k === 'rapido' ? 'Te lo explico al toque:' : INTRO[k]) : INTRO[k]) + '</p>' +
          '<div class="bt-texto" data-n="' + k + '">' + enLineas(armarTexto(q.res[k])) + '</div>', k);
        dibujarMate(d);
        if (primera) body.scrollTop = 0; else d.scrollIntoView({ block: 'start' });
        contar(d, function () { ocupado = false; sugerencias(); });
      });
    }
    // Animación: el búho suelta la explicación línea por línea; tocar la burbuja la muestra entera
    function contar(d, fin) {
      var partes = [].slice.call(d.querySelectorAll('.bt-texto .bt-l, .bt-texto > :not(.mcq-p)'));
      if (!lento || partes.length < 2) return fin();
      partes.forEach(function (p) { p.classList.add('bt-oculto'); });
      var dots = document.createElement('span'); dots.className = 'bt-dots bt-dots-in'; dots.innerHTML = '<i></i><i></i><i></i>';
      d.querySelector('.bt-glob').appendChild(dots);
      var i = 0, t = 0, listo = false;
      function todo() {
        if (listo) return; listo = true; clearTimeout(t);
        partes.forEach(function (p) { p.classList.remove('bt-oculto'); });
        dots.remove(); d.removeEventListener('click', todo); fin();
      }
      function sig() {
        if (!abierto || abierto.body !== body) return;
        var p = partes[i++];
        if (!p) return todo();
        p.classList.remove('bt-oculto'); p.classList.add('bt-entra');
        var cerca = body.scrollHeight - body.scrollTop - body.clientHeight < 140;
        if (cerca && i > 1) p.scrollIntoView({ block: 'nearest' });
        var largo = (p.textContent || '').length;
        t = setTimeout(sig, Math.max(450, Math.min(1500, 300 + largo * 14)));
      }
      d.addEventListener('click', todo);
      d.title = 'Toca para ver todo';
      sig();
    }
    function sugerencias() {
      if (ocupado) { pie.innerHTML = ''; return; }
      var html = ns.filter(function (n) { return !vistos[n.k]; }).map(function (n) {
        return '<button type="button" class="bt-sug" data-k="' + n.k + '">' + PIDE[n.k] + '</button>';
      }).join('') + '<button type="button" class="bt-sug bt-gracias">¡Gracias, búho! 👍</button>';
      pie.innerHTML = '<div class="bt-sugs">' + html + '</div>';
      pie.querySelectorAll('.bt-sug').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.classList.contains('bt-gracias')) return cerrar();
          var yo = document.createElement('div'); yo.className = 'bt-msg bt-yo'; yo.textContent = b.textContent;
          body.appendChild(yo); body.scrollTop = body.scrollHeight;
          responder(b.dataset.k);
        });
      });
    }

    hoja.querySelector('.bt-x').addEventListener('click', cerrar);
    velo.addEventListener('click', cerrar);
    var tecla = function (e) { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla);
    abierto = { velo: velo, hoja: hoja, body: body, tecla: tecla, desde: opts.desde || null };
    responder(opts.nivel || ns[0].k, true);
    setTimeout(function () { var x = hoja.querySelector('.bt-x'); if (x) x.focus({ preventScroll: true }); }, 30);
  }

  function boton(q, opts) {
    if (!tiene(q)) return null;
    estilos(); opts = opts || {};
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'bt-btn';
    b.innerHTML = '<span class="bt-ico">' + buho(24) + '</span>' + esc(opts.texto || 'Búho tutor');
    b.addEventListener('click', function (e) { e.stopPropagation(); abrir(q, Object.assign({}, opts, { desde: b })); });
    return b;
  }

  // Práctica, Repaso, Fijas, Falladas: debajo del "¡Correcto!" / "Incorrecto…"
  function feedback(el, q, opts) {
    if (!el || !tiene(q)) return;
    var b = boton(q, Object.assign({ texto: '¿Por qué? Búho tutor' }, opts || {}));
    var caja = document.createElement('div'); caja.className = 'bt-fb';
    caja.appendChild(b); el.appendChild(caja);
  }

  // Modo estudio: un botón en cada tarjeta con resolución (al lado de "¿Error en la clave?")
  function enTema() {
    var t = window.MC_TEMA; if (!t || !t.questions) return;
    t.questions.forEach(function (q, i) {
      var card = document.getElementById('q' + (i + 1)); if (!card || card.querySelector('.bt-btn')) return;
      var b = boton(q, { num: i + 1, titulo: 'Pregunta ' + (i + 1) + ' · ' + (t.name || '') });
      if (!b) return;
      var fila = card.querySelector('.rep-row');
      if (!fila) { fila = document.createElement('div'); fila.className = 'rep-row'; card.appendChild(fila); }
      fila.classList.add('bt-fila');
      fila.insertBefore(b, fila.firstChild);
    });
  }
  document.addEventListener('mc:tema-listo', enTema);
  if (window.MC_TEMA) enTema();

  window.MCBuhoTutor = { NIVELES: NIVELES, tiene: tiene, niveles: niveles, abrir: abrir, cerrar: cerrar, boton: boton, feedback: feedback, armarTexto: armarTexto };
})();

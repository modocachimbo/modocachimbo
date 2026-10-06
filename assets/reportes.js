/* =========================================================
   Modo Cachimbo · Reporte de errores en claves
   - Botón "¿Error en la clave?" en cada pregunta (modo estudio)
   - Ventana para reportar: se guarda en el panel y ofrece WhatsApp
   - Burbuja flotante de WhatsApp
   Requiere: assets/mc-config.js y window.MC_TEMA (lo define tema.html)
   ========================================================= */
(function () {
  var CFG = window.MC_CONFIG || {};
  var WA = CFG.WHATSAPP || '51917797543';
  var LETRAS = ['A', 'B', 'C', 'D', 'E'];

  var WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.62 15.03L2 22l5.1-1.34A10 10 0 1 0 12 2zm0 18.1a8.07 8.07 0 0 1-4.13-1.13l-.3-.18-3.03.8.81-2.95-.2-.3A8.1 8.1 0 1 1 12 20.1zm4.44-6.07c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14-.01-.3-.01-.46-.01a.9.9 0 0 0-.65.3c-.22.24-.85.83-.85 2.03s.87 2.36 1 2.52c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z"/></svg>';
  var FLAG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  var CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  /* ---------- Estilos ---------- */
  var css = `
  .rep-row { display: flex; justify-content: flex-end; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #1f1f1f; }
  .rep-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: 1px solid transparent; border-radius: 9px;
    color: #6a6a6a; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
    padding: 6px 10px; cursor: pointer; transition: color .15s, border-color .15s, background .15s;
  }
  .rep-btn svg { width: 13px; height: 13px; }
  .rep-btn:hover { color: #FBBF24; border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.06); }
  .rep-btn.done { color: #25D366; pointer-events: none; }

  .qcard.rep-highlight { border-color: #FBBF24; box-shadow: 0 0 0 3px rgba(251,191,36,0.15); transition: box-shadow .3s, border-color .3s; }

  /* Burbuja */
  .mc-bubble {
    position: fixed; right: 22px; bottom: 22px; z-index: 60;
    display: flex; align-items: center; gap: 10px;
    background: #25D366; color: #06270f; text-decoration: none;
    border-radius: 100px; padding: 12px 18px 12px 14px;
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13.5px;
    box-shadow: 0 10px 30px rgba(37,211,102,0.3), 0 4px 12px rgba(0,0,0,0.5);
    transition: transform .15s ease, padding .25s ease;
    animation: mcBubbleIn .5s cubic-bezier(.2,.9,.3,1.2) .6s both;
  }
  .mc-bubble:hover { transform: translateY(-2px); }
  .mc-bubble svg { width: 24px; height: 24px; flex-shrink: 0; }
  .mc-bubble .txt { display: flex; flex-direction: column; line-height: 1.2; white-space: nowrap; overflow: hidden; max-width: 260px; transition: max-width .3s ease, opacity .2s; }
  .mc-bubble .txt small { font-weight: 500; font-size: 11.5px; opacity: .8; }
  .mc-bubble.mini { padding: 13px; }
  .mc-bubble.mini .txt { max-width: 0; opacity: 0; }
  @keyframes mcBubbleIn { from { opacity: 0; transform: translateY(20px) scale(.9); } to { opacity: 1; transform: none; } }
  @media (max-width: 560px) { .mc-bubble { right: 14px; bottom: 14px; } }

  /* Ventana de reporte */
  body.rep-open { overflow: hidden; }
  .rep-overlay {
    position: fixed; inset: 0; z-index: 120;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    background: rgba(0,0,0,0.72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    animation: repFade .2s ease;
  }
  .rep-card {
    position: relative; width: 100%; max-width: 480px; max-height: calc(100vh - 40px); overflow-y: auto;
    background: linear-gradient(160deg, #1a1a1a 0%, #0e0e0e 60%);
    border: 1px solid #2c2c2c; border-radius: 24px; padding: 30px 28px 24px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    font-family: 'Inter', sans-serif; color: #f2f2f2;
    animation: repPop .3s cubic-bezier(.2,.9,.3,1.2);
  }
  .rep-card::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: linear-gradient(90deg, #FBBF24, #C6E000); }
  .rep-x { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 9px; border: 1px solid #262626; background: none; color: #8a8a8a; cursor: pointer; font-size: 15px; }
  .rep-x:hover { color: #fff; border-color: #444; }
  .rep-tag { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #FBBF24; font-weight: 700; }
  .rep-card h3 { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; margin: 8px 0 6px; }
  .rep-sub { font-size: 13.5px; color: #9a9a9a; line-height: 1.55; }
  .rep-info { margin: 18px 0; background: #0a0a0a; border: 1px solid #222; border-radius: 14px; padding: 14px 16px; font-size: 13px; line-height: 1.55; }
  .rep-info .meta { color: #C6E000; font-weight: 700; font-size: 11.5px; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 6px; }
  .rep-info .q { color: #cfcfcf; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .rep-info .marcada { margin-top: 10px; color: #9a9a9a; }
  .rep-info .marcada b { color: #f5ffcc; }
  .rep-label { display: block; font-size: 13px; font-weight: 600; margin: 16px 0 10px; }
  .rep-label span { color: #6a6a6a; font-weight: 500; }
  .rep-letters { display: flex; gap: 8px; flex-wrap: wrap; }
  .rep-letter {
    min-width: 44px; height: 44px; padding: 0 12px; border-radius: 12px; border: 1px solid #2a2a2a; background: #141414;
    color: #d0d0d0; font-family: 'Sora', sans-serif; font-weight: 800; font-size: 15px; cursor: pointer; transition: all .12s;
  }
  .rep-letter.nose { font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600; }
  .rep-letter:hover { border-color: #FBBF24; }
  .rep-letter.sel { background: #FBBF24; border-color: #FBBF24; color: #111; }
  .rep-letter:disabled { opacity: .3; cursor: not-allowed; }
  .rep-text {
    width: 100%; min-height: 80px; resize: vertical; border-radius: 12px; border: 1px solid #2a2a2a; background: #0a0a0a;
    color: #f2f2f2; font-family: 'Inter', sans-serif; font-size: 13.5px; padding: 12px 14px; line-height: 1.5;
  }
  .rep-text:focus { outline: none; border-color: #C6E000; }
  .rep-count { text-align: right; font-size: 11px; color: #555; margin-top: 4px; }
  .rep-send {
    margin-top: 18px; width: 100%; border: none; border-radius: 14px; padding: 15px; cursor: pointer;
    background: #C6E000; color: #0e0e0e; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .rep-send:disabled { opacity: .6; cursor: wait; }
  .rep-wa {
    margin-top: 10px; width: 100%; border-radius: 14px; padding: 14px; text-decoration: none;
    background: rgba(37,211,102,0.1); color: #25D366; border: 1px solid rgba(37,211,102,0.25);
    font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .rep-wa svg { width: 18px; height: 18px; }
  .rep-wa:hover { background: rgba(37,211,102,0.16); }
  .rep-ok { text-align: center; padding: 8px 0 0; }
  .rep-ok .ico { width: 70px; height: 70px; border-radius: 20px; margin: 4px auto 16px; display: flex; align-items: center; justify-content: center; background: rgba(198,224,0,0.12); border: 1px solid rgba(198,224,0,0.3); color: #C6E000; }
  .rep-ok .ico.warn { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #FBBF24; }
  .rep-ok .ico svg { width: 34px; height: 34px; }
  .rep-close2 { margin-top: 10px; width: 100%; background: none; border: 1px solid #2a2a2a; color: #9a9a9a; border-radius: 14px; padding: 13px; font-weight: 600; font-size: 14px; cursor: pointer; font-family: 'Inter', sans-serif; }
  .rep-close2:hover { color: #fff; border-color: #444; }
  .rep-spin { width: 16px; height: 16px; border: 2px solid rgba(0,0,0,.25); border-top-color: #0e0e0e; border-radius: 50%; animation: repSpin .7s linear infinite; }
  @keyframes repSpin { to { transform: rotate(360deg); } }
  @keyframes repFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes repPop { from { opacity: 0; transform: translateY(14px) scale(.95); } to { opacity: 1; transform: none; } }
  @media (max-width: 480px) { .rep-card { padding: 26px 20px 20px; border-radius: 20px; } }
  `;
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function limpio(s) { // quita marcas *cursiva*, **negrita**, <u>, $...$ para mensajes
    return String(s || '').replace(/<\/?u>/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\s+/g, ' ').trim();
  }
  function corto(s, n) { s = limpio(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function waLink(msg) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg); }
  function temaUrl(n) {
    return location.origin + location.pathname + location.search + (n ? '#q' + n : '');
  }

  function jsonp(url, params) {
    return new Promise(function (resolve, reject) {
      var cb = 'mc_rep_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');
      var t;
      function cleanup() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { resolve(data); cleanup(); };
      s.onerror = function () { reject(new Error('jsonp')); cleanup(); };
      t = setTimeout(function () { reject(new Error('timeout')); cleanup(); }, 12000);
      var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      s.src = url + (url.indexOf('?') === -1 ? '?' : '&') + q + '&callback=' + cb;
      document.body.appendChild(s);
    });
  }

  function info() { return window.MC_TEMA || null; }

  /* ---------- Burbuja flotante ---------- */
  function crearBurbuja() {
    var T = info() || {};
    var msg = 'Hola! 👋 Te escribo desde Modo Cachimbo' +
      (T.curso ? ' (' + T.curso + (T.year ? ' · ' + T.year : '') + (T.num ? ' · Tema ' + T.num + (T.name ? ' – ' + T.name : '') : '') + ')' : '') +
      '. Encontré un error en una clave: ';
    var a = document.getElementById('mcBubble');
    if (!a) {
      a = document.createElement('a');
      a.id = 'mcBubble';
      a.className = 'mc-bubble';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', 'Avisar un error por WhatsApp');
      a.innerHTML = WA_ICON + '<span class="txt">¿Error en una clave?<small>Avísale al admin por WhatsApp</small></span>';
      document.body.appendChild(a);
      // se achica al bajar, se agranda al volver arriba
      var movil = window.matchMedia('(max-width: 600px)').matches;
      if (movil) {
        // en celular se muestra el texto unos segundos y queda solo el ícono
        setTimeout(function () { a.classList.add('mini'); }, 4500);
      } else {
        var lastY = window.scrollY;
        window.addEventListener('scroll', function () {
          var y = window.scrollY;
          if (y > 200 && y > lastY) a.classList.add('mini');
          else if (y < lastY - 10 || y < 200) a.classList.remove('mini');
          lastY = y;
        }, { passive: true });
      }
    }
    a.href = waLink(msg);
  }

  /* ---------- Ventana de reporte ---------- */
  var overlay = null;
  function cerrar() {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.body.classList.remove('rep-open');
  }

  function abrirReporte(idx) {
    var T = info();
    if (!T || !T.questions || !T.questions[idx]) return;
    var q = T.questions[idx];
    var n = idx + 1;
    var ok = q.options && q.options[q.correct];
    var marcada = ok ? ok.letter + ') ' + limpio(ok.text) : '—';
    var letras = (q.options || []).map(function (o) { return o.letter; });
    if (!letras.length) letras = LETRAS;

    cerrar();
    overlay = document.createElement('div');
    overlay.className = 'rep-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="rep-card">' +
        '<button class="rep-x" type="button" aria-label="Cerrar">✕</button>' +
        '<div class="rep-body">' +
          '<div class="rep-tag">Reportar error</div>' +
          '<h3>¿Encontraste un error?</h3>' +
          '<p class="rep-sub">Avísale al admin para que actualice la clave. ¡Gracias por ayudar a que Modo Cachimbo mejore!</p>' +
          '<div class="rep-info">' +
            '<div class="meta">' + esc(T.curso) + ' · ' + esc(T.year) + ' · Tema ' + esc(T.num) + ' · Pregunta ' + n + '</div>' +
            '<div class="q">' + esc(limpio(q.text)) + '</div>' +
            '<div class="marcada">Clave marcada: <b>' + esc(marcada) + '</b></div>' +
          '</div>' +
          '<label class="rep-label">¿Cuál crees que es la correcta?</label>' +
          '<div class="rep-letters">' +
            letras.map(function (L, i) {
              return '<button type="button" class="rep-letter" data-l="' + esc(L) + '"' + (i === q.correct ? ' disabled title="Es la clave actual"' : '') + '>' + esc(L) + '</button>';
            }).join('') +
            '<button type="button" class="rep-letter nose" data-l="No sé">No estoy seguro</button>' +
          '</div>' +
          '<label class="rep-label">Comentario <span>(opcional)</span></label>' +
          '<textarea class="rep-text" maxlength="400" placeholder="Ej.: según el libro, la respuesta es C porque…"></textarea>' +
          '<div class="rep-count">0/400</div>' +
          '<button type="button" class="rep-send">Enviar reporte</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('rep-open');

    var sugerida = '';
    var body = overlay.querySelector('.rep-body');
    var txt = overlay.querySelector('.rep-text');
    var count = overlay.querySelector('.rep-count');
    var send = overlay.querySelector('.rep-send');

    overlay.querySelector('.rep-x').addEventListener('click', cerrar);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) cerrar(); });
    txt.addEventListener('input', function () { count.textContent = txt.value.length + '/400'; });
    overlay.querySelectorAll('.rep-letter').forEach(function (b) {
      b.addEventListener('click', function () {
        overlay.querySelectorAll('.rep-letter').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        sugerida = b.getAttribute('data-l');
      });
    });

    send.addEventListener('click', function () {
      var comentario = txt.value.trim();
      var sugTexto = '';
      if (sugerida && sugerida !== 'No sé') {
        var o = (q.options || []).filter(function (x) { return x.letter === sugerida; })[0];
        sugTexto = sugerida + (o ? ') ' + limpio(o.text) : '');
      } else if (sugerida) sugTexto = 'No está seguro';

      var waMsg =
        'Hola! 👀 Encontré un posible error en una clave de Modo Cachimbo\n\n' +
        '📚 ' + T.curso + ' · ' + T.year + ' · Tema ' + T.num + (T.name ? ' (' + T.name + ')' : '') + '\n' +
        '❓ Pregunta ' + n + ': "' + corto(q.text, 140) + '"\n' +
        '✅ Clave marcada: ' + marcada + '\n' +
        '💡 Creo que es: ' + (sugTexto || '—') +
        (comentario ? '\n📝 ' + comentario : '') +
        '\n\n🔗 ' + temaUrl(n);

      var datos = {
        action: 'reportar',
        curso: T.curso || '',
        carpeta: T.carpeta || '',
        anio: T.year || '',
        tema: T.num || '',
        temaNombre: T.name || '',
        pregunta: n,
        extracto: corto(q.text, 220),
        marcada: corto(marcada, 160),
        sugerida: corto(sugTexto, 160),
        comentario: comentario.slice(0, 400),
        url: temaUrl(n)
      };

      function marcarBoton() {
        var b = document.querySelector('.rep-btn[data-idx="' + idx + '"]');
        if (b) { b.classList.add('done'); b.innerHTML = CHECK_ICON + ' Reporte enviado'; }
      }

      function pantallaFinal(guardado) {
        body.innerHTML =
          '<div class="rep-ok">' +
            '<div class="ico' + (guardado ? '' : ' warn') + '">' + (guardado ? CHECK_ICON : WA_ICON) + '</div>' +
            '<div class="rep-tag">' + (guardado ? 'Reporte enviado' : 'Último paso') + '</div>' +
            '<h3>' + (guardado ? '¡Gracias por avisar!' : 'Envíalo por WhatsApp') + '</h3>' +
            '<p class="rep-sub">' + (guardado
              ? 'Tu reporte ya le llegó al admin. Si quieres, también puedes escribirle directo por WhatsApp.'
              : 'No pudimos guardar el reporte automáticamente. Envíalo por WhatsApp: el mensaje ya está listo.') + '</p>' +
            '<a class="rep-wa" target="_blank" rel="noopener noreferrer" href="' + esc(waLink(waMsg)) + '">' + WA_ICON + (guardado ? 'También avisar por WhatsApp' : 'Enviar por WhatsApp') + '</a>' +
            '<button type="button" class="rep-close2">Cerrar</button>' +
          '</div>';
        body.querySelector('.rep-close2').addEventListener('click', cerrar);
        if (guardado) marcarBoton();
        else body.querySelector('.rep-wa').addEventListener('click', marcarBoton);
      }

      if (!CFG.REPORTES_URL) { pantallaFinal(false); return; }
      send.disabled = true;
      send.innerHTML = '<span class="rep-spin"></span> Enviando…';
      jsonp(CFG.REPORTES_URL, datos)
        .then(function (r) {
          var ok = !!(r && r.ok);
          // Copia en la cuenta del alumno, para que vea el estado en Mi perfil (supabase/07-reportes.sql)
          if (ok && window.MCAuth && MCAuth.usuario()) {
            MCAuth.listo.then(function (c) {
              return c.rpc('crear_reporte', { p: { carpeta: datos.carpeta, anio: datos.anio, tema: datos.tema, pregunta: datos.pregunta, extracto: datos.extracto, sugerida: datos.sugerida } });
            }).catch(function () {});
          }
          pantallaFinal(ok);
        })
        .catch(function () { pantallaFinal(false); });
    });
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.rep-btn');
    if (b) abrirReporte(parseInt(b.getAttribute('data-idx'), 10));
  });

  /* ---------- Cuando el tema terminó de cargar ---------- */
  function listo() {
    crearBurbuja();
    var h = location.hash.match(/^#q(\d+)$/);
    if (h) {
      var card = document.getElementById('q' + h[1]);
      if (card) {
        setTimeout(function () {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('rep-highlight');
          setTimeout(function () { card.classList.remove('rep-highlight'); }, 2500);
        }, 150);
      }
    }
  }
  document.addEventListener('mc:tema-listo', listo);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crearBurbuja);
  else crearBurbuja();
})();

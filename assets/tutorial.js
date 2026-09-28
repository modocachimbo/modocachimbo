/* =========================================================
   Modo Cachimbo · Tutorial de primera visita
   Los pasos se editan desde el panel (assets/tutorial.json).
   Cada paso ilumina una parte de la página ("objetivo").
   ========================================================= */
(function () {
  var SCRIPT = document.currentScript;
  var ROOT = new URL('..', SCRIPT ? SCRIPT.src : location.href);
  var cerca = function (sel) { return function () { var a = document.querySelector(sel); return a ? (a.closest('.course') || a) : null; }; };
  var nth = function (sel, i) { return function () { return document.querySelectorAll(sel)[i] || null; }; };

  // Partes que se pueden iluminar en cada tipo de página
  var OBJETIVOS = {
    inicio: [['hero', 'Título de bienvenida', '.hero'], ['cursos', 'Tarjetas de áreas (Mis cursos)', nth('section.cards', 0)],
      ['examenes', 'Exámenes de admisión', nth('section.cards', 1)], ['codigo', 'Botón "Ingresar código"', '#vipToggle'], ['cafe', 'Invítame un café', '.coffee']],
    area: [['cursos', 'Lista de cursos', '.courses'], ['primero', 'Primer curso', '.courses .course'], ['volver', 'Botón volver', 'a.back'], ['codigo', 'Botón "Ingresar código"', '#vipToggle']],
    curso: [['libro', 'Tarjeta Libro', cerca('a[href="libros/index.html"]')], ['repaso', 'Tarjeta Repaso', cerca('a[data-mc="repaso"], a[href^="repaso.html"]')],
      ['fijas', 'Tarjeta Fijas', cerca('a[data-mc="fijas"], a[href^="fijas.html"]')], ['codigo', 'Botón "Ingresar código"', '#vipToggle'], ['volver', 'Botón volver', 'a.back']],
    libros: [['anios', 'Lista de años', '#yearsGrid'], ['anio', 'Primer año disponible', '#yearsGrid .year-card.active'],
      ['temas', 'Lista de temas', '#temaList'], ['tema', 'Primer tema', '#temaList > *']],
    estudio: [['pregunta', 'Primera pregunta', '.qcard'], ['correcta', 'Respuesta marcada', '.qcard .opt-row.correct'],
      ['practicar', 'Botón Practicar', '.quiz-cta'], ['error', 'Botón "¿Error en la clave?"', '.qcard .rep-btn'], ['whatsapp', 'Burbuja de WhatsApp', '#mcBubble']],
    quiz: [['inicio', 'Pantalla de inicio', '#startScreen'], ['empezar', 'Botón Empezar', '#btnStart']],
    repaso: [['candado', 'Candado (código)', '#lockScreen'], ['codigo', 'Casilla del código', '#lockInput'], ['empezar', 'Botón Empezar', '#btnStart']],
    fijas: [['candado', 'Candado (código)', '#lockScreen'], ['codigo', 'Casilla del código', '#lockInput'], ['empezar', 'Botón Empezar', '#btnStart']]
  };

  function pagina() {
    var rel = location.pathname.slice(ROOT.pathname.length).replace(/^\/+/, '');
    var seg = rel.split('/'), resto = seg.slice(1).join('/');
    if (rel === '' || rel === 'index.html') return 'inicio';
    if (seg[0] === 'areas') return 'area';
    if (['panel', 'assets', 'examenes'].indexOf(seg[0]) >= 0) return null;
    if (resto === '' || resto === 'index.html') return 'curso';
    if (resto === 'libros/' || resto === 'libros/index.html' || resto === 'libros/temario.html') return 'libros';
    if (resto === 'libros/tema.html') return 'estudio';
    if (resto === 'libros/quiz.html') return 'quiz';
    if (resto === 'repaso.html') return 'repaso';
    if (resto === 'fijas.html') return 'fijas';
    return null;
  }

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function formato(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }

  function buscar(pag, id) {
    var o = (OBJETIVOS[pag] || []).filter(function (x) { return x[0] === id; })[0];
    if (!o) return null;
    var el = typeof o[2] === 'function' ? o[2]() : document.querySelector(o[2]);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? el : null;
  }

  var css = `
  .mct-foco { position: fixed; z-index: 150; border-radius: 16px; pointer-events: none;
    box-shadow: 0 0 0 3px #C6E000, 0 0 0 9999px rgba(0,0,0,0.74); transition: all .3s ease; }
  .mct-foco.centro { box-shadow: 0 0 0 9999px rgba(0,0,0,0.74); }
  .mct-capa { position: fixed; inset: 0; z-index: 149; }
  .mct-burbuja { position: fixed; z-index: 151; width: min(360px, calc(100vw - 24px)); background: #151515; color: #f2f2f2;
    border: 1px solid #2c2c2c; border-radius: 18px; padding: 18px 18px 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    font-family: 'Inter', system-ui, sans-serif; animation: mctIn .25s ease; transition: top .3s ease, left .3s ease; }
  .mct-burbuja::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; border-radius: 18px 18px 0 0; background: linear-gradient(90deg, #FBBF24, #C6E000); }
  .mct-paso { font-size: 10.5px; letter-spacing: 2.5px; text-transform: uppercase; color: #C6E000; font-weight: 700; margin-bottom: 6px; }
  .mct-burbuja h4 { font-family: 'Sora', 'Inter', sans-serif; font-size: 18px; font-weight: 800; margin: 0 0 6px; line-height: 1.25; }
  .mct-burbuja p { font-size: 14px; line-height: 1.6; color: #b5b5b5; margin: 0; }
  .mct-burbuja p b { color: #fff; }
  .mct-pie { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
  .mct-puntos { display: flex; gap: 5px; margin-right: auto; }
  .mct-puntos i { width: 7px; height: 7px; border-radius: 50%; background: #333; }
  .mct-puntos i.on { background: #C6E000; width: 18px; border-radius: 4px; }
  .mct-btn { border: none; border-radius: 10px; padding: 9px 14px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }
  .mct-sig { background: #C6E000; color: #0e0e0e; }
  .mct-atr { background: #222; color: #ccc; }
  .mct-saltar { position: absolute; top: 10px; right: 12px; background: none; border: none; color: #777; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
  .mct-saltar:hover { color: #fff; }
  .mct-ayuda { position: fixed; left: 16px; bottom: 16px; z-index: 55; width: 40px; height: 40px; border-radius: 50%; border: 1px solid #2c2c2c;
    background: #151515; color: #C6E000; font-family: 'Sora', sans-serif; font-weight: 800; font-size: 17px; cursor: pointer;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5); }
  .mct-ayuda:hover { border-color: #C6E000; }
  @keyframes mctIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `;
  function estilos() { if (!document.getElementById('mct-css')) { var s = document.createElement('style'); s.id = 'mct-css'; s.textContent = css; document.head.appendChild(s); } }

  /* ---------- Recorrido ---------- */
  var activo = null;
  function iniciar(pag, cfg, alTerminar) {
    if (activo) return;
    var pasos = (cfg.pasos || []).filter(function (p) { return !p.objetivo || p.objetivo === 'centro' || buscar(pag, p.objetivo); });
    if (!pasos.length) return;
    estilos();
    var capa = document.createElement('div'); capa.className = 'mct-capa';
    var foco = document.createElement('div'); foco.className = 'mct-foco';
    var bur = document.createElement('div'); bur.className = 'mct-burbuja'; bur.setAttribute('role', 'dialog');
    document.body.appendChild(capa); document.body.appendChild(foco); document.body.appendChild(bur);
    var i = 0, el = null;
    activo = { cerrar: cerrar };

    function colocar() {
      var vw = window.innerWidth, vh = window.innerHeight, bw = bur.offsetWidth, bh = bur.offsetHeight, m = 12;
      if (!el) {
        foco.className = 'mct-foco centro'; foco.style.cssText = 'left:50%;top:50%;width:0;height:0;';
        bur.style.left = Math.max(m, (vw - bw) / 2) + 'px'; bur.style.top = Math.max(m, (vh - bh) / 2) + 'px'; return;
      }
      var r = el.getBoundingClientRect(), pad = 8;
      foco.className = 'mct-foco';
      foco.style.left = (r.left - pad) + 'px'; foco.style.top = (r.top - pad) + 'px';
      foco.style.width = (r.width + pad * 2) + 'px'; foco.style.height = (r.height + pad * 2) + 'px';
      var top = r.bottom + pad + m;
      if (top + bh > vh - m) top = r.top - pad - m - bh;       // arriba si no cabe abajo
      if (top < m) top = Math.min(vh - bh - m, Math.max(m, r.bottom + pad + m)); // si tampoco, lo más visible
      var left = Math.min(Math.max(m, r.left + r.width / 2 - bw / 2), vw - bw - m);
      bur.style.top = Math.max(m, top) + 'px'; bur.style.left = left + 'px';
    }
    function mostrar() {
      var p = pasos[i];
      el = p.objetivo && p.objetivo !== 'centro' ? buscar(pag, p.objetivo) : null;
      bur.innerHTML = '<button class="mct-saltar" type="button">Saltar</button>' +
        '<div class="mct-paso">Paso ' + (i + 1) + ' de ' + pasos.length + '</div>' +
        (p.titulo ? '<h4>' + esc(p.titulo) + '</h4>' : '') + '<p>' + formato(p.texto) + '</p>' +
        '<div class="mct-pie"><div class="mct-puntos">' + pasos.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        (i > 0 ? '<button class="mct-btn mct-atr" type="button">Atrás</button>' : '') +
        '<button class="mct-btn mct-sig" type="button">' + (i === pasos.length - 1 ? '¡Listo!' : 'Siguiente') + '</button></div>';
      bur.querySelector('.mct-saltar').onclick = cerrar;
      bur.querySelector('.mct-sig').onclick = function () { if (i < pasos.length - 1) { i++; mostrar(); } else cerrar(); };
      var atr = bur.querySelector('.mct-atr'); if (atr) atr.onclick = function () { i--; mostrar(); };
      if (el) {
        var r = el.getBoundingClientRect();
        if (r.top < 70 || r.bottom > window.innerHeight - 180) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      // sigue al elemento mientras la página termina de desplazarse
      var t0 = Date.now();
      (function seguir() { colocar(); if (Date.now() - t0 < 1200 && activo) requestAnimationFrame(seguir); })();
      try { bur.querySelector('.mct-sig').focus({ preventScroll: true }); } catch (e) {}
    }
    function onKey(e) { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') bur.querySelector('.mct-sig').click(); }
    function cerrar() {
      window.removeEventListener('resize', colocar); window.removeEventListener('scroll', colocar, true); document.removeEventListener('keydown', onKey);
      capa.remove(); foco.remove(); bur.remove(); activo = null;
      if (alTerminar) alTerminar();
    }
    window.addEventListener('resize', colocar); window.addEventListener('scroll', colocar, true); document.addEventListener('keydown', onKey);
    mostrar();
  }

  // Espera a que la página esté lista (contenido cargado y sin alertas abiertas)
  function cuandoListo(pag, cfg, fn) {
    var t0 = Date.now();
    (function revisar() {
      var hayModal = document.querySelector('.mca-ov, .rep-overlay, .aviso-overlay');
      var algunObjetivo = (cfg.pasos || []).some(function (p) { return p.objetivo && p.objetivo !== 'centro' && buscar(pag, p.objetivo); });
      if (!hayModal && (algunObjetivo || Date.now() - t0 > 4000)) setTimeout(fn, 400);
      else if (Date.now() - t0 < 20000) setTimeout(revisar, 300);
    })();
  }

  function botonAyuda(pag, cfg) {
    if (cfg.boton === false || document.querySelector('.mct-ayuda')) return;
    estilos();
    var b = document.createElement('button');
    b.className = 'mct-ayuda'; b.type = 'button'; b.title = '¿Cómo funciona?'; b.setAttribute('aria-label', '¿Cómo funciona?'); b.textContent = '?';
    b.onclick = function () { iniciar(pag, cfg); };
    document.body.appendChild(b);
  }

  window.MCTutorial = { objetivos: OBJETIVOS, iniciar: iniciar };
  if (SCRIPT && SCRIPT.hasAttribute('data-solo-lista')) return;

  function arrancar() {
    var pag = pagina(); if (!pag) return;
    var q = new URLSearchParams(location.search).get('tutorial');
    var borrador = null;
    if (q === 'borrador') { try { borrador = JSON.parse(leer('mc_tutorial_borrador') || 'null'); } catch (e) {} }
    var datos = borrador ? Promise.resolve(borrador)
      : fetch(new URL('assets/tutorial.json', ROOT).href, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    datos.then(function (t) {
      if (!t || t.activo === false) return;
      var cfg = (t.paginas || {})[pag];
      if (!cfg || !cfg.activa || !(cfg.pasos || []).length) return;
      var clave = 'mc_tuto_' + pag, version = String(cfg.version || 1);
      botonAyuda(pag, cfg);
      if (q || leer(clave) !== version) cuandoListo(pag, cfg, function () { iniciar(pag, cfg, function () { if (!borrador) escribir(clave, version); }); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();

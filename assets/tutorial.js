/* =========================================================
   Modo Cachimbo · Tutorial de primera visita
   Los pasos se editan desde el panel (assets/tutorial.json).
   Cada paso ilumina una parte de la página ("objetivo").
   ========================================================= */
(function () {
  var SCRIPT = document.currentScript;
  var ROOT = new URL('..', SCRIPT ? SCRIPT.src : location.href);
  var cerca = function (sel) { return function () { var a = document.querySelector(sel); return a ? (a.closest('.course') || a) : null; }; };
  // El bloque que contiene al elemento (su campo o tarjeta)
  var cercaDe = function (sel, caja) { return function () { var a = document.querySelector(sel); return a ? (a.closest(caja) || a) : null; }; };
  var nth = function (sel, i) { return function () { return document.querySelectorAll(sel)[i] || null; }; };
  // El primero que se vea (en celular algunos botones pasan a la barra de abajo)
  var visible = function (sels) { return function () {
    for (var i = 0; i < sels.length; i++) { var el = document.querySelector(sels[i]); if (el && el.getBoundingClientRect().width > 0) return el; }
    return null;
  }; };

  // El estante de la Biblioteca cuyo título empieza con este texto
  var estante = function (tit) { return function () {
    var e = [].filter.call(document.querySelectorAll('#grupos .estante'), function (x) { var h = x.querySelector('h2'); return h && h.textContent.trim().indexOf(tit) === 0; })[0];
    return e || null;
  }; };

  // Partes que se pueden iluminar en cada tipo de página
  var OBJETIVOS = {
    inicio: [['hero', 'Búho y fechas importantes', '#escena'], ['fecha', 'Mi agenda', '#fechas'],
      ['accesos', 'Misiones, Colección, Ranking, Agenda y Nuevo', '.escena .accesos'], ['rango', 'Tu rango de la semana', '#rangoBar'],
      ['practicar', 'Botón "¡A practicar!" y modo', '.col-der .jugar'], ['racha', 'Meta de hoy (racha)', visible(['#salRacha', '.mcu-racha'])],
      ['examenes', 'Modos de estudio', '.modos'], ['duelos', 'Duelos', '.duelo-banner'], ['simulacro', 'Simulacro', '.modos .j-sim'],
      ['flashcards', 'Flashcards', '.modos .j-flash'], ['biblioteca', 'Biblioteca', '.modos .j-bib'],
      ['cursos', 'Cursos populares', '.cursos-sec'], ['codigo', 'Botón "Activar código"', visible(['#salCodigo', '#vipToggle'])],
      ['top', 'Top de la semana', visible(['.lado .top', '.fila2 .solo-cel'])], ['topsim', 'Top simulacro', '#topSim'],
      ['resenas', 'Reseñas', '#resenas'], ['menu', 'Menú (barra de abajo en celular)', visible(['.tabbar', '.lado .nav'])],
      ['nuevo', 'Botón "Nuevo"', '#novBtn'], ['cafe', 'Invítame un café', '.coffee']],
    area: [['mixto', 'Repaso mixto', '.mixto'], ['cursos', 'Lista de cursos', '.courses'], ['primero', 'Primer curso', '.courses .course'], ['volver', 'Botón volver', 'a.back'], ['codigo', 'Botón "Ingresar código"', '#vipToggle']],
    curso: [['libro', 'Tarjeta Libro', cerca('a[href="libros/index.html"]')], ['repaso', 'Tarjeta Repaso', cerca('a[data-mc="repaso"], a[href^="repaso.html"]')],
      ['fijas', 'Tarjeta Fijas', cerca('a[data-mc="fijas"], a[href^="fijas.html"]')],
      ['seminarios', 'Tarjeta Seminarios', cerca('a[data-mc="seminarios"]')], ['banqueo', 'Tarjeta Banqueo', cerca('a[data-mc="banqueo"]')], ['tarjetas', 'Tarjeta Flashcards', cerca('a[data-mc="tarjetas"]')], ['codigo', 'Botón "Ingresar código"', '#vipToggle'], ['volver', 'Botón volver', 'a.back']],
    libros: [['anios', 'Lista de ciclos', '#yearsGrid'], ['anio', 'Primer ciclo disponible', '#yearsGrid .year-card.active']],
    temario: [['temas', 'Lista de temas', '#temaList'], ['tema', 'Primer tema', '#temaList > *']],
    estudio: [['pregunta', 'Primera pregunta', '.qcard'], ['correcta', 'Respuesta marcada', '.qcard .opt-row.correct'],
      ['practicar', 'Botón Practicar', '.quiz-cta'], ['tarjetas', 'Botón Flashcards', '#tarjetasLink'], ['credito', 'Crédito del profesor', '#creditoLabel'], ['error', 'Botón "¿Error en la clave?"', '.qcard .rep-btn']],
    quiz: [['inicio', 'Pantalla de inicio', '#startScreen'], ['stats', 'Corazones, preguntas y tema', '#startScreen .rp-stats'], ['reglas', 'Cómo funciona', '#startScreen .rp-reglas'],
      ['vidas', 'Vidas y número de preguntas', '#startScreen .start-info'], ['empezar', 'Botón Empezar', '#btnStart']],
    falladas: [['inicio', 'Pantalla de inicio', '#startScreen'], ['cuantas', 'Cuántas preguntas tienes', visible(['#startScreen .rp-stats', '#startScreen .start-info'])], ['empezar', 'Botón Empezar', '#btnStart']],
    duelo: [['filtros', 'Ciclo, curso y tema', '#crear .filtros'], ['fuentes', 'De dónde salen las preguntas', cercaDe('#fuentes', '.campo')],
      ['jugadores', 'Jugadores e inicio automático', cercaDe('#jugadores', '.campo')], ['cantidad', 'Número de preguntas', cercaDe('#cantidad', '.campo')],
      ['tiempo', 'Tiempo por pregunta', cercaDe('#tiempo', '.campo')], ['comodines', 'Comodines', cercaDe('#cmdSw', '.campo')],
      ['reglas', 'Reglas del duelo', '#crear .reglas'], ['crear', 'Botón Crear duelo', '#btnCrear'], ['codigo', 'Entrar con un código', cercaDe('#codUnirse', '.card')],
      ['mis', 'Mis duelos', cercaDe('#misDuelos', '.card')], ['ranking', 'Top de la semana', cercaDe('#rank', '.card')]],
    repaso: [['inicio', 'Pantalla de inicio', '#startScreen'], ['stats', 'Corazones, preguntas y temas', visible(['#startScreen .rp-stats', '#startScreen .start-info'])],
      ['temas', 'Temas que entran', '#startScreen .rp-temas'], ['reglas', 'Cómo funciona', '#startScreen .rp-reglas'], ['empezar', 'Botón Empezar', '#btnStart']],
    fijas: [['inicio', 'Pantalla de inicio', '#startScreen'], ['stats', 'Vidas y preguntas', visible(['#startScreen .rp-stats', '#startScreen .start-info'])],
      ['reglas', 'Cómo funciona', '#startScreen .rp-reglas'], ['empezar', 'Botón Empezar', '#btnStart']],
    simulacro: [['modos', 'Rápido, Personalizado o Libre', '#modos'], ['nombre', 'Nombre del simulacro', '#campoNombre'], ['ciclos', 'Elegir ciclos', '#campoCiclos'],
      ['bloque', 'Bloque y carrera', cercaDe('#selBloque', '.dos')], ['tiempo', 'Tiempo', cercaDe('#tiempos', '.campo')], ['reglas', 'Reglas del puntaje', '.reglas'],
      ['reparto', 'Preguntas por área', cercaDe('#dist', '.card')], ['empezar', 'Botón Empezar', '#btnEmpezar'], ['mis', 'Mis simulacros', cercaDe('#misSim', '.card')],
      ['ranking', 'Top simulacro', '#topSim']],
    biblioteca: [['buscar', 'Buscador', '.buscar'], ['filtros', 'Botón Filtros', '#bFiltros'], ['areas', 'Áreas', '#tabs'], ['stats', 'Tus números', '#stats'],
      ['destacado', 'Libro destacado', '#heroes'], ['seguir', 'Seguir leyendo', estante('Seguir leyendo')], ['colecciones', 'Colecciones', estante('Colecciones')],
      ['libro', 'Primer libro de un estante', '#grupos .fila:not(.anchas):not(.cols) > *']],
    coleccion: [['modos', 'Mi estilo y Rangos', '.modos'], ['puesto', 'Así te ves', visible(['#puesto', '#tira'])], ['tabs', 'Pestañas (búho, marcos, pines…)', '#tabs'],
      ['grid', 'Lo que puedes ponerte', '#grid'], ['canjear', 'Botón Canjear', '#btnRegalo'], ['rangos', 'Botón Rangos', '.modo[data-modo="rangos"]']],
    perfil: [['tarjeta', 'Tu tarjeta de jugador', '#pjCard'], ['tabs', 'Mi perfil, Agenda y Ranking', cercaDe('#tabBtnPerfil', '[role="tablist"]')],
      ['datos', 'Datos del estudiante', '#datos'], ['racha', 'Racha', '#racha'], ['metas', 'Meta diaria', '#metas'], ['errores', 'Errores de hoy', '#errores'],
      ['simulacros', 'Mis simulacros', '#simulacros'], ['resena', 'Tu reseña', '#resena'], ['accesos', 'Mis accesos (códigos)', cercaDe('#accesos', '.panel')]]
  };
  // Páginas donde el tutorial espera a que se vea esta parte (por ejemplo, después del candado)
  var ESPERA = { simulacro: '#crear', duelo: '#crear', quiz: '#startScreen', falladas: '#startScreen', repaso: '#startScreen', fijas: '#startScreen',
    biblioteca: '#grupos .estante', coleccion: '#conSesion', perfil: '#conSesion' };

  function pagina() {
    var rel = location.pathname.slice(ROOT.pathname.length).replace(/^\/+/, '');
    var seg = rel.split('/'), resto = seg.slice(1).join('/');
    if (rel === '' || rel === 'index.html') return 'inicio';
    if (rel === 'simulacro.html') return 'simulacro';
    if (rel === 'duelo.html') return /[?&]d=/.test(location.search) ? null : 'duelo'; // solo en la pantalla de crear
    if (rel === 'falladas.html') return 'falladas';
    if (rel === 'biblioteca.html') return /#libro=/.test(location.hash) ? null : 'biblioteca'; // no encima del visor
    if (rel === 'coleccion.html') return 'coleccion';
    if (rel === 'perfil.html') return 'perfil';
    if (seg[0] === 'areas') return 'area';
    if (['panel', 'assets', 'examenes'].indexOf(seg[0]) >= 0) return null;
    if (resto === '' || resto === 'index.html') return 'curso';
    resto = resto.replace(/^(seminarios|banqueo)\//, 'libros/'); // Seminarios y Banqueo funcionan como el Libro
    if (resto === 'libros/' || resto === 'libros/index.html') return 'libros';
    if (resto === 'libros/temario.html') return 'temario';
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
  .mct-burbuja { position: fixed; z-index: 151; width: min(360px, calc(100vw - 24px)); background: #1E1935; color: #f2f2f2;
    border: 1px solid #302950; border-radius: 18px; padding: 18px 18px 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    font-family: 'Inter', system-ui, sans-serif; animation: mctIn .25s ease; transition: top .3s ease, left .3s ease; }
  .mct-burbuja::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; border-radius: 18px 18px 0 0; background: linear-gradient(90deg, #FBBF24, #C6E000); }
  .mct-paso { font-size: 10.5px; letter-spacing: 2.5px; text-transform: uppercase; color: #C6E000; font-weight: 700; margin-bottom: 6px; }
  .mct-burbuja h4 { font-family: 'Sora', 'Inter', sans-serif; font-size: 18px; font-weight: 800; margin: 0 0 6px; line-height: 1.25; }
  .mct-burbuja p { font-size: 14px; line-height: 1.6; color: #b5b5b5; margin: 0; }
  .mct-burbuja p b { color: #fff; }
  .mct-pie { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
  .mct-puntos { display: flex; gap: 5px; margin-right: auto; }
  .mct-puntos i { width: 7px; height: 7px; border-radius: 50%; background: #352E58; }
  .mct-puntos i.on { background: #C6E000; width: 18px; border-radius: 4px; }
  .mct-btn { border: none; border-radius: 10px; padding: 9px 14px; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }
  .mct-sig { background: #C6E000; color: #0e0e0e; }
  .mct-atr { background: #292245; color: #ccc; }
  .mct-saltar { position: absolute; top: 10px; right: 12px; background: none; border: none; color: #777; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
  .mct-saltar:hover { color: #fff; }
  @keyframes mctIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `;
  function estilos() { if (!document.getElementById('mctuto-css')) { var s = document.createElement('style'); s.id = 'mctuto-css'; s.textContent = css; document.head.appendChild(s); } }

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
      // Alertas abiertas o el candado tapando la página (assets/candado.js)
      var hayModal = document.querySelector('.mca-ov, .rep-overlay, .aviso-overlay, #mckFondo') || document.documentElement.classList.contains('mc-cerrado');
      var falta = ESPERA[pag] && document.querySelector(ESPERA[pag]);
      if (ESPERA[pag] && (!falta || falta.hidden || !falta.getBoundingClientRect().width)) { t0 = Date.now(); setTimeout(revisar, 500); return; }
      // Espera a que aparezcan todas las partes (algunas llegan después, como el rango);
      // si alguna no está en esta página, sigue con las que hay
      var obj = (cfg.pasos || []).filter(function (p) { return p.objetivo && p.objetivo !== 'centro'; });
      var vistos = obj.filter(function (p) { return buscar(pag, p.objetivo); }).length;
      if (!hayModal && (vistos === obj.length || (vistos && Date.now() - t0 > 2500) || Date.now() - t0 > 4000)) setTimeout(fn, 400);
      else if (Date.now() - t0 < 20000) setTimeout(revisar, 300);
    })();
  }

  // El tutorial de esta página, para el menú de tu foto (assets/auth.js)
  var actual = null;
  function hay() { return !!actual; }
  function abrir() { if (actual) iniciar(actual.pag, actual.cfg); }

  window.MCTutorial = { objetivos: OBJETIVOS, iniciar: iniciar, hay: hay, abrir: abrir };
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
      actual = { pag: pag, cfg: cfg };
      if (q || leer(clave) !== version) cuandoListo(pag, cfg, function () { iniciar(pag, cfg, function () { if (!borrador) escribir(clave, version); }); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();

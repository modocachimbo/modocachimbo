/* =========================================================
   Modo Cachimbo · Candado de página completa (Seminarios y Banqueo)
   Uso: <script src="../../assets/candado.js" data-producto="seminario-quimica" data-nombre="Seminarios"></script>
   Tapa la página hasta que el alumno tenga un código que la abra.
   Requiere assets/mc-config.js y assets/acceso.js
   ========================================================= */
(function () {
  var yo = document.currentScript;
  var PRODUCTO = yo && yo.getAttribute('data-producto');
  var NOMBRE = (yo && yo.getAttribute('data-nombre')) || 'Contenido';
  var CURSO = (yo && yo.getAttribute('data-curso')) || '';
  if (!PRODUCTO || !window.MCAcceso) return;

  var WA = 'https://wa.me/51917797543?text=' + encodeURIComponent('Hola! Quiero acceso a ' + NOMBRE + (CURSO ? ' de ' + CURSO : '') + ' en Modo Cachimbo');
  var css = document.createElement('style');
  css.textContent =
    'html.mc-cerrado body > *:not(#mcCandado) { visibility: hidden; }' +
    '#mcCandado { position: fixed; inset: 0; z-index: 9000; background: #050505; overflow-y: auto; display: flex; align-items: flex-start; justify-content: center; padding: 70px 20px 40px; font-family: Inter, sans-serif; }' +
    '#mcCandado .caja { width: 100%; max-width: 420px; background: #0e0e0e; border: 1px solid #232323; border-radius: 20px; padding: 34px 24px; text-align: center; }' +
    '#mcCandado .ico { width: 64px; height: 64px; margin: 0 auto 18px; color: #C6E000; }' +
    '#mcCandado h1 { font-family: Sora, sans-serif; font-size: 22px; font-weight: 800; color: #f5f5f5; margin: 0 0 8px; }' +
    '#mcCandado h1 span { color: #C6E000; }' +
    '#mcCandado p { font-size: 13px; color: #999; line-height: 1.6; margin: 0 0 20px; }' +
    '#mcCandado input { width: 100%; box-sizing: border-box; background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 13px 14px; color: #f2f2f2; font-size: 14px; text-align: center; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; }' +
    '#mcCandado input:focus { outline: none; border-color: #C6E000; }' +
    '#mcCandado input::placeholder { color: #555; font-weight: 400; letter-spacing: normal; text-transform: none; }' +
    '#mcCandado button { width: 100%; background: #C6E000; color: #0b0b0b; border: none; border-radius: 14px; padding: 13px 22px; font-weight: 700; font-size: 15px; cursor: pointer; }' +
    '#mcCandado button:disabled { opacity: .6; }' +
    '#mcCandado .err { display: none; margin-top: 14px; font-size: 12.5px; color: #ff8a8a; background: rgba(224,60,60,0.08); border-radius: 10px; padding: 10px 12px; line-height: 1.5; }' +
    '#mcCandado .wa { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; padding: 12px; border-radius: 12px; background: rgba(37,211,102,0.1); color: #25D366; text-decoration: none; font-size: 13px; font-weight: 700; }' +
    '#mcCandado .volver { display: inline-block; margin-top: 18px; color: #9a9a9a; font-size: 13px; text-decoration: none; }' +
    '#mcCandado .volver:hover { color: #C6E000; }';
  document.head.appendChild(css);

  var raiz = document.documentElement;
  var abierto = false;
  function abrir() {
    abierto = true;
    raiz.classList.remove('mc-cerrado');
    var c = document.getElementById('mcCandado'); if (c) c.remove();
  }
  function cerrar(msg) {
    raiz.classList.add('mc-cerrado');
    var c = document.getElementById('mcCandado');
    if (!c) {
      c = document.createElement('div'); c.id = 'mcCandado';
      c.innerHTML = '<div class="caja">' +
        '<div class="ico"><svg width="64" height="64" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 383.52 383.7"><g id="Capa_2" data-name="Capa 2"><g id="Capa_5" data-name="Capa 5"><path d="M0,225.76c4.06-10.67,10.43-15.06,21.9-15.08,8.11,0,16.22-.13,24.32.06,3.34.08,4.61-.87,4.54-4.42-.2-11-.12-21.95-.06-32.92.09-17.06,11.63-30.18,28.63-32.46,2.71-.37,3.52-1.58,3.5-4.17-.09-9.72,0-19.45,0-29.18C82.59,65.39,109.66,23.4,153.25,7c61.42-23.11,129.43,13.14,144.49,77a117.9,117.9,0,0,1,2.75,29c-.12,8,.05,16-.07,23.95,0,2.67,1,3.72,3.61,4.06a32.05,32.05,0,0,1,28.52,32.19c.07,11.1.12,22.2-.05,33.3-.05,3.26,1,4.39,4.26,4.31,8.35-.19,16.71-.09,25.07-.05,13.72.05,21.67,8,21.68,21.57q0,30.5,0,61c0,11.66-6.85,19.31-18.42,20.41-9.33.89-18.7.3-28,.31-3.34,0-4.62.94-4.55,4.47.21,10.35.08,20.71.07,31.06,0,17.12-8.05,28.23-24.29,33.62-.47.15-.91.38-1.37.57H76.35c-.46-.19-.9-.42-1.37-.57-16.28-5.46-24.27-16.48-24.29-33.55q0-15.13,0-30.27c0-5.24,0-5.25-5.09-5.26-7.73,0-15.45-.08-23.17,0-10.91.12-18.72-4.3-22.42-14.94Zm191.91-1.3H22.42c-7.57,0-9.38,1.82-9.39,9.54q0,28.25,0,56.49c0,8,1.86,9.87,9.93,9.87H360.45c7.83,0,9.77-1.9,9.77-9.66q0-28.06,0-56.13c0-8.47-1.62-10.11-9.94-10.11ZM191.66,314h-37.8q-42.27,0-84.56,0c-2.64,0-5-.11-4.9,3.73.16,11.73,0,23.45.12,35.17a16.83,16.83,0,0,0,4.78,11.46c4.7,5.2,10.79,6.29,17.34,6.29H296.55c.75,0,1.5,0,2.24,0,12.75-.45,20-7.88,20-20.66q0-15.15,0-30.31c0-5.63,0-5.64-5.54-5.65Zm-.06-103.36q61.18,0,122.35.07c3.72,0,5-1,4.93-4.84-.23-10.85,0-21.7-.11-32.55-.09-11.45-7.88-19.21-19.38-19.21q-107.74-.06-215.5,0c-11.65,0-19.35,7.8-19.42,19.54-.07,10.6,0,21.2,0,31.8,0,5.17,0,5.19,5.19,5.19Zm-.16-70.3h53.14c2,0,3.91,0,3.89-2.76-.08-12.35,1.15-24.79-.5-37C244.25,73.07,219.29,49,185.26,52.36c-28.51,2.82-51.08,28.05-50.54,56.46q.25,13.46-.05,26.94c-.08,3.63,1.22,4.71,4.76,4.68C156.77,140.3,174.11,140.38,191.44,140.38ZM121,120.21h.16c0-6-.51-12,.09-17.95C125.3,62.09,161,34,201,39.07a70.35,70.35,0,0,1,61.18,69c.06,9.48.11,19,0,28.44,0,2.94,1,4,3.89,3.91,5.86-.15,11.73-.11,17.59,0,2.51,0,3.66-.81,3.55-3.47-.15-3.49,0-7,0-10.48,0-11.84.42-23.72-1.93-35.41C275.33,41.6,231,9,180.88,14.21c-37.89,3.93-70.95,32.14-81.13,69-5,18-3.38,36.38-3.65,54.67,0,2,1.26,2.47,3,2.47,6.24,0,12.47-.05,18.71,0,2.4,0,3.33-.94,3.29-3.35C121,131.44,121,125.83,121,120.21Z"/><path d="M217.34,275.05a6.46,6.46,0,0,1-9,6.23c-2.26-1-4.24-2.59-6.39-3.84-.91-.54-1.73-1.85-2.91-1.17-.94.55-.43,1.83-.51,2.79s0,1.75-.1,2.61c-.53,4-3.23,6.5-6.94,6.44-3.54-.06-6-2.52-6.73-6.31-.38-1.9,1.38-4.81-1.18-5.46-1.33-.34-3.31,1.84-5,2.88-.32.2-.62.42-.94.62-4.5,2.87-8.57,2.47-10.79-1.08s-.87-7.51,3.48-10.36c1.77-1.16,3.54-2.32,5.3-3.51,3.68-2.47,3.68-2.56.14-5-2.16-1.47-4.39-2.84-6.49-4.4-3.62-2.68-4.49-6.54-2.33-9.75s6-3.85,9.89-1.48c1.49.9,2.88,2,4.37,2.87.93.56,1.81,1.84,2.9,1.37s.46-2,.61-3c.11-.86,0-1.75.12-2.61.52-3.75,3.23-6.38,6.61-6.48s6.27,2.64,7,6.5c.38,1.91-1.3,4.79,1.09,5.5,1.27.38,3.3-1.85,5-2.9l.62-.41c4.81-3.16,8.79-2.9,11.13.74s1,7.43-3.63,10.65c-1.74,1.2-3.53,2.34-5.28,3.53-3.34,2.27-3.33,2.37.14,4.72,2.17,1.47,4.36,2.9,6.53,4.37A6.76,6.76,0,0,1,217.34,275.05Z"/><path d="M236,275.06a7.21,7.21,0,0,1,3.36-5.85c2.47-1.68,4.92-3.4,7.47-5s2.11-2.59-.12-3.93c-2.46-1.47-4.83-3.09-7.17-4.75-3.63-2.59-4.55-6.5-2.41-9.72s6-3.89,9.86-1.57c.32.19.63.42.95.6,2.15,1.23,4.31,4.21,6.24,3.56,2.18-.73.41-4.22,1-6.44.9-3.26,2.94-5.29,6.28-5.48a6.33,6.33,0,0,1,6.79,4.74,10.74,10.74,0,0,1,.48,2.18c.66,5.69.65,5.69,5.64,2.37,1-.69,2.05-1.44,3.14-2,3.37-1.79,7-1,9,1.89a6.62,6.62,0,0,1-1.32,9,83.56,83.56,0,0,1-8.58,6c-2.06,1.28-2,2.11,0,3.34,2.65,1.62,5.25,3.36,7.76,5.2,3.47,2.53,4.33,6.34,2.29,9.46-2.19,3.36-5.94,4.06-9.81,1.74-1.92-1.15-3.77-2.43-5.62-3.7s-2.41-.56-2.4,1.37a24.35,24.35,0,0,1-.14,3.73c-.58,3.95-3.41,6.41-7.09,6.28s-5.94-2.6-6.51-6.48c-.28-1.86,1-4.63-1-5.35-1.6-.58-3.33,1.79-5,2.8-2.43,1.46-4.67,3.48-7.86,2.57S236.29,278.5,236,275.06Z"/><path d="M114.49,249.52c0-2.74-.14-4.48,0-6.18.42-4.23,3.25-7,7-6.9s6.41,3,6.68,7.16c.37,5.78.37,5.78,5.36,2.47,1.14-.76,2.25-1.58,3.44-2.23,3.35-1.84,6.94-1.07,9,1.84a6.75,6.75,0,0,1-1.51,9.33c-2.67,2-5.53,3.83-8.35,5.66-1.74,1.13-1.93,2.06,0,3.25,2.63,1.67,5.23,3.38,7.75,5.21,3.68,2.68,4.51,6.46,2.27,9.73s-6,3.85-9.89,1.51c-1.71-1-3.38-2.12-5-3.31-2.55-1.89-3.17-.81-3,1.79a17.64,17.64,0,0,1-.05,2.62c-.42,4.08-3,6.61-6.71,6.64s-6.28-2.5-7-6.48c-.31-1.84,1-4.63-1-5.32-1.61-.54-3.31,1.84-5,2.82-.87.5-1.66,1.12-2.53,1.59-3.55,1.93-7.11,1.19-9.23-1.88a6.68,6.68,0,0,1,1.78-9.26c2.68-2,5.52-3.85,8.36-5.64,1.78-1.13,2-2,.07-3.17-2.33-1.44-4.59-3-6.85-4.55-4.47-3-5.71-6.79-3.44-10.34s6.32-4,11.11-.84C109.66,246.32,111.61,247.62,114.49,249.52Z"/><path d="M31.65,242.8c3.39,0,5.54,2.33,8.11,3.79,1.26.71,2.39,2.53,3.81,1.82,1.21-.61.44-2.52.56-3.84.28-2.95.83-5.73,3.76-7.28,4.65-2.47,9.59.64,10,6.22.11,1.7-.84,4.18.52,4.92,1.7.93,3.12-1.46,4.71-2.3,1.43-.75,2.7-1.82,4.15-2.52a6.49,6.49,0,0,1,8.56,2.25,6.35,6.35,0,0,1-1.25,8.75,76.9,76.9,0,0,1-8.3,5.73c-2.21,1.37-2.58,2.41-.12,3.89s5,3.23,7.47,5c3.55,2.57,4.36,6.16,2.28,9.43s-6,4.09-9.81,1.78c-2-1.22-4-2.59-5.94-3.91-1.51-1-2.28-.7-2.27,1.2a40.21,40.21,0,0,1-.07,4.11,6.7,6.7,0,0,1-13.18,1.25,11.34,11.34,0,0,1-.39-1.82c-.76-5.69-.75-5.68-5.52-2.52a38.18,38.18,0,0,1-3.48,2.18,6.61,6.61,0,0,1-8.88-2.13,6.51,6.51,0,0,1,1.55-9,84.55,84.55,0,0,1,8.36-5.66c2.3-1.4,2-2.35-.07-3.63-2.85-1.79-5.68-3.63-8.35-5.68a6.23,6.23,0,0,1-2.24-7.36A6.63,6.63,0,0,1,31.65,242.8Z"/><path d="M332.21,288.14c-6.22,0-12.44.05-18.66,0-4.32-.05-7.45-3-7.37-6.74s3.09-6.46,7.25-6.48q18.65-.11,37.31,0c4.54,0,7.32,2.74,7.25,6.73s-2.87,6.45-7.5,6.5C344.39,288.19,338.3,288.14,332.21,288.14Z"/><path d="M76.2,182.45c0-3-.11-6,0-9,.21-4.41,2.21-6.73,6.56-7.19a96.05,96.05,0,0,1,19.77,0c4.23.43,6.4,3.14,6.22,7s-2.74,6.18-6.92,6.33c-3,.1-6,.09-9,0-2.06-.05-3,.81-2.93,2.88.05,2.74.06,5.48,0,8.22-.16,5-2.89,8.2-6.9,8.18s-6.75-3.28-6.84-8.2c-.06-2.74,0-5.48,0-8.22Z"/></g></g></svg></div>' +
        '<h1>' + NOMBRE.replace(/</g, '&lt;') + ' <span>Premium</span></h1>' +
        '<p>Esta sección se abre con tu código de alumno. Si ya tienes uno, ingrésalo abajo.</p>' +
        '<input type="text" id="mcCandCod" placeholder="Ej: RVB-4X9K" autocomplete="off" autocapitalize="characters" aria-label="Código de acceso">' +
        '<button type="button" id="mcCandBtn">Desbloquear</button>' +
        '<div class="err" id="mcCandErr"></div>' +
        '<a class="wa" href="' + WA + '" target="_blank" rel="noopener noreferrer">Pide tu código por WhatsApp</a>' +
        '<a class="volver" href="' + (yo.getAttribute('data-volver') || '../index.html') + '">Volver al curso</a>' +
        '</div>';
      document.body.appendChild(c);
      var inp = c.querySelector('#mcCandCod'), btn = c.querySelector('#mcCandBtn');
      var probar = function () {
        var cod = inp.value.trim().toUpperCase();
        if (!cod) { error('Ingresa tu código de acceso.'); return; }
        btn.disabled = true; btn.textContent = 'Verificando…';
        MCAcceso.activar(cod, PRODUCTO).then(function (r) {
          if (r.ok) abrir(); else error(r.mensaje || 'Código inválido.');
        }).catch(function () { error('No se pudo verificar el código. Revisa tu conexión e intenta de nuevo.'); })
          .then(function () { btn.disabled = false; btn.textContent = 'Desbloquear'; });
      };
      btn.addEventListener('click', probar);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') probar(); });
    }
    if (msg) error(msg);
  }
  function error(m) { var e = document.getElementById('mcCandErr'); if (e) { e.textContent = m; e.style.display = 'block'; } }

  // Sin esperar al servidor: si este dispositivo ya tenía acceso, la página se ve al toque
  var local = MCAcceso.accesoLocal(PRODUCTO);
  if (!local) raiz.classList.add('mc-cerrado');
  function iniciar() {
    if (!local) cerrar();
    MCAcceso.verificar(PRODUCTO).then(function (v) {
      if (v.acceso) { if (!abierto) abrir(); }
      else cerrar(v.mensaje || (v.error === 'conexion' ? 'No se pudo verificar tu acceso. Revisa tu conexión.' : ''));
    });
  }
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();

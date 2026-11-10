/* =========================================================
   Modo Cachimbo · Arcade · Retos (minijuegos dentro de un nivel)
   Motor independiente del mapa de niveles: se le pasa una "ruta" (lista de
   retos de un JSON como assets/arcade-retos/hp-01-poblamiento.json) y la
   juega en pantalla completa sobre el cielo del Arcade.

   Tipos de reto (inspirados en Duolingo y juegos de celular):
     imagen     · elige la imagen correcta (4 dibujos hechos con código)
     relacionar · toca los pares (dos columnas)
     parejas    · cartas de memoria que se voltean
     completar  · completa la frase con el banco de palabras
     ordenar    · línea de tiempo: del más antiguo al más reciente
     sopa       · sopa de letras (arrastrar o tocar inicio y fin)
     vf         · verdadero o falso contrarreloj (deslizar la carta)

   Uso:
     MCRetos.jugar({ titulo, retos: [...] }, {
       vidas: 5,
       alTerminar: function (r) { r.estrellas, r.errores, r.segundos, r.gano },
       alCerrar: function () {}
     });
   Requiere assets/arcade-retos.css. Usa MCSonido si está cargado.
   Nunca emojis: todos los íconos y dibujos son SVG.
   ========================================================= */
(function () {
  if (window.MCRetos) return;
  var T = '#1A1046';

  /* ---------- Íconos ---------- */
  var IC = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    corazon: '<svg viewBox="0 0 32 32"><path d="M16 28C8 22 3 17.5 3 11.5 3 7.4 6.2 4.5 9.8 4.5c2.6 0 4.6 1.4 6.2 3.6 1.6-2.2 3.6-3.6 6.2-3.6 3.6 0 6.8 2.9 6.8 7 0 6-5 10.5-13 16.5z" fill="#FF4B6E" stroke="#7A0A22" stroke-width="2.2"/><path d="M8 9.5c.8-1.6 2.4-2.4 4-2" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".8"/></svg>',
    bien: '<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#58CC02" stroke="#1E5A00" stroke-width="2.5"/><path d="M10 17.5l5 5 9-10" fill="none" stroke="#fff" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mal: '<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#FF4B4B" stroke="#6A0A0A" stroke-width="2.5"/><path d="M11.5 11.5l11 11M22.5 11.5l-11 11" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/></svg>',
    estrella: function (on) { return '<svg viewBox="0 0 64 64"><path d="M32 4l8.4 17.6 19.2 2.4-14.1 13.2 3.7 19L32 46.8 14.8 56.2l3.7-19L4.4 24l19.2-2.4z" fill="' + (on ? '#FFC800' : '#3A2C7A') + '" stroke="' + (on ? '#7A4A00' : '#1A0F4A') + '" stroke-width="3.5" stroke-linejoin="round"/>' + (on ? '<path d="M24 22l6-1 2-5" fill="none" stroke="#FFF3B0" stroke-width="3" stroke-linecap="round"/>' : '') + '</svg>'; },
    reloj: '<svg viewBox="0 0 26 26"><circle cx="13" cy="14" r="10" fill="#FFC800" stroke="#7A4A00" stroke-width="2.4"/><path d="M13 9v5.5l3.5 2" fill="none" stroke="#7A4A00" stroke-width="2.6" stroke-linecap="round"/><rect x="10" y="1.5" width="6" height="3" rx="1.2" fill="#7A4A00"/></svg>',
    rayo: '<svg viewBox="0 0 24 24"><path d="M14 2L4 14h7l-2 8 11-13h-7z" fill="#C6E000" stroke="#2A3300" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    diana: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#FF6B8A" stroke="#7A0A22" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="#fff"/><circle cx="12" cy="12" r="2.4" fill="#FF4B6E"/></svg>',
    flechaV: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    flechaF: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
    antiguo: '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2v10M3.5 7.5L8 12l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fuego: '<svg viewBox="0 0 24 24"><path d="M12 2.5c1 3.6 5.8 5.6 5.8 11a5.8 5.8 0 0 1-11.6 0c0-2.6 1.2-4.2 2.6-5.6.2 1.6 1 2.8 2.2 3.2-.8-3.4.4-6.4 1-8.6z" fill="#FF8A00" stroke="#7A2E00" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 12.5c1.4 1.4 2.8 2.4 2.8 4.4a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.4 2.8-4.4z" fill="#FFD84D"/></svg>',
    pista: '<svg viewBox="0 0 24 24"><path d="M12 2.5a7 7 0 0 0-4.2 12.6c.7.6 1.2 1.4 1.2 2.4h6c0-1 .5-1.8 1.2-2.4A7 7 0 0 0 12 2.5z" fill="#FFD84D" stroke="#7A4A00" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 20h5M10.5 22.5h3" stroke="#7A4A00" stroke-width="2" stroke-linecap="round"/><path d="M9.5 8a3 3 0 0 1 2.5-2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
    ojo: '<svg viewBox="0 0 24 24"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" fill="#fff" stroke="#1A1046" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="#5A2FD0"/><circle cx="12" cy="12" r="1.8" fill="#1A1046"/><circle cx="13.4" cy="10.6" r="1" fill="#fff"/></svg>',
    // Íconos de cada tipo de reto
    imagen: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.4" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6" stroke-linecap="round"/><circle cx="16" cy="9" r="1.8" fill="#C6E000"/></svg>',
    relacionar: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.4" stroke-linecap="round"><rect x="2.5" y="4" width="7" height="5" rx="1.5"/><rect x="2.5" y="15" width="7" height="5" rx="1.5"/><rect x="14.5" y="4" width="7" height="5" rx="1.5"/><rect x="14.5" y="15" width="7" height="5" rx="1.5"/><path d="M9.5 6.5l5 11M9.5 17.5l5-11"/></svg>',
    parejas: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.4" stroke-linejoin="round"><rect x="2.5" y="5" width="10" height="14" rx="2" transform="rotate(-10 7.5 12)"/><rect x="11.5" y="5" width="10" height="14" rx="2" transform="rotate(8 16.5 12)" fill="#C6E000"/></svg>',
    completar: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.4" stroke-linecap="round"><path d="M3 8h6M14 8h7M3 16h3"/><rect x="9" y="13" width="9" height="6" rx="1.5" fill="#C6E000"/></svg>',
    ordenar: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.4" stroke-linecap="round"><path d="M5 3v18"/><circle cx="5" cy="6" r="2" fill="#C6E000"/><circle cx="5" cy="12" r="2" fill="#C6E000"/><circle cx="5" cy="18" r="2" fill="#C6E000"/><path d="M10 6h10M10 12h7M10 18h9"/></svg>',
    sopa: '<svg viewBox="0 0 24 24" fill="none" stroke="#C6E000" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M6.5 8.5l11 7" stroke-width="4.4" stroke-linecap="round" opacity=".55"/><path d="M8 3v18M13 3v18M3 8h18M3 13h18" stroke-width="1" opacity=".6"/></svg>',
    vf: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5l3.5 3.5L12 9" stroke="#C6E000"/><path d="M15 9l6 6M21 9l-6 6" stroke="#FF8A8A"/></svg>',
    // Dorso de las cartas de memoria: rombo andino
    dorso: '<svg viewBox="0 0 60 60" fill="none"><path d="M30 4l26 26-26 26L4 30z" stroke="rgba(255,255,255,.35)" stroke-width="3"/><path d="M30 14l16 16-16 16-16-16z" fill="#C6E000" stroke="#2A3300" stroke-width="2.5"/><path d="M30 22l8 8-8 8-8-8z" fill="#5A2FD0"/><circle cx="30" cy="30" r="2.5" fill="#C6E000"/></svg>'
  };

  /* ---------- Dibujos del tema (viewBox 100×100) ---------- */
  var DIB = {
    bering: '<svg viewBox="0 0 100 100"><rect x="4" y="18" width="92" height="64" rx="14" fill="#2D7FD8" stroke="' + T + '" stroke-width="3"/>' +
      '<path d="M8 22h22q4 12-2 22t2 24q-4 10-22 10z" fill="#7BC043" stroke="#2C5A12" stroke-width="2.5"/>' +
      '<path d="M92 22H70q-6 10 0 22t-4 22q2 10 26 12z" fill="#7BC043" stroke="#2C5A12" stroke-width="2.5"/>' +
      '<path d="M28 40q10-6 22-4t20 4l-2 18q-10 4-20 2t-20-2z" fill="#EAF6FF" stroke="#9CC9F0" stroke-width="2.5"/>' +
      '<path d="M36 44l4 3M48 41l3 4M58 46l4 2M44 53l4 2" stroke="#9CC9F0" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M18 50q30-16 60-2" fill="none" stroke="#C6E000" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 8"/>' +
      '<path d="M72 40l8 8-11 3" fill="none" stroke="#C6E000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="18" y="74" font-family="Lilita One, sans-serif" font-size="9" fill="#fff" text-anchor="middle">ASIA</text>' +
      '<text x="82" y="74" font-family="Lilita One, sans-serif" font-size="8" fill="#fff" text-anchor="middle">AMÉRICA</text></svg>',
    balsa: '<svg viewBox="0 0 100 100"><circle cx="76" cy="24" r="10" fill="#FFC800" stroke="#7A4A00" stroke-width="2.5"/>' +
      '<path d="M44 22v38" stroke="#6B3E14" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M46 24q22 10 2 32z" fill="#FFF3D6" stroke="' + T + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M48 32q8 6 2 16" fill="none" stroke="#FF8A00" stroke-width="2.5"/>' +
      '<rect x="20" y="58" width="52" height="9" rx="4.5" fill="#B8742E" stroke="#5A3008" stroke-width="2.5"/>' +
      '<path d="M30 58v9M40 58v9M50 58v9M60 58v9" stroke="#5A3008" stroke-width="2"/>' +
      '<path d="M4 72q8-6 16 0t16 0 16 0 16 0 16 0 12 0V96H4z" fill="#2D7FD8" stroke="' + T + '" stroke-width="2.5"/>' +
      '<path d="M10 84q6-4 12 0M50 86q6-4 12 0M76 80q5-3 10 0" fill="none" stroke="#9FD3FF" stroke-width="2.5" stroke-linecap="round"/></svg>',
    antartida: '<svg viewBox="0 0 100 100"><rect x="4" y="60" width="92" height="30" rx="10" fill="#2D7FD8" stroke="' + T + '" stroke-width="3"/>' +
      '<path d="M8 68l14-28 10 14 12-26 16 30 10-12 22 22z" fill="#F4FBFF" stroke="#6FA8D8" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M44 28l5 10-7 4M22 40l4 8" fill="none" stroke="#9CC9F0" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M10 20q40-18 78 6" fill="none" stroke="#C6E000" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 8"/>' +
      '<path d="M80 16l9 10-12 2" fill="none" stroke="#C6E000" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<g transform="translate(70 66)"><ellipse cx="0" cy="8" rx="7" ry="9" fill="#1A1046"/><ellipse cx="0" cy="10" rx="4.5" ry="6.5" fill="#fff"/><circle cx="0" cy="-2" r="5" fill="#1A1046"/><path d="M-1 -1l4 1-4 1z" fill="#FFC800"/></g></svg>',
    fosil: '<svg viewBox="0 0 100 100"><path d="M10 70q2-30 20-40t44-6 18 30-12 34-50 4-20-22z" fill="#C9A77A" stroke="#5A3A12" stroke-width="3"/>' +
      '<path d="M22 64q6-4 10 2M64 30q6 2 8 8M70 72q4-4 8-2" fill="none" stroke="#8C6A3E" stroke-width="2.5" stroke-linecap="round"/>' +
      '<g transform="rotate(-24 50 54)"><rect x="32" y="49" width="36" height="10" rx="5" fill="#FFF8E8" stroke="' + T + '" stroke-width="2.5"/>' +
      '<circle cx="31" cy="48" r="6" fill="#FFF8E8" stroke="' + T + '" stroke-width="2.5"/><circle cx="31" cy="60" r="6" fill="#FFF8E8" stroke="' + T + '" stroke-width="2.5"/>' +
      '<circle cx="69" cy="48" r="6" fill="#FFF8E8" stroke="' + T + '" stroke-width="2.5"/><circle cx="69" cy="60" r="6" fill="#FFF8E8" stroke="' + T + '" stroke-width="2.5"/>' +
      '<rect x="34" y="50.5" width="32" height="7" fill="#FFF8E8"/></g>' +
      '<path d="M50 6v12M44 12h12" stroke="#C6E000" stroke-width="4" stroke-linecap="round"/></svg>',
    punta: '<svg viewBox="0 0 100 100"><g transform="rotate(32 50 50)"><path d="M50 4q16 18 16 44 0 10-6 16l-4 4v22q0 4-6 4t-6-4V68l-4-4q-6-6-6-16 0-26 16-44z" fill="#A9A39A" stroke="' + T + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M50 4v64M42 22l8 8 8-8M38 36l12 10 12-10M37 50l13 10 13-10" fill="none" stroke="#6E6860" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M44 16q-4 10-5 22" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/></g></svg>',
    pintura: '<svg viewBox="0 0 100 100"><path d="M6 20q10-12 44-12t44 12v60q-10 12-44 12T6 80z" fill="#E2B97E" stroke="#6B4316" stroke-width="3"/>' +
      '<path d="M14 30q4 3 8 1M78 74q4 2 7 0M70 22q5-2 9 1" fill="none" stroke="#C49358" stroke-width="2" stroke-linecap="round"/>' +
      '<g fill="#B3261E" stroke="#B3261E" stroke-linecap="round" stroke-width="3.2">' +
      '<circle cx="24" cy="38" r="4" stroke="none"/><path d="M24 42v14M24 56l-5 10M24 56l5 10M24 47l-6 4M24 47l10-5" fill="none"/><path d="M30 44l16-10" stroke-width="2.4" fill="none"/>' +
      '<ellipse cx="62" cy="44" rx="10" ry="5" stroke="none"/><path d="M70 42l4-10 4 1M56 48l-2 9M60 48l0 9M66 48l1 9M70 47l2 9" fill="none" stroke-width="2.6"/>' +
      '<ellipse cx="60" cy="68" rx="8" ry="4" stroke="none"/><path d="M66 66l3-8 3 1M55 71l-2 7M59 71v7M63 71l1 7M67 70l2 7" fill="none" stroke-width="2.4"/>' +
      '<path d="M84 52l-3 6M82 30v6" fill="none" stroke-width="2"/></g>' +
      '<path d="M40 70a4 4 0 1 0 8 0 4 4 0 1 0-8 0" fill="none" stroke="#B3261E" stroke-width="2"/></svg>',
    frijol: '<svg viewBox="0 0 100 100"><path d="M60 14q10-6 18 2-10 4-14 12" fill="#7BC043" stroke="#2C5A12" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M66 18q4 14-6 34T22 84q-8 2-10-4 0-4 6-8 22-14 30-30t10-24z" fill="#8FD14F" stroke="#2C5A12" stroke-width="3" stroke-linejoin="round"/>' +
      '<g fill="#7A2E1A" stroke="' + T + '" stroke-width="2"><ellipse cx="52" cy="40" rx="6" ry="4.5" transform="rotate(-50 52 40)"/><ellipse cx="42" cy="56" rx="6" ry="4.5" transform="rotate(-38 42 56)"/><ellipse cx="29" cy="69" rx="6" ry="4.5" transform="rotate(-28 29 69)"/></g>' +
      '<g stroke="' + T + '" stroke-width="2.5"><ellipse cx="74" cy="72" rx="10" ry="7" fill="#F4E3C4" transform="rotate(20 74 72)"/><ellipse cx="58" cy="84" rx="9" ry="6.5" fill="#B3261E" transform="rotate(-10 58 84)"/></g>' +
      '<path d="M70 69q4-1 7 2M54 82q3-2 6 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>',
    craneo: '<svg viewBox="0 0 100 100"><path d="M50 10c-22 0-36 15-36 34 0 12 6 20 12 24v12q0 6 6 6h36q6 0 6-6V68c6-4 12-12 12-24 0-19-14-34-36-34z" fill="#F6EEDC" stroke="' + T + '" stroke-width="3"/>' +
      '<ellipse cx="36" cy="46" rx="9" ry="10" fill="' + T + '"/><ellipse cx="64" cy="46" rx="9" ry="10" fill="' + T + '"/>' +
      '<path d="M50 56l-5 10h10z" fill="' + T + '"/><path d="M38 76v10M46 76v10M54 76v10M62 76v10" stroke="' + T + '" stroke-width="2.5"/>' +
      '<path d="M28 26q8-8 20-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    llama: '<svg viewBox="0 0 100 100"><path d="M6 78h88M10 64h80" stroke="#8C5A22" stroke-width="4" stroke-linecap="round"/><path d="M14 58v32M86 58v32" stroke="#6B4316" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M60 14l3-8 4 7q6 2 6 9v26q0 8-8 10H36q-10 0-12-8 0-10 10-12h20V24q0-8 6-10z" fill="#FFF3E0" stroke="' + T + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M32 58v26M42 60v24M52 60v24M62 58v26" stroke="' + T + '" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="66" cy="20" r="2.2" fill="' + T + '"/><path d="M73 26h4" stroke="' + T + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M54 36h12M54 42h12" stroke="#E2463A" stroke-width="3.5"/></svg>'
  };

  /* ---------- Utilidades ---------- */
  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function barajar(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function son(n) { try { window.MCSonido && MCSonido.efecto(n); } catch (e) {} }
  function vibrar(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  var NOMBRE = { imagen: 'Elige la imagen', relacionar: 'Toca los pares', parejas: 'Cartas parejas', completar: 'Completa', ordenar: 'Línea de tiempo', sopa: 'Sopa de letras', vf: 'Contrarreloj' };
  var ELOGIOS = ['¡Excelente!', '¡Bien hecho!', '¡Genial!', '¡Correcto!', '¡Así se hace!'];

  function cielo() {
    var s = '', i;
    for (i = 0; i < 34; i++) s += '<i class="' + (i % 6 ? '' : 'l') + '" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 70).toFixed(1) + '%;--s:' + (1.5 + Math.random() * 2.5).toFixed(1) + 'px;--t:' + (2 + Math.random() * 4).toFixed(1) + 's;--d:-' + (Math.random() * 5).toFixed(1) + 's"></i>';
    for (i = 0; i < 4; i++) s += '<b style="--y:' + (10 + i * 22) + '%;--w:' + (140 + Math.random() * 160).toFixed(0) + 'px;--o:' + (.08 + Math.random() * .1).toFixed(2) + ';--t:' + (50 + Math.random() * 40).toFixed(0) + 's;--d:-' + (Math.random() * 60).toFixed(0) + 's"></b>';
    return '<div class="rt-cielo">' + s + '</div>';
  }

  /* =========================================================
     Juego: arma la pantalla y va pasando los retos
     ========================================================= */
  function jugar(ruta, opts) {
    opts = opts || {};
    var vidas = opts.vidas == null ? 5 : opts.vidas, errores = 0, inicio = Date.now();
    var cola = ruta.retos.slice(), total = cola.length, hechos = 0, actual = null;
    var racha = 0, mejorRacha = 0, xp = 0, primera = {};   // primera[id] = lo acertó a la primera
    var raiz = h('<div class="rt" role="dialog" aria-label="' + esc(ruta.titulo || 'Nivel') + '">' + cielo() +
      '<div class="rt-col"><div class="rt-top"><button class="rt-x" aria-label="Salir">' + IC.x + '</button><div class="rt-barra"><i></i></div>' +
      '<div class="rt-vidas">' + IC.corazon + '<span></span></div></div><div class="rt-racha" aria-live="polite"></div><div class="rt-cab"></div><div class="rt-cuerpo"></div></div>' +
      '<div class="rt-pie"><div class="rt-pie-in"><button class="rt-btn" disabled>Comprobar</button></div>' +
      '<div class="rt-hoja"><div class="rt-hoja-in"><h3></h3><p></p><button class="rt-btn">Continuar</button></div></div></div>' +
      '<div class="rt-salir"><div class="rt-salir-in"><b>¿Salir del nivel?</b><p>Si sales ahora pierdes lo que llevas de este nivel.</p>' +
      '<button class="rt-btn verde" data-a="seguir">Seguir jugando</button><button class="otra" data-a="salir">Salir</button></div></div></div>');
    document.body.appendChild(raiz);
    var $ = function (s) { return raiz.querySelector(s); };
    var pie = $('.rt-pie'), cab = $('.rt-cab'), cuerpo = $('.rt-cuerpo'), btn = $('.rt-pie-in .rt-btn'), hoja = $('.rt-hoja'), hojaBtn = $('.rt-hoja .rt-btn');
    var pintarVidas = function () { $('.rt-vidas span').textContent = vidas; };
    var pintarBarra = function () { $('.rt-barra i').style.width = (hechos / total * 100) + '%'; };
    pintarVidas(); pintarBarra();

    // Salir: si ya avanzó, pregunta antes (como Duolingo), nunca con alert del navegador
    var salir = $('.rt-salir');
    $('.rt-x').onclick = function () {
      son('tap');
      if (!hechos && !errores) { cerrar(); opts.alCerrar && opts.alCerrar(); return; }
      salir.classList.add('on');
    };
    salir.onclick = function (e) {
      var a = e.target.closest('[data-a]'); if (!a && e.target !== salir) return;
      salir.classList.remove('on'); son('tap');
      if (a && a.dataset.a === 'salir') { cerrar(); opts.alCerrar && opts.alCerrar(); }
    };
    function cerrar() { if (actual && actual.limpiar) actual.limpiar(); window.removeEventListener('keydown', teclas); raiz.remove(); }

    // Teclado en PC: Enter = Comprobar / Continuar, 1-9 = elegir opción
    function teclas(e) {
      if (!raiz.isConnected || salir.classList.contains('on')) return;
      if (e.key === 'Enter') {
        var fb = raiz.querySelector('.rt-fin .rt-btn');
        if (fb) { e.preventDefault(); fb.click(); return; }
        if (hoja.classList.contains('on')) { e.preventDefault(); hojaBtn.click(); }
        else if (!btn.disabled && btn.style.display !== 'none') { e.preventDefault(); btn.click(); }
        return;
      }
      if (e.key === 'Escape') { $('.rt-x').click(); return; }
      var n = +e.key; if (!n || hoja.classList.contains('on')) return;
      var ops = cuerpo.querySelectorAll('.rt-img .rt-t, .rt-banco .rt-p:not(.fant), .rt-ord-banco .rt-t:not(.fant)');
      if (ops[n - 1]) ops[n - 1].click();
    }
    window.addEventListener('keydown', teclas);

    // Racha de aciertos seguidos: chip de fuego y XP extra
    function pintarRacha(sube) {
      var r = $('.rt-racha');
      if (racha < 2) { r.classList.remove('on'); return; }
      r.innerHTML = IC.fuego + '<b>' + racha + '</b> seguidas' + (racha >= 5 ? '<em>XP x2</em>' : '');
      r.classList.add('on');
      if (sube) { r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); }
    }

    var comprobar = null, resultado = null;
    btn.onclick = function () { if (comprobar) { son('tap'); mostrar(comprobar()); } };
    hojaBtn.onclick = function () {
      hoja.classList.remove('on');
      var r = resultado;
      if (r.ok) { hechos++; } else { vidas--; pintarVidas(); var v = $('.rt-vidas'); v.classList.remove('pierde'); void v.offsetWidth; v.classList.add('pierde'); cola.push(actual.reto); }
      pintarBarra();
      if (vidas <= 0) return setTimeout(fin, 350);
      siguiente();
    };

    // Lo que cada reto puede usar
    function api(reto) {
      return {
        reto: reto, cuerpo: cuerpo, iconos: IC,
        listo: function (si) { btn.disabled = !si; },
        alComprobar: function (fn) { comprobar = fn; },
        sinBoton: function () { comprobar = null; btn.disabled = true; btn.style.display = 'none'; pie.classList.add('vacio'); },
        error: function () { errores++; son('mal'); vibrar(60); },
        acierto: function () { son('tap'); },
        terminar: function (r) { setTimeout(function () { mostrar(r); }, 450); }
      };
    }

    function mostrar(r) {
      resultado = r;
      var id = actual.reto.id || actual.reto.tipo;
      if (r.ok) {
        son('bien');
        if (!(id in primera)) primera[id] = true;
        racha++; mejorRacha = Math.max(mejorRacha, racha);
        var gana = 10 * (racha >= 5 ? 2 : 1); xp += gana;
        if (racha === 3 || racha === 5) son('abrir');
      } else {
        errores++; son('mal'); vibrar(120); primera[id] = false; racha = 0;
      }
      try { window.MCCorazones && MCCorazones.respuesta && MCCorazones.respuesta(!!r.ok); } catch (e) {}
      pintarRacha(r.ok);
      pie.classList.remove('vacio');
      hoja.className = 'rt-hoja on ' + (r.ok ? 'bien' : 'mal');
      hoja.querySelector('h3').innerHTML = (r.ok ? IC.bien : IC.mal) + esc(r.titulo || (r.ok ? ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)] : 'Respuesta correcta:')) +
        (r.ok ? '<span class="xp">' + IC.rayo + '+' + (10 * (racha >= 5 ? 2 : 1)) + '</span>' : '');
      hoja.querySelector('p').innerHTML = (r.msg || '') + (r.ok ? '' : '<span class="rt-vuelve">Este reto volverá al final del nivel.</span>');
      hojaBtn.className = 'rt-btn ' + (r.ok ? 'verde' : 'rojo');
      hojaBtn.textContent = r.ok ? 'Continuar' : 'Entendido';
      btn.disabled = true;
      setTimeout(function () { try { hojaBtn.focus({ preventScroll: true }); } catch (e) {} }, 50);
    }

    function siguiente() {
      if (actual && actual.limpiar) actual.limpiar();
      if (!cola.length) return fin();
      var reto = cola.shift();
      comprobar = null; btn.disabled = true; btn.style.display = ''; pie.classList.remove('vacio');
      var repaso = reto.id in primera && primera[reto.id] === false;
      cab.innerHTML = '<span class="rt-tipo">' + (IC[reto.tipo] || '') + esc(NOMBRE[reto.tipo] || reto.tipo) + '</span>' + (repaso ? '<span class="rt-tipo repaso">Repaso</span>' : '') +
        '<h2 class="rt-tit' + (reto.pregunta ? ' larga' : '') + '">' + esc(reto.pregunta || reto.titulo || '') + '</h2>';
      cuerpo.innerHTML = ''; cuerpo.scrollTop = 0;
      cuerpo.classList.remove('rt-anim'); void cuerpo.offsetWidth; cuerpo.classList.add('rt-anim');
      var fn = TIPOS[reto.tipo];
      actual = { reto: reto };
      if (fn) { var x = fn(api(reto)); if (x) actual.limpiar = x; }
    }

    function fin() {
      if (actual && actual.limpiar) actual.limpiar();
      var gano = vidas > 0, seg = Math.round((Date.now() - inicio) / 1000);
      // Estrellas: 3 = todos los retos a la primera, 2 = falló 1 o 2 retos, 1 = superado
      var fallados = Object.keys(primera).filter(function (k) { return primera[k] === false; }).length;
      var est = !gano ? 0 : fallados === 0 ? 3 : fallados <= 2 ? 2 : 1;
      var bono = gano ? est * 5 : 0; xp += bono;
      var prec = Math.max(0, Math.round((total - fallados) / total * 100));
      raiz.querySelector('.rt-col').remove(); raiz.querySelector('.rt-pie').remove();
      var mm = Math.floor(seg / 60) + ':' + ('0' + seg % 60).slice(-2);
      var f = h('<div class="rt-fin"><span class="cint">' + esc(ruta.titulo || 'Nivel') + '</span>' +
        '<div class="rt-estrellas">' + [1, 2, 3].map(function (n, i) { return IC.estrella(n <= est).replace('<svg', '<svg style="animation-delay:' + (.25 + i * .25) + 's"'); }).join('') + '</div>' +
        '<h2>' + (!gano ? 'Sin corazones' : est === 3 ? '¡Perfecto!' : '¡Nivel superado!') + '</h2>' +
        (gano && est < 3 ? '<p class="rt-tip">' + (fallados === 1 ? 'Fallaste 1 reto.' : 'Fallaste ' + fallados + ' retos.') + ' Hazlos todos a la primera para las 3 estrellas.</p>' : '') +
        (!gano ? '<p class="rt-tip">Repasa y vuelve a intentarlo: cada error te deja una explicación.</p>' : '') +
        '<div class="rt-stats"><div class="rt-stat" style="--c:#C6E000"><small>XP ganada</small><b>' + IC.rayo + xp + '</b></div>' +
        '<div class="rt-stat" style="--c:#FF8A00"><small>Mejor racha</small><b>' + IC.fuego + mejorRacha + '</b></div>' +
        '<div class="rt-stat" style="--c:#FF6B8A"><small>Precisión</small><b>' + IC.diana + prec + '%</b></div>' +
        '<div class="rt-stat" style="--c:#FFC800"><small>Tiempo</small><b>' + IC.reloj + mm + '</b></div></div>' +
        '<button class="rt-btn verde">' + (gano ? 'Continuar' : 'Intentar de nuevo') + '</button>' +
        '<button class="otra">' + (gano ? 'Jugar otra vez' : 'Volver al mapa') + '</button></div>');
      raiz.appendChild(f);
      son(gano ? 'victoria' : 'mal');
      if (gano && est === 3) confeti(raiz);
      var res = { gano: gano, estrellas: est, errores: errores, segundos: seg, precision: prec, xp: xp, racha: mejorRacha };
      if (gano) { try { opts.alGanar && opts.alGanar(res); } catch (e) {} }
      f.querySelector('.rt-btn').onclick = function () { cerrar(); if (gano) { opts.alTerminar && opts.alTerminar(res); } else jugar(opts.otraVez ? opts.otraVez() : ruta, opts); };
      f.querySelector('.otra').onclick = function () { cerrar(); if (gano) jugar(opts.otraVez ? opts.otraVez() : ruta, opts); else { opts.alTerminar && opts.alTerminar(res); } };
    }

    siguiente();
    return { cerrar: cerrar };
  }

  // Confeti de colores al sacar 3 estrellas (piezas con CSS, sin canvas)
  function confeti(raiz) {
    var cols = ['#C6E000', '#FFC800', '#A35CFF', '#1CB0F6', '#FF4B6E', '#FF8A00'], s = '';
    for (var k = 0; k < 70; k++) s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + cols[k % cols.length] + ';--t:' + (2.2 + Math.random() * 2).toFixed(2) + 's;--d:' + (Math.random() * .9).toFixed(2) + 's;--x:' + (Math.random() * 120 - 60).toFixed(0) + 'px;--r:' + (Math.random() * 720).toFixed(0) + 'deg"></i>';
    var c = h('<div class="rt-confeti" aria-hidden="true">' + s + '</div>'); raiz.appendChild(c);
    setTimeout(function () { c.remove(); }, 4800);
  }

  /* =========================================================
     Tipos de reto
     ========================================================= */
  var TIPOS = {};

  // Elige la imagen correcta
  TIPOS.imagen = function (a) {
    var r = a.reto, sel = -1, orden = barajar(r.opciones.map(function (o, i) { return i; }));
    var g = h('<div class="rt-img"></div>');
    orden.forEach(function (i) {
      var o = r.opciones[i];
      var b = h('<button class="rt-t"><span class="dib">' + (DIB[o.dibujo] || '') + '</span><span class="txt">' + esc(o.texto) + '</span></button>');
      b.onclick = function () { sel = i; g.querySelectorAll('.rt-t').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); a.acierto(); a.listo(true); };
      b.dataset.i = i; g.appendChild(b);
    });
    a.cuerpo.appendChild(g);
    a.alComprobar(function () {
      var ok = sel === r.correcta;
      g.querySelectorAll('.rt-t').forEach(function (x) { x.style.pointerEvents = 'none'; if (+x.dataset.i === r.correcta) x.classList.add('bien'); else if (+x.dataset.i === sel) x.classList.add('mal'); });
      return { ok: ok, msg: (ok ? '' : '<b>' + esc(r.opciones[r.correcta].texto) + '</b>. ') + esc(r.explica || '') };
    });
  };

  // Toca los pares (dos columnas)
  TIPOS.relacionar = function (a) {
    var r = a.reto, sel = null, faltan = r.pares.length, malos = 0;
    var g = h('<div class="rt-rel"></div>');
    var izq = barajar(r.pares.map(function (p, i) { return i; })), der = barajar(izq);
    a.sinBoton();
    function boton(i, lado) {
      var b = h('<button class="rt-t ' + lado + '">' + esc(r.pares[i][lado === 'izq' ? 0 : 1]) + '</button>');
      b.dataset.i = i; b.dataset.l = lado;
      b.onclick = function () {
        if (b.classList.contains('hecho')) return;
        if (!sel || sel.dataset.l === lado) { if (sel) sel.classList.remove('sel'); sel = b; b.classList.add('sel'); a.acierto(); return; }
        var otro = sel; sel = null; otro.classList.remove('sel');
        if (otro.dataset.i === b.dataset.i) {
          [otro, b].forEach(function (x) { x.classList.add('bien'); setTimeout(function () { x.classList.remove('bien'); x.classList.add('hecho'); }, 500); });
          a.acierto(); faltan--;
          if (!faltan) a.terminar({ ok: true, titulo: malos ? '¡Completado!' : '¡Perfecto!', msg: malos ? 'Tuviste ' + malos + (malos > 1 ? ' fallos.' : ' fallo.') : 'Sin ningún fallo.' });
        } else {
          malos++; a.error();
          [otro, b].forEach(function (x) { x.classList.add('mal'); setTimeout(function () { x.classList.remove('mal'); }, 450); });
        }
      };
      return b;
    }
    for (var k = 0; k < izq.length; k++) { g.appendChild(boton(izq[k], 'izq')); g.appendChild(boton(der[k], 'der')); }
    a.cuerpo.appendChild(g);
  };

  // Cartas parejas (memoria)
  TIPOS.parejas = function (a) {
    var r = a.reto, et = r.etiquetas || ['', ''], abiertas = [], faltan = r.pares.length, intentos = 0, bloqueo = false;
    var cartas = []; r.pares.forEach(function (p, i) { cartas.push({ i: i, t: p[0], e: et[0], c: 'a' }, { i: i, t: p[1], e: et[1], c: 'b' }); });
    var g = h('<div class="rt-mem"></div>');
    var info = h('<div class="rt-mem-info"><span class="rt-chip">' + IC.parejas + '<span class="pa">0/' + faltan + '</span></span><span class="rt-chip">' + IC.reloj + '<span class="in">0 intentos</span></span></div>');
    var mira = h('<div class="rt-mira">' + IC.ojo + '<span>¡Memoriza! <b></b></span></div>');
    var total = faltan;
    a.sinBoton();
    barajar(cartas).forEach(function (c) {
      var d = h('<button class="rt-c ' + c.c + '" aria-label="Carta"><span class="cara dorso">' + IC.dorso + '</span><span class="cara frente">' + (c.e ? '<small>' + esc(c.e) + '</small>' : '') + esc(c.t) + '</span></button>');
      d.onclick = function () {
        if (bloqueo || d.classList.contains('vuelta')) return;
        d.classList.add('vuelta'); a.acierto(); abiertas.push({ d: d, c: c });
        if (abiertas.length < 2) return;
        intentos++; info.querySelector('.in').textContent = intentos + ' intento' + (intentos > 1 ? 's' : '');
        var x = abiertas[0], y = abiertas[1]; abiertas = [];
        if (x.c.i === y.c.i && x.c.c !== y.c.c) {
          setTimeout(function () { x.d.classList.add('par'); y.d.classList.add('par'); }, 350);
          faltan--; info.querySelector('.pa').textContent = (total - faltan) + '/' + total;
          if (!faltan) {
            var extra = intentos - total;
            a.terminar({ ok: true, titulo: extra <= 2 ? '¡Memoria de cóndor!' : '¡Todas las parejas!', msg: 'Lo lograste en <b>' + intentos + ' intentos</b> (lo mínimo es ' + total + ').' });
          }
        } else {
          bloqueo = true;
          if (intentos > total + 3) a.error();
          setTimeout(function () { x.d.classList.add('no'); y.d.classList.add('no'); }, 350);
          setTimeout(function () { [x.d, y.d].forEach(function (z) { z.classList.remove('no', 'vuelta'); }); bloqueo = false; }, 1100);
        }
      };
      g.appendChild(d);
    });
    a.cuerpo.appendChild(mira); a.cuerpo.appendChild(g); a.cuerpo.appendChild(info);
    // Antes de jugar se muestran todas las cartas unos segundos para memorizarlas
    bloqueo = true;
    var todas = g.querySelectorAll('.rt-c'), cuenta = Math.min(6, Math.max(3, Math.round(todas.length / 2.4))), tv = [];
    tv.push(setTimeout(function () { todas.forEach(function (d) { d.classList.add('vuelta'); }); }, 250));
    mira.querySelector('b').textContent = cuenta;
    var iv = setInterval(function () {
      cuenta--; if (cuenta > 0) { mira.querySelector('b').textContent = cuenta; return; }
      clearInterval(iv); todas.forEach(function (d) { d.classList.remove('vuelta'); });
      mira.innerHTML = IC.parejas + '<span>¡Ahora encuentra las parejas!</span>'; mira.classList.add('ya');
      tv.push(setTimeout(function () { bloqueo = false; }, 450));
    }, 1000);
    return function () { clearInterval(iv); tv.forEach(clearTimeout); };
  };

  // Completa la frase (banco de palabras)
  TIPOS.completar = function (a) {
    var r = a.reto, huecos = [];
    var partes = r.frase.split(/\{(\d+)\}/);
    var fr = h('<div class="rt-frase"></div>');
    partes.forEach(function (p, i) {
      if (i % 2 === 0) { fr.appendChild(document.createTextNode(p)); return; }
      var hu = h('<span class="rt-hueco"></span>'); hu.dataset.n = p; huecos.push(hu); fr.appendChild(hu);
    });
    var banco = h('<div class="rt-banco"></div>');
    barajar(r.respuestas.concat(r.distractores || [])).forEach(function (w) {
      var p = h('<button class="rt-p">' + esc(w) + '</button>'); p.dataset.w = w;
      p.onclick = function () {
        if (p.classList.contains('fant')) return;
        var libre = huecos.filter(function (x) { return !x.firstChild; })[0]; if (!libre) return;
        a.acierto(); p.classList.add('fant');
        var c = h('<button class="rt-p">' + esc(w) + '</button>'); c.dataset.w = w;
        c.onclick = function () { if (fr.dataset.fin) return; c.remove(); p.classList.remove('fant'); a.acierto(); revisar(); };
        libre.appendChild(c); revisar();
      };
      banco.appendChild(p);
    });
    function revisar() { a.listo(huecos.every(function (x) { return x.firstChild; })); }
    a.cuerpo.appendChild(fr); a.cuerpo.appendChild(banco);
    a.alComprobar(function () {
      fr.dataset.fin = 1; banco.style.pointerEvents = 'none';
      var ok = true;
      huecos.forEach(function (hu) { var bien = hu.firstChild.dataset.w === r.respuestas[+hu.dataset.n]; hu.firstChild.classList.add(bien ? 'bien' : 'mal'); if (!bien) ok = false; });
      var sol = r.frase.replace(/\{(\d+)\}/g, function (m, n) { return '<b>' + esc(r.respuestas[+n]) + '</b>'; });
      return { ok: ok, msg: ok ? esc(r.explica || '') : sol };
    });
  };

  // Ordenar en el tiempo
  TIPOS.ordenar = function (a) {
    var r = a.reto, n = r.items.length;
    var wrap = h('<div></div>');
    var linea = h('<div class="rt-linea"></div>');
    var ranuras = [];
    for (var i = 0; i < n; i++) { var s = h('<div class="rt-ranura" data-n="' + (i + 1) + '"></div>'); ranuras.push(s); linea.appendChild(s); }
    var banco = h('<div class="rt-ord-banco"></div>');
    function contenido(it, conFecha) { return '<span class="rt-ord"><b>' + esc(it.texto) + '</b><span>' + esc(it.dato || '') + '</span>' + (conFecha ? '<em>' + esc(it.fecha || '') + '</em>' : '') + '</span>'; }
    barajar(r.items.map(function (it, i) { return i; })).forEach(function (i) {
      var it = r.items[i];
      var b = h('<button class="rt-t">' + contenido(it) + '</button>'); b.dataset.i = i;
      b.onclick = function () {
        if (b.classList.contains('fant')) return;
        var libre = ranuras.filter(function (s) { return !s.firstChild; })[0]; if (!libre) return;
        a.acierto(); b.classList.add('fant');
        var c = h('<button class="rt-t">' + contenido(it) + '</button>'); c.dataset.i = i;
        c.onclick = function () { if (wrap.dataset.fin) return; c.remove(); libre.classList.remove('lleno'); b.classList.remove('fant'); a.acierto(); a.listo(false); };
        libre.appendChild(c); libre.classList.add('lleno');
        a.listo(ranuras.every(function (s) { return s.firstChild; }));
      };
      banco.appendChild(b);
    });
    wrap.appendChild(h('<p class="rt-extremo">' + IC.antiguo + 'Más antiguo</p>'));
    wrap.appendChild(linea);
    wrap.appendChild(h('<p class="rt-extremo fin">Más reciente</p>'));
    wrap.appendChild(banco);
    a.cuerpo.appendChild(wrap);
    a.alComprobar(function () {
      wrap.dataset.fin = 1; banco.remove();
      var ok = true;
      ranuras.forEach(function (s, k) {
        var c = s.firstChild, i = +c.dataset.i, bien = i === k;
        c.innerHTML = contenido(r.items[i], true); c.classList.add(bien ? 'bien' : 'mal'); if (!bien) ok = false;
      });
      var sol = r.items.map(function (it) { return '<b>' + esc(it.texto) + '</b> (' + esc(it.fecha) + ')'; }).join(' → ');
      return { ok: ok, msg: ok ? esc(r.explica || '') : sol };
    });
  };

  // Sopa de letras
  TIPOS.sopa = function (a) {
    // palabras: "TEXTO" o { p: "TEXTO", pista: "definición" }. Con pista, el alumno deduce la palabra antes de buscarla.
    var r = a.reto, items = r.palabras.map(function (x) { return typeof x === 'string' ? { w: x.toUpperCase() } : { w: String(x.p).toUpperCase(), pista: x.pista }; });
    var N = r.tam || 12, pal = items.map(function (x) { return x.w; }), conPistas = items.some(function (x) { return x.pista; });
    var COL = ['#C6E000', '#7FD4FF', '#FFB067', '#FF8AC8', '#9AF0B0', '#FFD84D', '#C9A6FF', '#FF9A9A'];
    var M, pos;
    // Arma la cuadrícula (reintenta hasta que todas las palabras entren)
    for (var intento = 0; intento < 200; intento++) {
      M = []; pos = {}; var ok = true;
      for (var y = 0; y < N; y++) { M.push([]); for (var x = 0; x < N; x++) M[y].push(''); }
      var dirs = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0]];
      barajar(pal).sort(function (p, q) { return q.length - p.length; }).forEach(function (w) {
        if (!ok) return;
        for (var t = 0; t < 300; t++) {
          var d = dirs[Math.floor(Math.random() * (w.length > 9 ? 3 : dirs.length))];
          var x0 = Math.floor(Math.random() * N), y0 = Math.floor(Math.random() * N), x1 = x0 + d[0] * (w.length - 1), y1 = y0 + d[1] * (w.length - 1);
          if (x1 < 0 || x1 >= N || y1 < 0 || y1 >= N) continue;
          var cabe = true;
          for (var k = 0; k < w.length; k++) { var c = M[y0 + d[1] * k][x0 + d[0] * k]; if (c && c !== w[k]) { cabe = false; break; } }
          if (!cabe) continue;
          for (k = 0; k < w.length; k++) M[y0 + d[1] * k][x0 + d[0] * k] = w[k];
          pos[w] = { x: x0, y: y0, d: d }; return;
        }
        ok = false;
      });
      if (ok) break;
    }
    var AB = 'ABCDEFGHIJLMNOPQRSTUVAEIOU';
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) if (!M[y][x]) M[y][x] = AB[Math.floor(Math.random() * AB.length)];

    var lista = conPistas
      ? h('<div class="rt-sopa-pal claves">' + items.map(function (x, k) {
          return '<span data-w="' + x.w + '"><i>' + (k + 1) + '</i><span class="def">' + esc(x.pista || '') + '</span><span class="hue">' + x.w.split('').map(function () { return '<u></u>'; }).join('') + '</span></span>';
        }).join('') + '</div>')
      : h('<div class="rt-sopa-pal">' + pal.map(function (w) { return '<span data-w="' + w + '">' + w + '</span>'; }).join('') + '</div>');
    // Con pistas: al encontrarla se escribe la palabra en sus casillas
    function llenar(tag, w, hasta) { tag.querySelectorAll('.hue u').forEach(function (u, k) { if (k < hasta) u.textContent = w[k]; }); }
    var g = h('<div class="rt-sopa" style="--n:' + N + '"></div>');
    var celdas = [];
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { var c = document.createElement('i'); c.textContent = M[y][x]; c.dataset.x = x; c.dataset.y = y; g.appendChild(c); celdas.push(c); }
    var cel = function (x, y) { return celdas[y * N + x]; };
    var ini = null, marcadas = [], encontradas = 0, arrastro = false, fallos = 0, pistas = 2;
    a.sinBoton();
    // Pista: ilumina la primera letra de una palabra que falta (2 por sopa)
    var bPista = h('<button class="rt-pista">' + IC.pista + '<span>Pista</span><b>' + pistas + '</b></button>');
    bPista.onclick = function () {
      if (!pistas) return;
      var falta = pal.filter(function (w) { var t = lista.querySelector('[data-w="' + w + '"]'); return t && !t.classList.contains('ok'); })[0];
      if (!falta) return;
      pistas--; bPista.querySelector('b').textContent = pistas; if (!pistas) bPista.disabled = true;
      var p0 = pos[falta], c0 = cel(p0.x, p0.y); son('tap');
      c0.classList.remove('pista'); void c0.offsetWidth; c0.classList.add('pista');
      var tg = lista.querySelector('[data-w="' + falta + '"]'); tg.classList.add('pista');
      if (conPistas) { llenar(tg, falta, 1); try { lista.scrollTo({ left: tg.offsetLeft - 16, behavior: 'smooth' }); } catch (e) {} }
      setTimeout(function () { tg.classList.remove('pista'); }, 2500);
    };

    function camino(p, q) {
      var dx = q.x - p.x, dy = q.y - p.y, L = Math.max(Math.abs(dx), Math.abs(dy));
      if (L === 0) return [p];
      if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;
      var sx = Math.sign(dx), sy = Math.sign(dy), r2 = [];
      for (var k = 0; k <= L; k++) r2.push({ x: p.x + sx * k, y: p.y + sy * k });
      return r2;
    }
    function pintar(lst) { marcadas.forEach(function (c) { c.classList.remove('marca'); }); marcadas = (lst || []).map(function (p) { return cel(p.x, p.y); }); marcadas.forEach(function (c) { c.classList.add('marca'); }); }
    function punto(e) { var t = document.elementFromPoint(e.clientX, e.clientY); return t && t.parentNode === g ? { x: +t.dataset.x, y: +t.dataset.y } : null; }
    function soltar(fin) {
      var lst = fin && camino(ini, fin);
      var w = lst ? lst.map(function (p) { return M[p.y][p.x]; }).join('') : '';
      var inv = w.split('').reverse().join('');
      var hit = pal.indexOf(w) >= 0 ? w : pal.indexOf(inv) >= 0 ? inv : null;
      var tag = hit && lista.querySelector('[data-w="' + hit + '"]');
      if (tag && !tag.classList.contains('ok')) {
        var col = COL[encontradas % COL.length]; encontradas++;
        lst.forEach(function (p) { var c = cel(p.x, p.y); c.classList.remove('pista'); c.classList.add('ok'); c.style.setProperty('--col', col); });
        tag.classList.add('ok'); tag.style.setProperty('--col', col); a.acierto(); vibrar(30);
        if (conPistas) {
          llenar(tag, hit, hit.length); cuenta.querySelector('b').textContent = encontradas;
          // pasa a la siguiente pista que falta
          var sig = lista.querySelector(':scope > span:not(.ok)'); if (sig) try { lista.scrollTo({ left: sig.offsetLeft - 16, behavior: 'smooth' }); } catch (e) {}
        }
        if (encontradas === pal.length) a.terminar({ ok: true, titulo: '¡Sopa resuelta!', msg: 'Encontraste las ' + pal.length + ' palabras' + (fallos ? ' con ' + fallos + ' intento' + (fallos > 1 ? 's' : '') + ' fallido' + (fallos > 1 ? 's.' : '.') : ' sin fallar.') });
      } else if (lst && lst.length > 2) { fallos++; if (fallos % 3 === 0) a.error(); }
      pintar(null); cel(ini.x, ini.y).classList.remove('ini'); ini = null;
    }
    g.addEventListener('pointerdown', function (e) {
      var p = punto(e); if (!p) return;
      e.preventDefault();
      if (ini && !arrastro) { soltar(p); return; } // segundo toque: fin de la palabra
      ini = p; arrastro = true; pintar([p]); cel(p.x, p.y).classList.add('ini');
    });
    g.addEventListener('pointermove', function (e) { if (!ini || !arrastro) return; var p = punto(e); if (p) pintar(camino(ini, p)); });
    var up = function (e) {
      if (!ini || !arrastro) return; arrastro = false;
      var p = punto(e);
      if (p && (p.x !== ini.x || p.y !== ini.y)) soltar(p); // arrastró
      // si solo tocó una letra, queda marcada como inicio y espera el segundo toque
    };
    window.addEventListener('pointerup', up);
    var cuenta = conPistas ? h('<span class="rt-sopa-cuenta">Desliza las pistas · <b>0</b> de ' + pal.length + '</span>') : null;
    if (cuenta) a.cuerpo.appendChild(cuenta);
    a.cuerpo.appendChild(lista); a.cuerpo.appendChild(g); a.cuerpo.appendChild(h('<div class="rt-sopa-pie"></div>')).appendChild(bPista);
    return function () { window.removeEventListener('pointerup', up); };
  };

  // Verdadero o falso contrarreloj
  TIPOS.vf = function (a) {
    var r = a.reto, seg = r.segundos || 45, quedan = seg, frases = barajar(r.frases), i = 0, bien = 0, timer = null, ocupado = false, malas = [];
    var w = h('<div class="rt-vf"><div class="rt-reloj">' + IC.reloj + '<div class="b"><i></i></div><b>' + seg + '</b></div>' +
      '<div class="rt-pila"></div><div class="rt-vf-marca">' + frases.map(function () { return '<i></i>'; }).join('') + '</div>' +
      '<div class="rt-vf-bot"><button class="f">' + IC.flechaF + 'Falso</button><button class="v">' + IC.flechaV + 'Verdadero</button></div></div>');
    var pila = w.querySelector('.rt-pila');
    a.sinBoton();
    function pintarPila() {
      pila.innerHTML = '';
      for (var k = Math.min(i + 2, frases.length - 1); k >= i; k--) {
        var c = h('<div class="rt-carta' + (k === i + 1 ? ' atras' : k === i + 2 ? ' atras2' : '') + '"><span class="n">' + (k + 1) + ' / ' + frases.length + '</span><span class="sello v">VERDAD</span><span class="sello f">FALSO</span>' + esc(frases[k][0]) + '</div>');
        pila.appendChild(c);
      }
      var top = pila.lastChild; if (top) arrastrable(top);
    }
    function responder(v) {
      if (ocupado || i >= frases.length) return; ocupado = true;
      var top = pila.lastChild, ok = frases[i][1] === v;
      w.querySelectorAll('.rt-vf-marca i')[i].className = ok ? 'b' : 'm';
      if (ok) { bien++; a.acierto(); } else { a.error(); malas.push(frases[i]); w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); }
      top.style.transform = ''; top.classList.add(v ? 'va-v' : 'va-f');
      i++;
      setTimeout(function () { ocupado = false; if (i >= frases.length) terminar(); else pintarPila(); }, 300);
    }
    function arrastrable(c) {
      var x0 = null;
      c.addEventListener('pointerdown', function (e) { x0 = e.clientX; c.setPointerCapture(e.pointerId); c.style.transition = 'none'; });
      c.addEventListener('pointermove', function (e) {
        if (x0 == null) return; var dx = e.clientX - x0;
        c.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 18 + 'deg)';
        c.querySelector('.sello.v').style.opacity = Math.max(0, dx / 90); c.querySelector('.sello.f').style.opacity = Math.max(0, -dx / 90);
      });
      c.addEventListener('pointerup', function (e) {
        if (x0 == null) return; var dx = e.clientX - x0; x0 = null; c.style.transition = '';
        if (Math.abs(dx) > 80) responder(dx > 0); else { c.style.transform = ''; c.querySelectorAll('.sello').forEach(function (s) { s.style.opacity = 0; }); }
      });
    }
    function terminar() {
      clearInterval(timer); timer = null;
      var ok = bien >= Math.ceil(frases.length * .6);
      for (var k = i; k < frases.length; k++) malas.push(frases[k]);   // las que no alcanzó a responder
      var lista = malas.slice(0, 5).map(function (f) { return '<span class="rt-vf-sol ' + (f[1] ? 'v' : 'f') + '"><em>' + (f[1] ? 'V' : 'F') + '</em>' + esc(f[0]) + '</span>'; }).join('');
      a.terminar({ ok: ok, titulo: ok ? bien + ' de ' + frases.length + ' correctas' : 'Solo ' + bien + ' de ' + frases.length + ' (necesitas ' + Math.ceil(frases.length * .6) + ')',
        msg: (malas.length ? 'Repasa: ' + lista : '') || (quedan > 0 ? '¡Todas bien! Te sobraron ' + quedan + ' segundos.' : '¡Justo a tiempo!') });
    }
    w.querySelector('.v').onclick = function () { responder(true); };
    w.querySelector('.f').onclick = function () { responder(false); };
    var tecla = function (e) { if (e.key === 'ArrowRight') responder(true); if (e.key === 'ArrowLeft') responder(false); };
    window.addEventListener('keydown', tecla);
    a.cuerpo.appendChild(w); pintarPila();
    var barra = w.querySelector('.b i'), num = w.querySelector('.rt-reloj b');
    timer = setInterval(function () {
      quedan--; num.textContent = quedan; barra.style.width = (quedan / seg * 100) + '%'; if (quedan <= 10) barra.classList.add('poco');
      if (quedan <= 0) { for (; i < frases.length; i++) w.querySelectorAll('.rt-vf-marca i')[i].className = 'm'; terminar(); }
    }, 1000);
    return function () { clearInterval(timer); window.removeEventListener('keydown', tecla); };
  };

  window.MCRetos = { jugar: jugar, tipos: TIPOS, dibujos: DIB, iconos: IC, nombres: NOMBRE };
})();

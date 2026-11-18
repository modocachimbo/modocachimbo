/* =========================================================
   Modo Cachimbo · Arcade · Retos (minijuegos dentro de un nivel)
   Motor independiente del mapa de niveles: se le pasa una "ruta" (lista de
   retos de un JSON como assets/arcade-retos/hp-01-poblamiento.json) y la
   juega en pantalla completa sobre el cielo del Arcade.

   Tipos de reto (inspirados en Duolingo y juegos de celular):
     imagen     · elige la imagen correcta (4 escenas dibujadas con código, tarjetas A–D)
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
       alCerrar: function () {},
       alReto: function (id) {},   // cada reto superado (para la estrella de cada minijuego)
       solo: true,                 // un solo minijuego: pantalla final con 1 estrella
       multXp: 2,                  // XP doble (jugar todo mezclado)
       finExtra: function (res) { return { estrellas, minis: [{ tipo, c, ok, nuevo }], abre, abreSub }; },
       alMapa: function () {}      // botón Mapa de la pantalla final
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
    corRoto: '<svg viewBox="0 0 32 32"><path d="M16 28C8 22 3 17.5 3 11.5 3 7.4 6.2 4.5 9.8 4.5c2.6 0 4.6 1.4 6.2 3.6 1.6-2.2 3.6-3.6 6.2-3.6 3.6 0 6.8 2.9 6.8 7 0 6-5 10.5-13 16.5z" fill="#FF4B6E" stroke="#7A0A22" stroke-width="2.2"/><path d="M16 8l-2 6 4 3-3 7" stroke="#2A0610" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>',
    xp: '<svg viewBox="0 0 40 40"><path d="M20 2l16 9v18l-16 9-16-9V11z" fill="#FFC800" stroke="#7A4A00" stroke-width="3" stroke-linejoin="round"/><text x="20" y="25.5" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="14" fill="#5A2E00">XP</text></svg>',
    // Estrella 3D (la misma del Arcade), con su degradado propio para funcionar en cualquier página
    estrella3d: function (on, cls) { var P = 'M32.0,8.0 L39.6,24.5 L57.7,26.7 L44.4,39.0 L47.9,56.8 L32.0,48.0 L16.1,56.8 L19.6,39.0 L6.3,26.7 L24.4,24.5Z'; return '<svg viewBox="0 0 64 64" class="' + (cls || '') + (on ? '' : ' off') + '"><defs><linearGradient id="rtEstG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7B8"/><stop offset=".45" stop-color="#FFD21F"/><stop offset="1" stop-color="#F08A00"/></linearGradient></defs><path d="' + P + '" fill="#7A3A00" stroke="#7A3A00" stroke-width="7" stroke-linejoin="round" transform="translate(0 2)"/><path d="' + P + '" fill="url(#rtEstG)" stroke="#9A4A00" stroke-width="4" stroke-linejoin="round"/><path d="M32 35 32 8 39.6 24.5ZM32 35 57.7 26.7 44.4 39ZM32 35 47.9 56.8 32 48ZM32 35 16.1 56.8 19.6 39ZM32 35 6.3 26.7 24.4 24.5Z" fill="#D06A00" opacity=".38"/><ellipse cx="24" cy="25" rx="5" ry="3" fill="#fff" opacity=".85" transform="rotate(-35 24 25)"/></svg>'; },
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

  /* ---------- Dibujos del tema: escenas completas (viewBox 120×100) ---------- */
  var DIB = (function () {
    var O = '#1A1046';   // contorno
    // Personaje cazador con piel y lanza (x, y = pies), s = escala, c = color de la piel
    function cazador(x, y, s, c, mira) {
      var f = mira < 0 ? ' scale(-1 1)' : '';
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')' + f + '">' +
        '<path d="M-1 -30 L9 -2" stroke="#7A4A20" stroke-width="2.2" stroke-linecap="round"/><path d="M8 -34 l3 6 -5 -1z" fill="#C9C2B0" stroke="' + O + '" stroke-width="1.2"/>' +
        '<path d="M-6 0 l1-8 M2 0 l-1-8" stroke="#6B3A1A" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M-9 -8 q0-12 7-14 q8 2 8 14 q-7 3-15 0z" fill="' + c + '" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-8 -9 l2 2 2-2 2 2 2-2 2 2 2-2" stroke="#fff" stroke-width="1" fill="none" opacity=".6"/>' +
        '<circle cx="-1" cy="-26" r="5.2" fill="#C98A5A" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-6.5 -27 q1-7 6-7 q6 0 6 6 q-3-3-6-2 q-4 0-6 3z" fill="#2A1A10"/>' +
        '<circle cx="1.6" cy="-26" r=".9" fill="' + O + '"/><path d="M0 -23.5 q1.5 1 3 0" stroke="' + O + '" stroke-width=".8" fill="none"/>' +
        '<path d="M4 -16 L8 -22" stroke="#C98A5A" stroke-width="2.4" stroke-linecap="round"/>' +
        '</g>';
    }
    var nube = function (x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff" opacity=".9"><circle cx="0" cy="0" r="5"/><circle cx="6" cy="-2" r="6.5"/><circle cx="13" cy="0" r="5"/><rect x="0" y="0" width="13" height="5" rx="2.5"/></g>'; };
    return {
      // Estrecho de Bering: puente de hielo entre Asia y América, cazadores cruzando
      bering:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD3FF"/><stop offset="1" stop-color="#CFF0FF"/></linearGradient>' +
        '<linearGradient id="mrB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E8FE0"/><stop offset="1" stop-color="#1A5FB0"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgB)"/>' + nube(14, 16, 1) + nube(84, 12, .8) +
        '<path d="M0 50 h120 v50 H0z" fill="url(#mrB)"/>' +
        '<path d="M0 44 q14-8 26-2 q8 4 10 14 L36 100 H0z" fill="#E9F6FF"/><path d="M0 52 q12-4 22 0 l4 48 H0z" fill="#B9DDF2"/>' +
        '<path d="M120 44 q-14-8-26-2 q-8 4-10 14 L84 100 h36z" fill="#E9F6FF"/><path d="M120 52 q-12-4-22 0 l-4 48 h26z" fill="#B9DDF2"/>' +
        '<path d="M30 62 q30-10 60 0 l2 8 q-32-8-64 0z" fill="#F4FBFF" stroke="#9CCBE8" stroke-width="1.2"/>' +
        '<path d="M40 64 h4 M54 61 h5 M70 61 h4" stroke="#9CCBE8" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M12 40 l6-12 6 12z M98 40 l7-14 7 14z" fill="#3E8E4A"/><path d="M15 34 l3-6 3 6z M102 32 l3-6 3 6z" fill="#fff"/>' +
        cazador(52, 64, .82, '#A0703A', 1) + cazador(66, 63, .78, '#8A5A2A', 1) +
        '<path d="M78 58 q4-4 8 0" stroke="#FFC800" stroke-width="2.4" fill="none" stroke-dasharray="2 3" stroke-linecap="round"/><path d="M86 56 l3 3 -4 1z" fill="#FFC800"/>' +
        '<text x="14" y="94" font-family="Lilita One, sans-serif" font-size="9" fill="#1A5FB0">ASIA</text><text x="114" y="94" text-anchor="end" font-family="Lilita One, sans-serif" font-size="9" fill="#1A5FB0">AMÉRICA</text></svg>',
      // Océano Pacífico en balsas
      balsa:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB86B"/><stop offset=".55" stop-color="#FFE3A8"/></linearGradient>' +
        '<linearGradient id="mrP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E88D8"/><stop offset="1" stop-color="#0F4E9A"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgP)"/><circle cx="92" cy="30" r="14" fill="#FFD84A"/><circle cx="92" cy="30" r="20" fill="#FFD84A" opacity=".25"/>' + nube(16, 18, .9) +
        '<path d="M0 56 h120 v44 H0z" fill="url(#mrP)"/>' +
        '<path d="M6 54 q8-10 16 0z" fill="#3E8E4A"/><path d="M14 50 q0-8 2-12" stroke="#7A4A1A" stroke-width="2" fill="none"/><path d="M16 38 q6-4 10 0 q-5-1-10 0 M16 38 q-6-4-10 0 q5-1 10 0 M16 38 q2-6 7-6 q-4 2-7 6" fill="#2C8A3A" stroke="#2C6A30" stroke-width="1"/>' +
        '<path d="M30 74 h56 l-4 7 h-48z" fill="#B87A3A" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M38 74 v7 M46 74 v7 M54 74 v7 M62 74 v7 M70 74 v7 M78 74 v7" stroke="#7A4A1A" stroke-width="1.2"/>' +
        '<path d="M58 74 V36" stroke="#6B3A1A" stroke-width="2.6"/><path d="M60 38 q22 14 2 34 z" fill="#FFF4E0" stroke="' + O + '" stroke-width="1.6"/><path d="M62 46 q8 8 1 18" stroke="#E0C8A0" stroke-width="1.4" fill="none"/>' +
        cazador(44, 74, .7, '#C98A3A', 1) + cazador(74, 74, .66, '#A0703A', -1) +
        '<path d="M0 84 q10-5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V100 H0z" fill="#2A9BEA" opacity=".9"/>' +
        '<path d="M8 90 q6-3 12 0 M40 92 q6-3 12 0 M78 90 q6-3 12 0" stroke="#BFE6FF" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
      // Por la Antártida
      antartida:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4AB0"/><stop offset="1" stop-color="#9AB8FF"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgA)"/>' +
        '<path d="M0 30 q20-10 40 0 t40 0 t40 0" stroke="#7CFFC8" stroke-width="4" fill="none" opacity=".45"/><path d="M0 22 q20-8 40 0 t40 0 t40 0" stroke="#C6E0FF" stroke-width="3" fill="none" opacity=".35"/>' +
        '<circle cx="20" cy="12" r="1" fill="#fff"/><circle cx="60" cy="8" r="1.2" fill="#fff"/><circle cx="100" cy="16" r="1" fill="#fff"/>' +
        '<path d="M8 70 l18-34 12 16 10-24 22 42z" fill="#F4FBFF"/><path d="M26 36 l4 22 8-6z M48 28 l2 30 20 12z" fill="#C9E4F7"/>' +
        '<path d="M60 70 l22-28 18 28z" fill="#E4F2FF"/><path d="M82 42 l2 28 16 0z" fill="#B8D8F0"/>' +
        '<path d="M0 70 h120 v30 H0z" fill="#1F6FC8"/><path d="M0 70 h120 v6 H0z" fill="#DDF0FF"/>' +
        '<g transform="translate(96 70)"><ellipse cx="0" cy="-8" rx="5" ry="8" fill="#22264A"/><ellipse cx="0" cy="-6.5" rx="3.2" ry="6" fill="#fff"/><circle cx="0" cy="-15" r="3.6" fill="#22264A"/><circle cx="1.2" cy="-15.5" r=".9" fill="#fff"/><path d="M3 -14.5 l3 1 -3 1z" fill="#FFA000"/><path d="M-3 0 h2 M1 0 h2" stroke="#FFA000" stroke-width="1.6" stroke-linecap="round"/></g>' +
        cazador(30, 74, .66, '#7A5A9A', 1) + cazador(42, 74, .62, '#5A6AA0', 1) +
        '<path d="M50 62 q14-14 30-8" stroke="#FFC800" stroke-width="2.4" fill="none" stroke-dasharray="2 3" stroke-linecap="round"/><path d="M80 54 l1 4 -4 -1z" fill="#FFC800"/></svg>',
      // Surgieron en América (fósil en capas de tierra)
      fosil:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FE07A"/><stop offset="1" stop-color="#E9FFD0"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgF)"/>' + nube(80, 14, .9) +
        '<path d="M0 34 q30-8 60 0 t60 0 v66 H0z" fill="#6BBE45"/><path d="M0 40 q30-8 60 0 t60 0 v60 H0z" fill="#C98A4A"/>' +
        '<path d="M0 58 q30-6 60 0 t60 0 v42 H0z" fill="#A86A32"/><path d="M0 78 q30-6 60 0 t60 0 v22 H0z" fill="#86501F"/>' +
        '<circle cx="18" cy="50" r="2" fill="#86501F"/><circle cx="100" cy="70" r="2.4" fill="#6A3A12"/><circle cx="90" cy="48" r="1.6" fill="#86501F"/>' +
        '<g transform="translate(46 66) rotate(-8)"><path d="M0 0 q0-14 14-14 q14 0 14 14 v4 q-4 2-6 0 v3 h-16 v-3 q-2 2-6 0z" fill="#F4ECD8" stroke="' + O + '" stroke-width="1.6"/>' +
        '<ellipse cx="8" cy="-1" rx="3.4" ry="3.8" fill="' + O + '"/><ellipse cx="20" cy="-1" rx="3.4" ry="3.8" fill="' + O + '"/><path d="M13 3 l1 3 1-3z" fill="' + O + '"/><path d="M8 7 v3 M12 7 v3 M16 7 v3 M20 7 v3" stroke="' + O + '" stroke-width="1"/></g>' +
        '<path d="M14 88 l20-4 M18 84 l-3 2 M30 82 l3 1" stroke="#F4ECD8" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M84 90 l18 2" stroke="#F4ECD8" stroke-width="3.2" stroke-linecap="round"/>' +
        '<g transform="translate(92 36)"><path d="M0 0 v-10" stroke="#2C6A30" stroke-width="2"/><path d="M0 -6 q-7-2-8-9 q7 0 8 9 M0 -9 q6-3 9-9 q-7-1-9 9" fill="#3FA02A"/></g>' +
        '<g transform="translate(24 30) rotate(-20)"><circle cx="0" cy="0" r="7" fill="#BFE8FF" opacity=".6" stroke="' + O + '" stroke-width="2"/><path d="M5 5 l8 8" stroke="' + O + '" stroke-width="3.4" stroke-linecap="round"/></g></svg>'
    };
  })();
  (function () {
    var O = '#1A1046';
    var nube = function (x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="#fff" opacity=".9"><circle cx="0" cy="0" r="5"/><circle cx="6" cy="-2" r="6.5"/><circle cx="13" cy="0" r="5"/><rect x="0" y="0" width="13" height="5" rx="2.5"/></g>'; };
    function cazador(x, y, s, c, mira) {
      var f = mira < 0 ? ' scale(-1 1)' : '';
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')' + f + '">' +
        '<path d="M-1 -30 L9 -2" stroke="#7A4A20" stroke-width="2.2" stroke-linecap="round"/><path d="M8 -34 l3 6 -5 -1z" fill="#C9C2B0" stroke="' + O + '" stroke-width="1.2"/>' +
        '<path d="M-6 0 l1-8 M2 0 l-1-8" stroke="#6B3A1A" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M-9 -8 q0-12 7-14 q8 2 8 14 q-7 3-15 0z" fill="' + c + '" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-8 -9 l2 2 2-2 2 2 2-2 2 2 2-2" stroke="#fff" stroke-width="1" fill="none" opacity=".6"/>' +
        '<circle cx="-1" cy="-26" r="5.2" fill="#C98A5A" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-6.5 -27 q1-7 6-7 q6 0 6 6 q-3-3-6-2 q-4 0-6 3z" fill="#2A1A10"/>' +
        '<circle cx="1.6" cy="-26" r=".9" fill="' + O + '"/><path d="M0 -23.5 q1.5 1 3 0" stroke="' + O + '" stroke-width=".8" fill="none"/>' +
        '<path d="M4 -16 L8 -22" stroke="#C98A5A" stroke-width="2.4" stroke-linecap="round"/>' +
        '</g>';
    }
    // Persona sin lanza (pastor, agricultor, pescador)
    function persona(x, y, s, c, mira, mano) {
      var f = mira < 0 ? ' scale(-1 1)' : '';
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')' + f + '">' + (mano || '') +
        '<path d="M-6 0 l1-8 M2 0 l-1-8" stroke="#6B3A1A" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M-9 -8 q0-12 7-14 q8 2 8 14 q-7 3-15 0z" fill="' + c + '" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-8 -9 l2 2 2-2 2 2 2-2 2 2 2-2" stroke="#fff" stroke-width="1" fill="none" opacity=".6"/>' +
        '<circle cx="-1" cy="-26" r="5.2" fill="#C98A5A" stroke="' + O + '" stroke-width="1.4"/>' +
        '<path d="M-6.5 -27 q1-7 6-7 q6 0 6 6 q-3-3-6-2 q-4 0-6 3z" fill="#2A1A10"/>' +
        '<circle cx="1.6" cy="-26" r=".9" fill="' + O + '"/><path d="M0 -23.5 q1.5 1 3 0" stroke="' + O + '" stroke-width=".8" fill="none"/>' +
        '<path d="M4 -16 L9 -12" stroke="#C98A5A" stroke-width="2.4" stroke-linecap="round"/>' +
        '</g>';
    }
    // Llama / alpaca (x, y = patas)
    function llama(x, y, s, c, mira) {
      var f = mira < 0 ? ' scale(-1 1)' : '', sh = '#00000022';
      return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')' + f + '">' +
        '<ellipse cx="0" cy="1" rx="12" ry="2" fill="' + sh + '"/>' +
        '<path d="M-8 -10 v10 M-4 -9 v9 M4 -9 v9 M8 -10 v10" stroke="' + O + '" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M-8 -10 v10 M-4 -9 v9 M4 -9 v9 M8 -10 v10" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round"/>' +
        '<path d="M-12 -14 q0-8 10-8 h8 q6 0 6 6 v1 q0 7-8 7 h-8 q-8 0-8-6z" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/>' +
        '<path d="M-13 -17 q-3 1-3 5" stroke="' + O + '" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M7 -18 q0-10 1-18 h6 q1 8 -1 20z" fill="' + c + '" stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M8 -39 l-1 -6 3 3z M12 -39 l1 -6 2 4z" fill="' + c + '" stroke="' + O + '" stroke-width="1.2" stroke-linejoin="round"/>' +
        '<path d="M7 -38 q2-3 7-2 q6 1 6 4 q0 3-5 3 h-6 q-2 0-2-2z" fill="' + c + '" stroke="' + O + '" stroke-width="1.5"/>' +
        '<circle cx="12.5" cy="-37" r="1" fill="' + O + '"/><path d="M18 -35 h1.5" stroke="' + O + '" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M-6 -19 q4-2 8 0 M-4 -15 q4-2 8 0" stroke="#fff" stroke-width="1" fill="none" opacity=".5"/>' +
        '<path d="M8 -32 h5" stroke="#E2463A" stroke-width="2"/></g>';
    }
    var D = {
      // Instrumentos de piedra: puntas de proyectil sobre una roca
      punta:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgPu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD49A"/><stop offset="1" stop-color="#FFF1D6"/></linearGradient>' +
        '<linearGradient id="pdPu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D9D4CB"/><stop offset="1" stop-color="#8E877C"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgPu)"/>' + nube(86, 14, .8) +
        '<path d="M0 46 l18-16 14 10 20-20 22 22 16-12 30 18 v52 H0z" fill="#C9A06A"/><path d="M52 20 l8 26 14-4z M90 30 l4 18 16-2z" fill="#B08452"/>' +
        '<path d="M0 62 q60-10 120 0 v38 H0z" fill="#9C6A36"/>' +
        '<path d="M10 92 q4-22 30-26 q34-4 46 8 q10 10 2 18z" fill="#7E7466" stroke="' + O + '" stroke-width="1.6"/><path d="M18 88 q8-14 26-16" stroke="#A39A8C" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<g transform="translate(52 50) rotate(-58)"><path d="M0 -32 q12 14 12 30 q0 10 -5 14 l-3 2 v8 q0 3 -4 3 t-4 -3 v-8 l-3 -2 q-5 -4 -5 -14 q0 -16 12 -30z" fill="url(#pdPu)" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M0 -32 v44 M-6 -18 l6 5 6 -5 M-9 -6 l9 7 9 -7 M-9 5 l9 6 9 -6" stroke="#6E675E" stroke-width="1.3" fill="none" stroke-linejoin="round"/>' +
        '<path d="M-4 -24 q-4 8 -5 16" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".75"/></g>' +
        '<g transform="translate(84 72) rotate(24)"><path d="M0 -16 q7 8 7 17 q0 5 -3 7 v4 q0 2 -4 2 t-4 -2 v-4 q-3 -2 -3 -7 q0 -9 7 -17z" fill="#B4AA9C" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M0 -16 v24 M-4 -6 l4 3 4 -3 M-5 1 l5 4 5 -4" stroke="#7A7268" stroke-width="1.1" fill="none"/></g>' +
        '<path d="M24 74 l8 -6 8 2 2 7 -9 4z" fill="#A99F90" stroke="' + O + '" stroke-width="1.4" stroke-linejoin="round"/><path d="M28 72 l4 3 6 -2" stroke="#7A7268" stroke-width="1" fill="none"/>' +
        '<path d="M98 50 l4 -8 M104 54 l6 -4 M96 42 l-2 -6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>',
      // Pinturas rupestres: pared de cueva con escena de caza (chaco)
      pintura:
        '<svg viewBox="0 0 120 100"><defs><radialGradient id="bgPi" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#F1C98E"/><stop offset=".7" stop-color="#D49A5A"/><stop offset="1" stop-color="#8A5428"/></radialGradient></defs>' +
        '<rect width="120" height="100" fill="#3A2210"/>' +
        '<path d="M6 100 V40 q4-30 54-34 q50 4 54 34 V100z" fill="url(#bgPi)"/>' +
        '<path d="M20 30 q6-4 12 0 M84 22 q8-2 12 4 M14 70 q4 4 10 2 M96 76 q6-2 10 2" stroke="#B57A40" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<g fill="#B3261E" stroke="#B3261E" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="30" cy="38" r="3.4" stroke="none"/><path d="M30 41 v12 M30 53 l-4 9 M30 53 l5 9 M30 45 l-6 4 M30 45 l9 -5" fill="none" stroke-width="2.6"/><path d="M38 40 l16 -8" stroke-width="1.8"/>' +
        '<circle cx="22" cy="58" r="2.8" stroke="none"/><path d="M22 61 v10 M22 71 l-3 7 M22 71 l4 7 M22 64 l7 -3" fill="none" stroke-width="2.2"/><path d="M28 60 l12 -6" stroke-width="1.5"/>' +
        '<ellipse cx="68" cy="40" rx="9" ry="4.5" stroke="none"/><path d="M75 38 l4 -9 3 1 M61 43 l-2 8 M65 43 v8 M71 43 l1 8 M75 42 l2 8" fill="none" stroke-width="2.2"/>' +
        '<ellipse cx="88" cy="56" rx="8" ry="4" stroke="none"/><path d="M94 54 l3 -8 3 1 M82 58 l-2 7 M86 59 v7 M91 59 l1 7 M94 58 l2 6" fill="none" stroke-width="2"/>' +
        '<ellipse cx="64" cy="66" rx="7" ry="3.5" stroke="none"/><path d="M69 64 l3 -7 3 1 M59 68 l-2 6 M63 69 v6 M67 69 l1 6" fill="none" stroke-width="1.8"/>' +
        '</g>' +
        '<g fill="#3A1A0A" opacity=".75"><path d="M100 30 h1.6 v9 h-1.6z M103 30 h1.6 v9 h-1.6z"/><path d="M40 78 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0" fill="none" stroke="#3A1A0A" stroke-width="1.6"/></g>' +
        '<g transform="translate(108 88)"><path d="M-2 0 l-3 -18 h6z" fill="#6B3A1A" stroke="' + O + '" stroke-width="1.2"/><path d="M-2 -18 q-7 -8 0 -16 q7 8 0 16z" fill="#FFB020"/><path d="M-2 -20 q-3 -4 0 -9 q3 5 0 9z" fill="#FFF0A0"/></g>' +
        '<path d="M6 40 q4-30 54-34 q50 4 54 34 V100 h6 V0 H0 v100 h6z" fill="#2A160A"/></svg>',
      // Plantas cultivadas: frijol trepador, pallar y ají en una huerta
      frijol:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgFr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ED8FF"/><stop offset="1" stop-color="#DDF6FF"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgFr)"/><circle cx="20" cy="20" r="9" fill="#FFE04A"/>' + nube(70, 14, .9) +
        '<path d="M0 54 q30-12 60 -2 t60 -4 v52 H0z" fill="#7CC655"/><path d="M0 70 q60-10 120 0 v30 H0z" fill="#8A5A2A"/>' +
        '<path d="M0 78 q20-4 40 0 M50 84 q22-4 44 0 M10 92 q20-3 40 0 M70 94 q20-3 40 0" stroke="#6E4418" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<path d="M46 80 V22" stroke="#7A4A1A" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M46 78 q-12-10 0-20 q12-10 0-20 q-8-8 0-16" stroke="#2C7A20" stroke-width="2.2" fill="none"/>' +
        '<g fill="#5DB83A" stroke="#2C6A20" stroke-width="1.2"><path d="M46 66 q-14-2-14 8 q12 2 14-8z"/><path d="M46 52 q14-4 16 6 q-12 3-16-6z"/><path d="M46 36 q-12-6-16 2 q10 6 16-2z"/><path d="M46 26 q10-8 14-2 q-8 6-14 2z"/></g>' +
        '<g fill="#3E8E2A" stroke="' + O + '" stroke-width="1.2"><path d="M50 58 q4 6 2 16 q-4-4-4-16z"/><path d="M40 44 q-4 6-2 15 q4-4 3-15z"/></g>' +
        '<g transform="translate(78 74)"><path d="M0 0 q-2-12 6-20" stroke="#2C7A20" stroke-width="2" fill="none"/><path d="M5 -16 q8-4 12 2 q-8 4-12-2z M2 -8 q-8-4-12 2 q8 4 12-2z" fill="#5DB83A" stroke="#2C6A20" stroke-width="1"/>' +
        '<path d="M6 -14 q6 2 6 10 q-2 8 -4 10 q-4 -6 -2 -20z" fill="#E2261E" stroke="' + O + '" stroke-width="1.4"/><path d="M8 -10 q2 4 1 8" stroke="#fff" stroke-width="1.2" fill="none" opacity=".7"/>' +
        '<path d="M-2 -12 q-6 2 -6 9 q2 6 4 8 q3 -6 2 -17z" fill="#FF5A2A" stroke="' + O + '" stroke-width="1.4"/></g>' +
        '<g transform="translate(22 86)"><ellipse cx="0" cy="0" rx="10" ry="4" fill="#5A3A1A" opacity=".35"/><path d="M-10 -2 q0-8 10-8 t10 8 q-10 4 -20 0z" fill="#C88A3A" stroke="' + O + '" stroke-width="1.4"/>' +
        '<ellipse cx="-4" cy="-5" rx="3" ry="2" fill="#7A2E1A" stroke="' + O + '" stroke-width=".8"/><ellipse cx="2" cy="-6" rx="3" ry="2" fill="#F4E3C4" stroke="' + O + '" stroke-width=".8"/><ellipse cx="6" cy="-3" rx="2.6" ry="1.8" fill="#7A2E1A" stroke="' + O + '" stroke-width=".8"/></g>' +
        '<g transform="translate(102 82)"><circle r="3.5" fill="#C9C9C9" opacity="0"/></g>' +
        '</svg>',
      // Restos humanos: excavación arqueológica con cráneo y huesos
      craneo:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgCr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9E4FF"/><stop offset="1" stop-color="#E8F7FF"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgCr)"/>' + nube(12, 14, .8) +
        '<path d="M0 36 l26-18 18 12 22-20 24 22 30-10 v100 H0z" fill="#8A9AA8"/><path d="M66 10 l6 22 16-2z" fill="#6E7E8C"/>' +
        '<path d="M0 42 h120 v58 H0z" fill="#B57A40"/>' +
        '<path d="M12 50 h96 l-6 46 h-84z" fill="#7A4A1E" stroke="#5A3412" stroke-width="1.6"/>' +
        '<path d="M14 66 h92 M16 82 h88" stroke="#6A3E16" stroke-width="1.4" stroke-dasharray="3 3"/>' +
        '<path d="M12 50 l-3 -4 M108 50 l3 -4 M12 50 h96" stroke="#FFF4E0" stroke-width="1.2"/><path d="M40 50 v46 M70 50 v46" stroke="#FFF4E0" stroke-width=".9" opacity=".7"/>' +
        '<path d="M8 46 h104" stroke="#FFC800" stroke-width="1.4"/>' +
        '<g transform="translate(50 74)"><path d="M0 0 q0-15 15-15 q15 0 15 15 v5 q-4 2-6 0 v4 h-18 v-4 q-2 2-6 0z" fill="#F4ECD8" stroke="' + O + '" stroke-width="1.6"/>' +
        '<ellipse cx="8.5" cy="0" rx="3.6" ry="4" fill="' + O + '"/><ellipse cx="21.5" cy="0" rx="3.6" ry="4" fill="' + O + '"/><path d="M14 4 l1 3.4 1-3.4z" fill="' + O + '"/>' +
        '<path d="M9 9 v3 M13 9 v3 M17 9 v3 M21 9 v3" stroke="' + O + '" stroke-width="1"/><path d="M5 -8 q4-5 10-5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>' +
        '<g stroke="' + O + '" stroke-width="1.3" fill="#F4ECD8"><path d="M22 88 l18 -4 M84 70 l14 6 M86 88 l16 -2" stroke="#F4ECD8" stroke-width="3.4" stroke-linecap="round"/>' +
        '<circle cx="22" cy="88" r="2.4"/><circle cx="40" cy="84" r="2.4"/><circle cx="84" cy="70" r="2.4"/><circle cx="98" cy="76" r="2.4"/></g>' +
        '<g transform="translate(28 66) rotate(-30)"><rect x="-1.5" y="-12" width="3" height="14" rx="1.5" fill="#B87A3A" stroke="' + O + '" stroke-width="1"/><path d="M-4 2 h8 l-1 7 h-6z" fill="#E8C060" stroke="' + O + '" stroke-width="1"/><path d="M-3 9 v3 M0 9 v3 M3 9 v3" stroke="#6B3A1A" stroke-width="1"/></g>' +
        persona(104, 46, .62, '#3E8BEA', -1) + '</svg>',
      // Corral de camélidos: llamas en la puna con un pastor
      llama:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgLl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FC8FF"/><stop offset="1" stop-color="#D6F1FF"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgLl)"/>' + nube(70, 12, .8) +
        '<path d="M0 50 l20-26 14 14 22-28 26 30 14-14 24 24 v50 H0z" fill="#7B8CC8"/><path d="M42 26 l14-16 9 11 -7 4 -5 -5z M20 24 l6 8 -6 -2 -6 2z M96 26 l7 7 -7 -1z" fill="#fff"/>' +
        '<path d="M0 58 q30-10 60-2 t60-4 v48 H0z" fill="#B7C95A"/><path d="M0 74 q60-8 120 0 v26 H0z" fill="#9AB040"/>' +
        '<g fill="#A89C8C" stroke="' + O + '" stroke-width="1"><ellipse cx="14" cy="84" rx="5" ry="3.4"/><ellipse cx="23" cy="83" rx="5" ry="3.4"/><ellipse cx="32" cy="84" rx="5" ry="3.4"/><ellipse cx="41" cy="83" rx="5" ry="3.4"/><ellipse cx="50" cy="84" rx="5" ry="3.4"/><ellipse cx="59" cy="83" rx="5" ry="3.4"/><ellipse cx="68" cy="84" rx="5" ry="3.4"/><ellipse cx="77" cy="83" rx="5" ry="3.4"/><ellipse cx="86" cy="84" rx="5" ry="3.4"/><ellipse cx="95" cy="83" rx="5" ry="3.4"/><ellipse cx="104" cy="84" rx="5" ry="3.4"/>' +
        '<ellipse cx="18" cy="79" rx="5" ry="3.2"/><ellipse cx="28" cy="78" rx="5" ry="3.2"/><ellipse cx="38" cy="79" rx="5" ry="3.2"/><ellipse cx="80" cy="78" rx="5" ry="3.2"/><ellipse cx="90" cy="79" rx="5" ry="3.2"/><ellipse cx="100" cy="78" rx="5" ry="3.2"/></g>' +
        llama(34, 74, .95, '#FFF3E0', 1) + llama(72, 72, .85, '#C98A4A', -1) + llama(14, 64, .55, '#F4ECD8', 1) +
        persona(102, 70, .62, '#E2463A', -1, '<path d="M-6 -16 L-10 2" stroke="#7A4A20" stroke-width="2" stroke-linecap="round"/>') + '</svg>',
      // Aldea de chozas: Chilca, chozas cónicas de caña y junco junto al mar
      choza:
        '<svg viewBox="0 0 120 100"><defs><linearGradient id="bgCh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC27A"/><stop offset="1" stop-color="#FFEBC4"/></linearGradient></defs>' +
        '<rect width="120" height="100" fill="url(#bgCh)"/><circle cx="96" cy="22" r="10" fill="#FFE04A"/>' + nube(18, 14, .8) +
        '<path d="M0 46 h120 v12 H0z" fill="#2E8FE0"/><path d="M0 46 h120" stroke="#9FD3FF" stroke-width="1.4"/><path d="M12 52 q5-2 10 0 M70 50 q5-2 10 0" stroke="#BFE6FF" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M0 56 q30-6 60 0 t60 0 v44 H0z" fill="#F2D29A"/><path d="M0 74 q60-8 120 0 v26 H0z" fill="#E6BE7A"/>' +
        '<g stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round">' +
        '<path d="M14 80 l18 -34 18 34z" fill="#C99A4A"/><path d="M32 46 v-4" stroke="#7A4A1A"/><path d="M26 80 q6 -10 12 0z" fill="#3A2210"/>' +
        '<path d="M66 86 l22 -42 22 42z" fill="#D8AC5A"/><path d="M88 44 v-5" stroke="#7A4A1A"/><path d="M81 86 q7 -12 14 0z" fill="#3A2210"/>' +
        '</g>' +
        '<path d="M20 70 l12 -22 M24 74 l8 -26 M40 72 l-8 -24 M44 76 l-12 -28 M74 78 l14 -32 M78 82 l10 -36 M98 80 l-10 -34 M102 84 l-14 -38" stroke="#9A6A2A" stroke-width="1" fill="none"/>' +
        '<path d="M18 64 h28 M22 56 h20 M70 72 h36 M76 62 h24 M80 54 h16" stroke="#8A5A1A" stroke-width="1.2" stroke-linecap="round"/>' +
        persona(57, 96, .68, '#3E8BEA', 1, '<path d="M7 -14 L16 -30" stroke="#7A4A20" stroke-width="1.6" stroke-linecap="round"/><path d="M16 -30 q4 6 2 14" stroke="#555" stroke-width=".6" fill="none"/><path d="M15 -14 q4 -2 6 0 q-2 3 -6 0z" fill="#9FD3FF" stroke="' + O + '" stroke-width=".8"/>') +
        '</svg>'
    };
    for (var k in D) DIB[k] = D[k];
  })();

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
    // Avance guardado (opts.guardado = { hechos: [ids], primera: {}, xp }): sigue donde se quedó
    var listos = [], g0 = opts.guardado;
    if (g0 && g0.hechos && g0.hechos.length) {
      listos = g0.hechos.slice(); primera = Object.assign({}, g0.primera || {}); xp = g0.xp || 0;
      cola = cola.filter(function (r) { return listos.indexOf(r.id) < 0; }); hechos = total - cola.length;
    }
    function guardarAvance() { try { opts.alGuardar && opts.alGuardar({ hechos: listos.slice(), primera: Object.assign({}, primera), xp: xp }); } catch (e) {} }
    var raiz = h('<div class="rt" role="dialog" aria-label="' + esc(ruta.titulo || 'Nivel') + '">' + cielo() +
      '<div class="rt-col"><div class="rt-top"><button class="rt-x" aria-label="Salir">' + IC.x + '</button><div class="rt-barra"><i></i></div>' +
      '<div class="rt-vidas">' + IC.corazon + '<span></span></div></div><div class="rt-racha" aria-live="polite"></div><div class="rt-cab"></div><div class="rt-cuerpo"></div></div>' +
      '<div class="rt-pie"><div class="rt-pie-in"><button class="rt-btn" disabled>Comprobar</button></div>' +
      '<div class="rt-hoja"><div class="rt-hoja-in"><span class="rt-sello"></span><span class="rt-botin"></span><div class="rt-hoja-tx"></div><button class="rt-btn">Continuar</button></div></div></div>' +
      '<div class="rt-salir"><div class="rt-salir-in">' + (opts.solo ? '<b>¿Salir del minijuego?</b><p>Si sales ahora, no ganas su estrella. Puedes volver a jugarlo cuando quieras.</p>' : '<b>¿Salir del nivel?</b><p>Tu avance queda guardado: la próxima vez sigues desde el reto donde te quedaste.</p>') +
      '<button class="rt-btn verde" data-a="seguir">Seguir jugando</button><button class="otra" data-a="salir">Salir</button></div></div></div>');
    document.body.appendChild(raiz);
    var $ = function (s) { return raiz.querySelector(s); };
    var pie = $('.rt-pie'), cab = $('.rt-cab'), cuerpo = $('.rt-cuerpo'), btn = $('.rt-pie-in .rt-btn'), hoja = $('.rt-hoja'), hojaBtn = $('.rt-hoja .rt-btn');
    var pintarVidas = function () { $('.rt-vidas span').textContent = vidas; };
    var pintarBarra = function () { $('.rt-barra i').style.width = (hechos / total * 100) + '%'; };
    pintarVidas(); pintarBarra();
    if (hechos) setTimeout(function () { var r = $('.rt-racha'); if (!r) return; r.innerHTML = IC.bien + 'Sigues donde te quedaste: <b>' + hechos + '/' + total + '</b>'; r.classList.add('on', 'sigue'); setTimeout(function () { r.classList.remove('on', 'sigue'); }, 2600); }, 300);

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
      r.classList.remove('sigue');
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
      if (r.ok) { hechos++; listos.push(actual.reto.id); guardarAvance(); try { opts.alReto && opts.alReto(actual.reto.id); } catch (e) {} } else { vidas--; pintarVidas(); var v = $('.rt-vidas'); v.classList.remove('pierde'); void v.offsetWidth; v.classList.add('pierde'); cola.push(actual.reto); }
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
      // Aviso estilo Arcade: sello CORRECTO / INCORRECTO, fichas de lo ganado o perdido y la respuesta correcta
      hoja.className = 'rt-hoja on ' + (r.ok ? 'bien' : 'mal');
      var CHK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>', EQ = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      hoja.querySelector('.rt-sello').innerHTML = '<i>' + (r.ok ? CHK : EQ) + '</i>' + (r.ok ? 'Correcto' : 'Incorrecto');
      hoja.querySelector('.rt-botin').innerHTML = r.ok
        ? (racha >= 2 ? '<span class="ra">' + IC.fuego + racha + '</span>' : '') + '<span class="xp">' + IC.xp + '+' + (10 * (racha >= 5 ? 2 : 1)) + '</span>'
        : '<span class="cor">' + IC.corRoto + '−1</span>';
      var titulo = r.titulo || (r.ok ? ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)] : '');
      hoja.querySelector('.rt-hoja-tx').innerHTML = (titulo ? '<b class="rt-hoja-tit">' + esc(titulo) + '</b>' : '') +
        (r.correcta ? '<div class="rt-clave"><i>' + CHK + '</i><span><small>Respuesta correcta</small><b>' + r.correcta + '</b></span></div>' : '') +
        (r.msg ? '<p>' + r.msg + '</p>' : '') +
        (r.ok ? '' : '<span class="rt-vuelve"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/></svg>Volverá a salir antes de terminar</span>');
      hojaBtn.className = 'rt-btn ' + (r.ok ? 'lima' : 'morado');
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
      // opts.solo: un solo minijuego (1 estrella); opts.multXp: XP doble al jugar todo mezclado
      var solo = !!opts.solo; xp = Math.round(xp * (opts.multXp || 1));
      var prec = Math.max(0, Math.round((total - fallados) / total * 100));
      raiz.querySelector('.rt-col').remove(); raiz.querySelector('.rt-pie').remove();
      var mm = Math.floor(seg / 60) + ':' + ('0' + seg % 60).slice(-2);
      var res = { gano: gano, estrellas: est, errores: errores, segundos: seg, precision: prec, xp: xp, racha: mejorRacha };
      if (gano) { try { opts.alGanar && opts.alGanar(res); } catch (e) {} }
      // Datos del juego que lo usa (estrellas grandes del nivel, sus minijuegos, nivel que se abre)
      var ex = {}; try { ex = (opts.finExtra && opts.finExtra(res)) || {}; } catch (e) {}
      var nEst = solo ? 1 : 3, eOn = solo ? (gano ? 1 : 0) : (ex.estrellas != null ? ex.estrellas : est);
      var tit = !gano ? 'Sin<br><em>corazones</em>' : est === 3 && eOn === nEst ? '¡Perfecto!' : solo ? '¡Minijuego<br><em>superado!</em>' : '¡Nivel<br><em>superado!</em>';
      var REP = '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5"/></svg>', MAPA = '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>';
      var cuerpoFin = '';
      if (gano) {
        cuerpoFin = '<span class="fz-lb">Recompensas</span><div class="fz-prem">' +
          '<div class="fz-p">' + (opts.multXp > 1 ? '<span class="x2">x' + opts.multXp + '</span>' : '') + IC.xp + '<b>+' + xp + '</b><small>XP</small></div>' +
          '<div class="fz-p">' + IC.fuego + '<b>' + mejorRacha + '</b><small>Mejor racha</small></div>' +
          '<div class="fz-p">' + IC.diana + '<b>' + prec + '%</b><small>Precisión</small></div></div>' +
          '<div class="fz-datos"><span>Errores <b>' + errores + '</b></span><span>Tiempo <b>' + mm + '</b></span></div>';
      } else {
        cuerpoFin = '<span class="fz-lb">Tu avance</span><div class="fz-av"><i style="width:' + Math.round(hechos / total * 100) + '%"></i></div>' +
          '<p class="fz-txt">' + (solo ? 'Te quedaste sin corazones. Inténtalo otra vez: cada intento te enseña algo.' : 'Llevas <b>' + hechos + ' de ' + total + '</b> retos y quedó guardado. Sigue con 5 corazones nuevos y termina el nivel.') + '</p>';
      }
      if (ex.minis && ex.minis.length) {
        var nOk = ex.minis.filter(function (m) { return m.ok; }).length;
        cuerpoFin += '<span class="fz-lb">Minijuegos · ' + nOk + ' de ' + ex.minis.length + '</span><div class="fz-mini" style="--n:' + ex.minis.length + '">' + ex.minis.map(function (m) {
          return '<i class="' + (m.nuevo ? 'nuevo' : '') + '" style="--c:' + m.c + '">' + (IC[m.tipo] || '').replace(/#C6E000/g, '#fff') + IC.estrella3d(m.ok, 'e') + '</i>';
        }).join('') + '</div>';
      }
      var f = h('<div class="rt-fin fz' + (gano ? '' : ' pierde') + '"><span class="fz-sol"></span><div class="izq"><span class="fz-cint">' + esc(ruta.titulo || 'Nivel') + '</span>' +
        '<span class="fz-st n' + nEst + '">' + [1, 2, 3].slice(0, nEst).map(function (n, i) { return IC.estrella3d(n <= eOn).replace('<svg', '<svg style="animation-delay:' + (.2 + i * .22) + 's"'); }).join('') + '</span>' +
        '<h2 class="fz-tit">' + tit + '</h2></div>' +
        '<div class="fz-card">' + cuerpoFin + '</div>' +
        (gano && ex.abre ? '<div class="fz-abre"><span class="cand"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/></svg></span><span><b>' + esc(ex.abre) + '</b><small>' + esc(ex.abreSub || '') + '</small></span></div>' : '') +
        '<div class="fz-bot"><button class="rt-btn verde">' + (gano ? 'Continuar' : solo ? 'Otra vez' : 'Seguir') + '</button>' +
        (gano ? '<button class="fz-cua" data-a="otra" aria-label="Jugar otra vez">' + REP + '</button>' : '') +
        '<button class="fz-cua" data-a="mapa" aria-label="Volver al mapa">' + MAPA + '</button></div></div>');
      raiz.appendChild(f);
      son(gano ? 'victoria' : 'mal');
      if (gano && est === 3) confeti(raiz);
      var sigue = function () { var o = Object.assign({}, opts, { guardado: { hechos: listos.slice(), primera: Object.assign({}, primera), xp: xp } }); jugar(ruta, o); };
      if (gano) { try { opts.alGuardar && opts.alGuardar(null); } catch (e) {} }
      f.querySelector('.rt-btn').onclick = function () { cerrar(); if (gano) { opts.alTerminar && opts.alTerminar(res); } else sigue(); };
      var bOtra = f.querySelector('[data-a="otra"]');
      if (bOtra) bOtra.onclick = function () { son('tap'); cerrar(); jugar(opts.otraVez ? opts.otraVez() : ruta, Object.assign({}, opts, { guardado: null })); };
      f.querySelector('[data-a="mapa"]').onclick = function () { son('tap'); cerrar(); var m = opts.alMapa || (gano ? opts.alTerminar : opts.alCerrar); if (m) m(res); };
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
    orden.forEach(function (i, k) {
      var o = r.opciones[i];
      var b = h('<button class="rt-t"><span class="dib">' + (DIB[o.dibujo] || '') + '</span><span class="txt"><span class="let">' + 'ABCD'.charAt(k) + '</span>' + esc(o.texto) + '</span></button>');
      b.onclick = function () { sel = i; g.querySelectorAll('.rt-t').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); a.acierto(); a.listo(true); };
      b.dataset.i = i; g.appendChild(b);
    });
    a.cuerpo.appendChild(g);
    a.alComprobar(function () {
      var ok = sel === r.correcta;
      g.querySelectorAll('.rt-t').forEach(function (x) { x.style.pointerEvents = 'none'; if (+x.dataset.i === r.correcta) x.classList.add('bien'); else if (+x.dataset.i === sel) x.classList.add('mal'); });
      return { ok: ok, correcta: ok ? '' : esc(r.opciones[r.correcta].texto), msg: esc(r.explica || '') };
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
    var g = h('<div class="rt-mem n' + (r.pares.length * 2) + '"></div>');
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
      return { ok: ok, correcta: ok ? '' : sol, msg: esc(r.explica || '') };
    });
  };

  // Ordenar en el tiempo
  TIPOS.ordenar = function (a) {
    var r = a.reto, n = r.items.length;
    var wrap = h('<div class="rt-ordw"></div>');
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
    var ext = r.extremos || ['Más antiguo', 'Más reciente'];   // en pasos de un proceso: ["Primero", "Al final"]
    wrap.appendChild(h('<p class="rt-extremo">' + IC.antiguo + esc(ext[0]) + '</p>'));
    wrap.appendChild(linea);
    wrap.appendChild(h('<p class="rt-extremo ult">' + esc(ext[1]) + '</p>'));
    wrap.appendChild(banco);
    a.cuerpo.appendChild(wrap);
    a.alComprobar(function () {
      wrap.dataset.fin = 1; banco.remove();
      var ok = true;
      ranuras.forEach(function (s, k) {
        var c = s.firstChild, i = +c.dataset.i, bien = i === k;
        c.innerHTML = contenido(r.items[i], true); c.classList.add(bien ? 'bien' : 'mal'); if (!bien) ok = false;
      });
      var sol = r.items.map(function (it) { return '<b>' + esc(it.texto) + '</b>' + (it.fecha ? ' (' + esc(it.fecha) + ')' : ''); }).join(' → ');
      return { ok: ok, correcta: ok ? '' : sol, msg: esc(r.explica || '') };
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

/* =========================================================
   Modo Cachimbo · Emblema de la Guerra de clanes (dibujo propio)
   Escudo morado con borde dorado, corona lima, dos lápices cruzados
   detrás (en vez de armas: aquí se pelea estudiando) y alas.
   Lo usan clanes.html (portada) y guerra.html.
   MCGuerraEmblema(n) → SVG; n = número de temporada (va en la cinta).
   ========================================================= */
(function () {
  function lapiz(rot) {
    return '<g transform="rotate(' + rot + ' 120 128)">' +
      '<rect x="112" y="8" width="16" height="196" rx="3" fill="#FFC800" stroke="#1a1030" stroke-width="5"/>' +
      '<rect x="112" y="8" width="5" height="196" fill="#FFE27A"/>' +
      '<rect x="110" y="196" width="20" height="16" rx="2" fill="#C9C6D6" stroke="#1a1030" stroke-width="5"/>' +
      '<rect x="110" y="210" width="20" height="14" rx="5" fill="#FF7AA8" stroke="#1a1030" stroke-width="5"/>' +
      '<path d="M112 10 120 -16 128 10z" fill="#F5D7A1" stroke="#1a1030" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M117 -2 120 -16 123 -2z" fill="#1a1030"/>' +
      '</g>';
  }
  function ala(lado) {
    var s = lado < 0 ? 'translate(240 0) scale(-1 1)' : '';
    // Tres plumas largas que salen de detrás del escudo
    function pluma(y, largo, ang, col) {
      var x2 = 172 + largo;
      return '<g transform="rotate(' + ang + ' 172 ' + y + ')"><path d="M168 ' + (y - 12) + 'Q' + (172 + largo * .55) + ' ' + (y - 20) + ' ' + x2 + ' ' + (y - 2) + 'Q' + (172 + largo * .6) + ' ' + (y + 16) + ' 168 ' + (y + 12) + 'z" fill="' + col + '" stroke="#1a1030" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M176 ' + y + 'Q' + (172 + largo * .5) + ' ' + (y - 5) + ' ' + (x2 - 10) + ' ' + (y - 3) + '" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/></g>';
    }
    return '<g transform="' + s + '">' + pluma(150, 48, 14, '#6a3fd0') + pluma(124, 64, -6, '#8a5cf0') + pluma(98, 70, -26, '#b08cff') + '</g>';
  }
  window.MCGuerraEmblema = function (n) {
    return '<svg viewBox="-10 -30 260 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="ge-esc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b2bb8"/><stop offset=".6" stop-color="#2d1466"/><stop offset="1" stop-color="#1a0b40"/></linearGradient>' +
      '<linearGradient id="ge-oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF0A8"/><stop offset=".45" stop-color="#FFC800"/><stop offset="1" stop-color="#B07A00"/></linearGradient>' +
      '<linearGradient id="ge-lima" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2FF8A"/><stop offset=".55" stop-color="#C6E000"/><stop offset="1" stop-color="#7f9200"/></linearGradient>' +
      '<radialGradient id="ge-luz" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#C6E000" stop-opacity=".55"/><stop offset="1" stop-color="#C6E000" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<circle cx="120" cy="120" r="128" fill="url(#ge-luz)"/>' +
      lapiz(-38) + lapiz(38) + ala(1) + ala(-1) +
      // Escudo
      '<path d="M120 46 192 70v58c0 46-32 78-72 96-40-18-72-50-72-96V70z" fill="#1a1030" transform="translate(5 8)" opacity=".55"/>' +
      '<path d="M120 46 192 70v58c0 46-32 78-72 96-40-18-72-50-72-96V70z" fill="url(#ge-oro)" stroke="#1a1030" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="M120 60 180 80v48c0 38-26 66-60 82-34-16-60-44-60-82V80z" fill="url(#ge-esc)" stroke="#1a1030" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M120 60 180 80v48c0 38-26 66-60 82z" fill="#000" opacity=".18"/>' +
      '<path d="M66 86 120 68" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35"/>' +
      // Búho (cara) en el escudo
      '<g transform="translate(120 140)">' +
      '<path d="M-34-30-20-46-8-34h16l12-12 14 16v34c0 22-15 36-34 36s-34-14-34-36z" fill="url(#ge-lima)" stroke="#1a1030" stroke-width="5" stroke-linejoin="round"/>' +
      '<circle cx="-14" cy="-10" r="12" fill="#fff" stroke="#1a1030" stroke-width="4"/><circle cx="14" cy="-10" r="12" fill="#fff" stroke="#1a1030" stroke-width="4"/>' +
      '<circle cx="-12" cy="-9" r="5.5" fill="#1a1030"/><circle cx="16" cy="-9" r="5.5" fill="#1a1030"/>' +
      '<circle cx="-10" cy="-11" r="1.8" fill="#fff"/><circle cx="18" cy="-11" r="1.8" fill="#fff"/>' +
      '<path d="M-6 4h12l-6 9z" fill="#FF9600" stroke="#1a1030" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M-22-24-6-18M22-24 6-18" stroke="#1a1030" stroke-width="5" stroke-linecap="round"/>' +
      '</g>' +
      // Corona
      '<g transform="translate(120 38)">' +
      '<path d="M-40 16-46-22-22-4 0-34 22-4 46-22 40 16z" fill="#1a1030" transform="translate(4 5)" opacity=".5"/>' +
      '<path d="M-40 16-46-22-22-4 0-34 22-4 46-22 40 16z" fill="url(#ge-lima)" stroke="#1a1030" stroke-width="5" stroke-linejoin="round"/>' +
      '<rect x="-42" y="12" width="84" height="12" rx="3" fill="url(#ge-oro)" stroke="#1a1030" stroke-width="5"/>' +
      '<circle cy="-34" r="6" fill="#FF4B6E" stroke="#1a1030" stroke-width="4"/><circle cx="-46" cy="-22" r="5" fill="#1CB0F6" stroke="#1a1030" stroke-width="4"/><circle cx="46" cy="-22" r="5" fill="#1CB0F6" stroke="#1a1030" stroke-width="4"/>' +
      '<circle cy="3" r="5" fill="#fff" stroke="#1a1030" stroke-width="3"/>' +
      '</g>' +
      // Cinta con la temporada
      (n ? '<g transform="translate(120 238)">' +
        '<path d="M-96-17h192l-12 17 12 17h-192l12-17z" fill="#1a1030" transform="translate(3 4)" opacity=".5"/>' +
        '<path d="M-96-17h192l-12 17 12 17h-192l12-17z" fill="url(#ge-oro)" stroke="#1a1030" stroke-width="5" stroke-linejoin="round"/>' +
        '<text y="8" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-style="italic" font-weight="900" font-size="24" fill="#1a1030" textLength="150" lengthAdjust="spacingAndGlyphs">TEMPORADA ' + n + '</text>' +
        '</g>' : '') +
      '</svg>';
  };
})();

/* =========================================================
   Modo Cachimbo · Evento "Noche de Brujas" (Halloween 2026)
   - Pines y disfraces del búho (SVG propios).
   - evento.html: misiones del día, calabazas, calendario y premios.
   - perfil.html: vitrina con los pines que ganaste (aunque el evento ya terminó).
   - assets/tema.js lo carga para ponerle al búho el disfraz elegido.
   Datos: supabase/26-evento-halloween.sql (evento_estado, evento_canjear, evento_disfraz).
   ========================================================= */
(function () {
  if (window.MCEvento) return;
  var NAR = '#FF8A1F', NAR_D = '#B9470A';
  var GUARDA = 'mc_ev_hal26';   // copia local del estado (disfraz y premios) para pintar sin esperar

  /* ---------- dibujos ---------- */
  var CALABAZA = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M33 15c0-6 3-10 8-11-1 3-3 6-3 11z" fill="#5B8C1E"/><path d="M37 9c5-4 11-3 13 1-4-1-8 0-11 3z" fill="#7BC62D"/>' +
    '<ellipse cx="19" cy="38" rx="15" ry="20" fill="#D9590B"/><ellipse cx="45" cy="38" rx="15" ry="20" fill="#D9590B"/><ellipse cx="32" cy="38" rx="15" ry="22" fill="#FF8A1F"/>' +
    '<path d="M21 31l6-6 5 6zM37 31l6-6 5 6z" fill="#3A1300"/><path d="M19 42c6 9 20 9 26 0l-4 2-3-3-3 4-3-4-3 4-3-4-3 3z" fill="#3A1300"/>' +
    '<ellipse cx="25" cy="24" rx="4" ry="7" fill="#FFC27A" opacity=".45"/></svg>';

  // Pin esmaltado: aro de metal, fondo de color y el dibujo
  function pin(id, fondo, aro, dibujo) {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="evAro-' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + aro[0] + '"/><stop offset=".5" stop-color="' + aro[1] + '"/><stop offset="1" stop-color="' + aro[2] + '"/></linearGradient></defs>' +
      '<circle cx="32" cy="33.5" r="30" fill="#000" opacity=".35"/><circle cx="32" cy="32" r="30" fill="url(#evAro-' + id + ')"/>' +
      '<circle cx="32" cy="32" r="25" fill="' + fondo + '"/>' + dibujo +
      '<path d="M14 22a21 21 0 0 1 22-12" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".35"/></svg>';
  }
  var PLATA = ['#F3EEFF', '#9C90B5', '#5C5072'], ORO = ['#FFF1B0', '#F2B520', '#9A5E00'];
  var PINES = {
    'pin-calabaza': pin('cal', '#3A1452', PLATA,
      '<path d="M33 18c0-4 2-6 5-7-1 2-2 4-2 7z" fill="#7BC62D"/><ellipse cx="24" cy="35" rx="9" ry="12" fill="#D9590B"/><ellipse cx="40" cy="35" rx="9" ry="12" fill="#D9590B"/>' +
      '<ellipse cx="32" cy="35" rx="9" ry="13" fill="#FF8A1F"/><path d="M25 31l4-4 3 4zM35 31l4-4 3 4z" fill="#3A1300"/><path d="M24 38c5 6 11 6 16 0l-3 1-2-2-3 3-3-3-2 2z" fill="#3A1300"/>'),
    'pin-murcielago': pin('mur', '#5B2BB0', PLATA,
      '<circle cx="32" cy="27" r="11" fill="#FFE7A8"/><path d="M32 36c-1-3-2-4-2-4l-1 2c-4-4-10-4-17 0 4 1 6 3 6 6 2-2 5-2 7 1 1-2 3-3 5-1 1 2 2 3 2 3s1-1 2-3c2-2 4-1 5 1 2-3 5-3 7-1 0-3 2-5 6-6-7-4-13-4-17 0l-1-2s-1 1-2 4z" fill="#160a24"/>'),
    'pin-fantasma': pin('fan', '#16264F', PLATA,
      '<path d="M32 13c-9 0-13 7-13 15v20l4-3 5 3 4-3 4 3 5-3 4 3V28c0-8-4-15-13-15z" fill="#F3EEFF"/><path d="M39 16c3 3 6 7 6 12v20l-4-3V28c0-5-1-9-4-12z" fill="#CFC2F2"/>' +
      '<ellipse cx="27" cy="28" rx="2.6" ry="3.4" fill="#1d0f33"/><ellipse cx="37" cy="28" rx="2.6" ry="3.4" fill="#1d0f33"/><ellipse cx="32" cy="36" rx="3" ry="3.8" fill="#1d0f33"/>'),
    'pin-telarana': pin('tel', '#2A2236', PLATA,
      '<g stroke="#D9CFEA" stroke-width="1.3" fill="none"><path d="M32 9v46M9 32h46M16 16l32 32M48 16 16 48"/>' +
      '<path d="M32 17l8 7 7 8-7 8-8 7-8-7-7-8 7-8zM32 25l4 3 4 4-4 4-4 3-4-3-4-4 4-4z"/></g>' +
      '<path d="M44 9v13" stroke="#D9CFEA" stroke-width="1"/><ellipse cx="44" cy="25" rx="4" ry="5" fill="#120a1e"/><circle cx="44" cy="20" r="2.6" fill="#120a1e"/><circle cx="43" cy="19.6" r=".7" fill="#FF4F7B"/><circle cx="45" cy="19.6" r=".7" fill="#FF4F7B"/>'),
    'pin-superviviente': pin('sup', '#4A1A05', ORO,
      '<path d="M22 17l5 5 5-8 5 8 5-5-2 10H24z" fill="#FFD34D"/><circle cx="22" cy="17" r="1.8" fill="#FFF1B0"/><circle cx="32" cy="14" r="1.8" fill="#FFF1B0"/><circle cx="42" cy="17" r="1.8" fill="#FFF1B0"/>' +
      '<ellipse cx="25" cy="39" rx="8" ry="10" fill="#E8A21A"/><ellipse cx="39" cy="39" rx="8" ry="10" fill="#E8A21A"/><ellipse cx="32" cy="39" rx="8" ry="11" fill="#FFC93C"/>' +
      '<path d="M26 36l4-3 2 3zM34 36l4-3 2 3z" fill="#5A2A00"/><path d="M26 42c4 5 8 5 12 0l-2 1-2-2-2 2-2-2-2 2z" fill="#5A2A00"/>')
  };

  // Disfraces: se dibujan encima del búho (viewBox 0 0 200 210 de assets/buho.js)
  var DISFRACES = {
    'disfraz-gorro': '<g class="acc-disfraz acc-gorro" data-id="disfraz-gorro">' +
      '<ellipse cx="100" cy="56" rx="72" ry="13" fill="#1a0a2c"/>' +
      '<path d="M58 54C68 32 82 6 94-16c6-12 20-22 36-17-12 2-20 10-21 21 2 24 18 45 31 66z" fill="#2c1150"/>' +
      '<path d="M109-12c2 24 18 45 31 66h-17c-10-20-17-40-18-60z" fill="#1a0a2c" opacity=".75"/>' +
      '<path d="M64 38q36 9 72 0l5 13q-41 10-82 0z" fill="' + NAR + '"/>' +
      '<rect x="91" y="39" width="18" height="15" rx="3" fill="#FFC21A"/><rect x="95.5" y="43" width="9" height="7" rx="1.5" fill="#2c1150"/>' +
      '<ellipse cx="100" cy="53" rx="58" ry="5" fill="#45207a" opacity=".85"/>' +
      '<circle cx="80" cy="18" r="2" fill="#FFC21A" class="acc-brillo"/><circle cx="120" cy="30" r="1.6" fill="#FFC21A" class="acc-brillo" style="animation-delay:-1.2s"/></g>',
    'disfraz-capa': '<g class="acc-disfraz" data-id="disfraz-capa">' +
      // capa de vampiro: cae por los costados, cuello alto con forro rojo y medallón
      '<path d="M46 118C26 138 18 170 20 202l40-4c-14-18-20-48-14-80z" fill="#3b1260"/><path d="M154 118c20 20 28 52 26 84l-40-4c14-18 20-48 14-80z" fill="#3b1260"/>' +
      '<path d="M46 118c-6 30 0 60 14 80" stroke="#C8102E" stroke-width="4" fill="none"/><path d="M154 118c6 30 0 60-14 80" stroke="#C8102E" stroke-width="4" fill="none"/>' +
      '<path d="M58 132 10 84l18 70z" fill="#1e0833"/><path d="M56 134 20 98l12 50z" fill="#C8102E"/>' +
      '<path d="M142 132l48-48-18 70z" fill="#1e0833"/><path d="M144 134l36-36-12 50z" fill="#C8102E"/>' +
      '<path d="M70 160q30 12 60 0" stroke="#F2B520" stroke-width="3" fill="none"/>' +
      '<circle cx="100" cy="168" r="10" fill="#F2B520"/><circle cx="100" cy="168" r="5.5" fill="#C8102E"/><circle cx="98" cy="166" r="1.8" fill="#fff" opacity=".7"/></g>',
    'disfraz-sabana': '<g class="acc-disfraz acc-sabana" data-id="disfraz-sabana">' +
      // sábana de fantasma con dos huecos para los ojos
      '<path fill-rule="evenodd" fill="#F4EEFF" opacity=".93" d="M100 28C54 28 24 64 24 110v88l13-10 13 10 13-10 13 10 12-10 12 10 12-10 13 10 13-10 13 10 13-10 13 10v-88c0-46-30-82-76-82z' +
      'M50 104a20 22 0 1 0 40 0a20 22 0 1 0-40 0zM110 104a20 22 0 1 0 40 0a20 22 0 1 0-40 0z"/>' +
      '<path d="M150 50c14 14 22 34 22 60v84l-10-8V110c0-24-4-44-12-60z" fill="#CFC2F2" opacity=".8"/>' +
      '<path d="M86 150q14 10 28 0" stroke="#2a1840" stroke-width="5" stroke-linecap="round" fill="none"/></g>',
    'disfraz-calabaza': '<g class="acc-disfraz" data-id="disfraz-calabaza">' +
      // calabaza encendida como casco
      '<path d="M98 6c0-9 4-14 12-16-2 5-4 9-4 16z" fill="#4E7A16"/><path d="M106-2c8-6 18-5 21 1-6-2-12-1-17 4z" fill="#7BC62D"/>' +
      '<ellipse cx="66" cy="40" rx="34" ry="30" fill="#D9590B"/><ellipse cx="134" cy="40" rx="34" ry="30" fill="#D9590B"/><ellipse cx="100" cy="38" rx="40" ry="34" fill="#FF8A1F"/>' +
      '<path d="M78 34l9-11 9 11zM104 34l9-11 9 11z" fill="#FFD27A"/><path d="M76 46c14 14 34 14 48 0l-6 3-5-4-5 5-5-5-5 5-5-5-5 4z" fill="#FFD27A"/>' +
      '<ellipse cx="84" cy="22" rx="6" ry="9" fill="#FFC27A" opacity=".5"/></g>'
  };
  var CATALOGO = [
    { id: 'pin-calabaza', tipo: 'pin', nombre: 'Pin Calabaza', precio: 2 },
    { id: 'pin-murcielago', tipo: 'pin', nombre: 'Pin Murciélago', precio: 3 },
    { id: 'pin-fantasma', tipo: 'pin', nombre: 'Pin Fantasma', precio: 5 },
    { id: 'pin-telarana', tipo: 'pin', nombre: 'Pin Telaraña', precio: 7 },
    { id: 'disfraz-capa', tipo: 'disfraz', nombre: 'Capa de vampiro', precio: 5 },
    { id: 'disfraz-sabana', tipo: 'disfraz', nombre: 'Sábana de fantasma', precio: 6 },
    { id: 'disfraz-calabaza', tipo: 'disfraz', nombre: 'Casco de calabaza', precio: 8 },
    { id: 'marco-telarana', tipo: 'marco', nombre: 'Marco de telaraña', precio: 4 }
  ];
  var NOMBRE = { 'pin-superviviente': 'Superviviente', 'disfraz-gorro': 'Sombrero de bruja' };
  CATALOGO.forEach(function (p) { NOMBRE[p.id] = p.nombre; });

  /* ---------- estado ---------- */
  var estado = null, oyentes = [];
  try { estado = JSON.parse(localStorage.getItem(GUARDA) || 'null'); } catch (e) {}
  function guardar(e) {
    estado = e;
    try { localStorage.setItem(GUARDA, JSON.stringify({ premios: e.premios, disfraz: e.disfraz })); } catch (x) {}
    marco();
    oyentes.forEach(function (f) { try { f(e); } catch (x) {} });
  }
  function rpc(nombre, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin sesión'));
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data) guardar(r.data);
      return r.data;
    });
  }
  function tiene(id) { return !!(estado && (estado.premios || []).indexOf(id) >= 0); }
  // Disfraz que lleva el búho: el elegido; si nunca eligió, el sombrero de bruja
  function disfrazPuesto() {
    var d = estado && estado.disfraz !== undefined ? estado.disfraz : 'disfraz-gorro';
    if (d === 'ninguno') return '';
    return DISFRACES[d || 'disfraz-gorro'] || DISFRACES['disfraz-gorro'];
  }
  // Marco de telaraña alrededor de tu avatar
  function marco() {
    var on = tiene('marco-telarana');
    document.documentElement.classList.toggle('ev-marco', on);
    if (on && !document.getElementById('evMarcoCss')) {
      var st = document.createElement('style'); st.id = 'evMarcoCss';
      st.textContent = 'html.ev-marco .mcu-av{position:relative;box-shadow:0 0 0 3px #2b1d3f,0 0 0 5px ' + NAR + ',0 0 14px rgba(255,138,31,.45)!important}' +
        'html.ev-marco .mcu-av::after{content:"";position:absolute;inset:-9px;pointer-events:none;background:url("data:image/svg+xml;utf8,' +
        encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" stroke="#E9DCFF" stroke-width="1"><path d="M0 0l12 12M0 0v12M0 0h12M0 6q4 0 6-6M0 10q8 0 10-10"/><path d="M40 40 28 28M40 40V28M40 40H28M40 34q-4 0-6 6M40 30q-8 0-10 10"/></svg>') +
        '") center/100% 100% no-repeat}';
      document.head.appendChild(st);
    }
  }
  if (estado) marco();

  window.MCEvento = {
    CALABAZA: CALABAZA, PINES: PINES, DISFRACES: DISFRACES, CATALOGO: CATALOGO, NOMBRE: NOMBRE,
    estado: function () { return estado; },
    cargar: function () { return rpc('evento_estado'); },
    canjear: function (id) { return rpc('evento_canjear', { p_premio: id }); },
    ponerDisfraz: function (id) { return rpc('evento_disfraz', { p_disfraz: id }); },
    disfrazPuesto: disfrazPuesto,
    tiene: tiene,
    alCambiar: function (f) { oyentes.push(f); }
  };

  /* ---------- perfil: vitrina de pines ---------- */
  function enPerfil() {
    var tab = document.getElementById('tabPerfil');
    if (!tab) return;
    function pintar() {
      var mios = ['pin-superviviente', 'pin-calabaza', 'pin-murcielago', 'pin-fantasma', 'pin-telarana'].filter(tiene);
      var caja = document.getElementById('evVitrina');
      if (!mios.length) { if (caja) caja.remove(); return; }
      if (!caja) {
        caja = document.createElement('section'); caja.id = 'evVitrina'; caja.className = 'panel ev-vit';
        var css = document.createElement('style');
        css.textContent = '.ev-vit ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:12px;margin:14px 0 0;padding:0}' +
          '.ev-vit li{text-align:center;font:800 12px/1.25 Nunito,sans-serif;color:var(--text-dim)}' +
          '.ev-vit li svg{display:block;width:64px;height:64px;margin:0 auto 6px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.4))}' +
          '.ev-vit li.oro{color:#FFD34D}';
        document.head.appendChild(css);
        var rango = document.getElementById('rango');
        if (rango) rango.insertAdjacentElement('afterend', caja); else tab.insertBefore(caja, tab.firstChild);
      }
      caja.innerHTML = '<h2 class="sec-tit" style="margin-top:0">Pines de Halloween 2026</h2><p class="nota" style="margin:2px 0 0">Los ganaste en el evento Noche de Brujas. Son tuyos para siempre.</p><ul>' +
        mios.map(function (id) { return '<li' + (id === 'pin-superviviente' ? ' class="oro"' : '') + '>' + PINES[id] + NOMBRE[id] + '</li>'; }).join('') + '</ul>';
    }
    pintar();
    window.MCEvento.alCambiar(pintar);
    window.MCEvento.cargar().catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enPerfil); else enPerfil();
})();

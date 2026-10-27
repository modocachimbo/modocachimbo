/* =========================================================
   Modo Cachimbo · Mi colección (lo que tienes y te pones)
   - CATALOGO: búhos, fotos de perfil, fondos, marcos, títulos y pines.
     Cada objeto dice cómo se consigue (regla):
       gratis · racha (mejor racha de N días) · rango (cerrar una semana
       en ese rango) · evento / regalo (te lo entregan por SQL en coleccion_mia)
   - Lo que tienes puesto y lo que te regalaron vive en supabase/31-coleccion.sql.
     Si ese SQL aún no corrió, lo puesto se guarda solo en este equipo.
   - window.MCColeccion para coleccion.html y perfil.html:
       cargar() · alCambiar(fn) · items(espacio) · tiene(id) · puesto(espacio)
       poner(espacio, id) · tema(id) · marco(id) · titulo(id) · html(item)
   ========================================================= */
(function () {
  if (window.MCColeccion) return;
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/assets\/coleccion\.js(\?.*)?$/, '') : './';
  var D = BASE + 'assets/buho/disfraces/';

  // Rarezas: color del borde y nombre
  var RAREZA = {
    comun: { nom: 'Común', c: '169,159,200' },
    raro: { nom: 'Raro', c: '28,176,246' },
    epico: { nom: 'Épico', c: '206,130,255' },
    legendario: { nom: 'Legendario', c: '255,200,0' },
    evento: { nom: 'Evento', c: '255,75,75' }
  };
  var RANGO = ['Zafiro', 'Esmeralda', 'Amatista', 'Rubí', 'Leyenda'];
  var HALLOWEEN = 'Noche de Brujas 2026';  // en la cinta de la tarjeta sale «Halloween»

  // Espacios: dónde se pone cada cosa (pines: hasta 3 en tu vitrina)
  var ESPACIOS = [
    { id: 'buho', nom: 'Búho', uno: 'Búho' },
    { id: 'avatar', nom: 'Perfil', uno: 'Foto de perfil' },
    { id: 'escena', nom: 'Escenarios', uno: 'Escenario' },
    { id: 'racha', nom: 'Fondos', uno: 'Fondo de perfil' },
    { id: 'cuadro', nom: 'Racha', uno: 'Cuadro de racha' },
    { id: 'marco', nom: 'Marcos', uno: 'Marco' },
    { id: 'titulo', nom: 'Títulos', uno: 'Título' },
    { id: 'pines', nom: 'Pines', uno: 'Pin' }
  ];
  var DEFECTO = { buho: 'buho-clasico', avatar: 'avatar-foto', escena: 'escena-galaxia', racha: 'racha-galaxia', cuadro: 'cuadro-galaxia', marco: 'marco-ninguno', titulo: 'titulo-cachimbo', pines: [] };

  var CATALOGO = [
    // Búho: los disfraces de cada área ya acompañan en sus páginas, así que vienen con tu cuenta
    { id: 'buho-clasico', espacio: 'buho', nom: 'Clásico', rareza: 'comun', regla: { tipo: 'gratis' }, desc: 'El búho de siempre, con sus lentes de sol.' },
    { id: 'buho-antiguo', espacio: 'buho', nom: 'Antiguo', rareza: 'comun', regla: { tipo: 'gratis' }, desc: 'El primer búho de Modo Cachimbo, el del logo.' },
    { id: 'buho-al-juarismi', espacio: 'buho', nom: 'Al-Juarismi', rareza: 'raro', regla: { tipo: 'gratis' }, img: 'matematica', area: 'Matemática', desc: 'El padre del álgebra. Te acompaña en Matemática.' },
    { id: 'buho-cervantes', espacio: 'buho', nom: 'Cervantes', rareza: 'raro', regla: { tipo: 'gratis' }, img: 'comunicacion', area: 'Comunicación', desc: 'El autor del Quijote. Te acompaña en Comunicación.' },
    { id: 'buho-einstein', espacio: 'buho', nom: 'Einstein', rareza: 'raro', regla: { tipo: 'gratis' }, img: 'ciencia-tecnologia', area: 'Ciencia y Tecnología', desc: 'El genio de la relatividad. Te acompaña en Ciencia y Tecnología.' },
    { id: 'buho-inca', espacio: 'buho', nom: 'Inca', rareza: 'epico', regla: { tipo: 'gratis' }, img: 'ciencias-sociales', area: 'Ciencias Sociales', desc: 'Con mascaipacha y unku. Te acompaña en Ciencias Sociales.' },
    { id: 'buho-birrete', espacio: 'buho', nom: 'Birrete de ingresante', rareza: 'legendario', regla: { tipo: 'regalo' }, desc: 'Para quien ya ingresó a la universidad. Te lo entregamos cuando nos cuentes que ingresaste.' },

    // Foto de perfil: la de tu tarjeta, tu perfil y los tops (el búho es la de siempre)
    { id: 'avatar-buho', espacio: 'avatar', nom: 'Búho', rareza: 'comun', regla: { tipo: 'gratis' }, av: 'clasico', desc: 'La cara del búho de Modo Cachimbo.' },
    { id: 'avatar-foto', espacio: 'avatar', nom: 'Mi foto', rareza: 'comun', regla: { tipo: 'gratis' }, desc: 'Tu foto de Google. Si no tienes, sale tu inicial.' },
    { id: 'avatar-al-juarismi', espacio: 'avatar', nom: 'Al-Juarismi', rareza: 'raro', regla: { tipo: 'gratis' }, av: 'matematica', area: 'Matemática' },
    { id: 'avatar-cervantes', espacio: 'avatar', nom: 'Cervantes', rareza: 'raro', regla: { tipo: 'gratis' }, av: 'comunicacion', area: 'Comunicación' },
    { id: 'avatar-einstein', espacio: 'avatar', nom: 'Einstein', rareza: 'raro', regla: { tipo: 'gratis' }, av: 'ciencia-tecnologia', area: 'Ciencia y Tecnología' },
    { id: 'avatar-inca', espacio: 'avatar', nom: 'Inca', rareza: 'epico', regla: { tipo: 'gratis' }, av: 'ciencias-sociales', area: 'Ciencias Sociales' },

    // Escenarios: donde se para el búho en el inicio, con su cielo y su piso (PISOS). Galaxia es el de siempre
    { id: 'escena-galaxia', espacio: 'escena', nom: 'Galaxia', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'], desc: 'La plataforma dorada de siempre bajo las estrellas.' },
    { id: 'escena-nube', espacio: 'escena', nom: 'Nube', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#1CB0F6', '#1588d0', '#1488c9', '#0f6fa6'], desc: 'El búho flota sobre una nube.' },
    { id: 'escena-cesped', espacio: 'escena', nom: 'Césped', rareza: 'raro', regla: { tipo: 'racha', n: 7 }, tema: ['#14C46A', '#0e9a8a', '#12a96a', '#08705a'], desc: 'Una isla de pasto con flores.' },
    { id: 'escena-luna', espacio: 'escena', nom: 'Luna', rareza: 'epico', regla: { tipo: 'rango', n: 2 }, tema: ['#4a3bc4', '#1b1458', '#3d30a8', '#130e40'], desc: 'Una roca lunar en plena noche.' },
    { id: 'escena-volcan', espacio: 'escena', nom: 'Volcán', rareza: 'epico', regla: { tipo: 'racha', n: 30 }, tema: ['#FF7A1A', '#c2271a', '#e05a12', '#8a1a0e'], desc: 'Roca con grietas de lava.' },
    { id: 'escena-hielo', espacio: 'escena', nom: 'Hielo', rareza: 'legendario', regla: { tipo: 'racha', n: 100 }, tema: ['#7b3cff', '#1d9b8a', '#6a35d8', '#3b1d86'], desc: 'Un bloque de hielo bajo la aurora.' },
    { id: 'escena-calabaza', espacio: 'escena', nom: 'Calabazas', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, tema: ['#FF8A00', '#5b1f8a', '#d9700a', '#3b145c'], desc: 'Tierra de Halloween con calabazas.' },

    // Fondos de perfil: tu tarjeta de arriba, rectangular (Galaxia es el de siempre)
    { id: 'racha-galaxia', espacio: 'racha', nom: 'Galaxia', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'], desc: 'El morado de siempre del inicio.' },
    { id: 'racha-cielo', espacio: 'racha', nom: 'Cielo', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#1CB0F6', '#1588d0', '#1488c9', '#0f6fa6'], desc: 'Celeste como el cielo.' },
    { id: 'racha-menta', espacio: 'racha', nom: 'Menta', rareza: 'raro', regla: { tipo: 'racha', n: 7 }, tema: ['#14C46A', '#0e9a8a', '#12a96a', '#08705a'] },
    { id: 'racha-noche', espacio: 'racha', nom: 'Noche', rareza: 'epico', regla: { tipo: 'rango', n: 2 }, tema: ['#4a3bc4', '#1b1458', '#3d30a8', '#130e40'] },
    { id: 'racha-volcan', espacio: 'racha', nom: 'Volcán', rareza: 'epico', regla: { tipo: 'racha', n: 30 }, tema: ['#FF7A1A', '#c2271a', '#e05a12', '#8a1a0e'] },
    { id: 'racha-aurora', espacio: 'racha', nom: 'Aurora', rareza: 'legendario', regla: { tipo: 'racha', n: 100 }, tema: ['#7b3cff', '#1d9b8a', '#6a35d8', '#3b1d86'] },
    { id: 'racha-calabaza', espacio: 'racha', nom: 'Calabaza', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, tema: ['#FF8A00', '#5b1f8a', '#d9700a', '#3b145c'] },

    // Cuadro de racha (en tu perfil): su color y el de su fuego
    { id: 'cuadro-galaxia', espacio: 'cuadro', nom: 'Galaxia', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#5b34b8', '#241452', '#4a2a9a', '#1a0f40'], llama: ['#FF9600', '#FFD84D'], desc: 'El morado de siempre con su fuego naranja.' },
    { id: 'cuadro-cielo', espacio: 'cuadro', nom: 'Cielo', rareza: 'comun', regla: { tipo: 'gratis' }, tema: ['#1CB0F6', '#1588d0', '#1488c9', '#0f6fa6'], llama: ['#FF9600', '#FFD84D'], desc: 'Celeste con fuego naranja.' },
    { id: 'cuadro-menta', espacio: 'cuadro', nom: 'Menta', rareza: 'raro', regla: { tipo: 'racha', n: 7 }, tema: ['#14C46A', '#0e9a8a', '#12a96a', '#08705a'], llama: ['#FFC800', '#FFF3B0'], desc: 'Verde con un fuego dorado.' },
    { id: 'cuadro-hielo', espacio: 'cuadro', nom: 'Fuego azul', rareza: 'epico', regla: { tipo: 'racha', n: 30 }, tema: ['#1d3f8f', '#0b1a45', '#2a56b8', '#08123a'], llama: ['#3DB8FF', '#D6F4FF'], desc: 'El fuego más caliente es el azul.' },
    { id: 'cuadro-volcan', espacio: 'cuadro', nom: 'Volcán', rareza: 'epico', regla: { tipo: 'rango', n: 2 }, tema: ['#FF7A1A', '#c2271a', '#e05a12', '#8a1a0e'], llama: ['#FFE14D', '#FFFBE0'], desc: 'Lava con un fuego amarillo.' },
    { id: 'cuadro-aurora', espacio: 'cuadro', nom: 'Aurora', rareza: 'legendario', regla: { tipo: 'racha', n: 100 }, tema: ['#7b3cff', '#1d9b8a', '#6a35d8', '#3b1d86'], llama: ['#E27BFF', '#FFE0FF'], desc: 'Aurora con un fuego mágico.' },
    { id: 'cuadro-calabaza', espacio: 'cuadro', nom: 'Calabaza', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, tema: ['#FF8A00', '#5b1f8a', '#d9700a', '#3b145c'], llama: ['#7CFF4D', '#E6FFB3'], desc: 'Halloween con fuego de bruja.' },

    // Marcos de la foto
    { id: 'marco-ninguno', espacio: 'marco', nom: 'Sin marco', rareza: 'comun', regla: { tipo: 'gratis' }, marco: 'none' },
    { id: 'marco-lima', espacio: 'marco', nom: 'Lima', rareza: 'comun', regla: { tipo: 'gratis' }, marco: 'linear-gradient(135deg,#E4FF3A,#8fa300)' },
    { id: 'marco-hielo', espacio: 'marco', nom: 'Hielo', rareza: 'raro', regla: { tipo: 'racha', n: 7 }, marco: 'conic-gradient(from 200deg,#BDEBFF,#1CB0F6,#7DD3FC,#ffffff,#BDEBFF)' },
    { id: 'marco-fuego', espacio: 'marco', nom: 'Fuego', rareza: 'epico', regla: { tipo: 'racha', n: 30 }, marco: 'conic-gradient(from 210deg,#FFC800,#FF9600,#FF4B4B,#FFC800)' },
    { id: 'marco-oro', espacio: 'marco', nom: 'Rubí', rareza: 'epico', regla: { tipo: 'rango', n: 3 }, marco: 'conic-gradient(from 200deg,#FF8A9C,#FF2D4A,#A3061E,#FF8A9C)' },
    { id: 'marco-leyenda', espacio: 'marco', nom: 'Leyenda', rareza: 'legendario', regla: { tipo: 'rango', n: 4 }, marco: 'conic-gradient(from 200deg,#FFF0A0,#F5B400,#B05A00,#FFE27A,#FFF0A0)' },
    { id: 'marco-calabaza', espacio: 'marco', nom: 'Calabaza', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, marco: 'conic-gradient(from 200deg,#FF9600,#7b2fbf,#FF9600,#2a0f3d,#FF9600)' },

    // Títulos bajo tu nombre. Para uno con diseño agrega svg: 'nombre' y sube
    // assets/titulos/nombre.svg (con o sin fondo, puede ir animado; el texto en trazos)
    { id: 'titulo-cachimbo', espacio: 'titulo', nom: 'Cachimbo en camino', rareza: 'comun', regla: { tipo: 'gratis' } },
    { id: 'titulo-constante', espacio: 'titulo', nom: 'Constante', rareza: 'raro', regla: { tipo: 'racha', n: 7 } },
    { id: 'titulo-gemas', espacio: 'titulo', nom: 'Cazador de gemas', rareza: 'epico', regla: { tipo: 'rango', n: 2 } },
    { id: 'titulo-imparable', espacio: 'titulo', nom: 'Imparable', rareza: 'epico', regla: { tipo: 'racha', n: 30 } },
    { id: 'titulo-centenario', espacio: 'titulo', nom: 'Centenario', rareza: 'legendario', regla: { tipo: 'racha', n: 100 } },
    { id: 'titulo-leyenda', espacio: 'titulo', nom: 'Leyenda cachimba', rareza: 'legendario', regla: { tipo: 'rango', n: 4 } },
    { id: 'titulo-brujas', espacio: 'titulo', nom: 'Sobreviviente de Halloween', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN } },

    // Pines de eventos (hasta 3 en tu vitrina)
    { id: 'pin-superviviente', espacio: 'pines', nom: 'Superviviente', rareza: 'legendario', regla: { tipo: 'evento', evento: HALLOWEEN }, pin: ['👑', '#3a2a04', '#FFC800'] },
    { id: 'pin-calabaza', espacio: 'pines', nom: 'Calabaza', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, pin: ['🎃', '#2c1240', '#FF9600'] },
    { id: 'pin-murcielago', espacio: 'pines', nom: 'Murciélago', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, pin: ['🦇', '#2a1650', '#CE82FF'] },
    { id: 'pin-fantasma', espacio: 'pines', nom: 'Fantasma', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, pin: ['👻', '#14213f', '#A99FC8'] },
    { id: 'pin-telarana', espacio: 'pines', nom: 'Telaraña', rareza: 'evento', regla: { tipo: 'evento', evento: HALLOWEEN }, pin: ['🕸️', '#1d1a2e', '#6F6690'] }
  ];
  // Tu foto (o inicial) para dibujar «Mi foto»; la pone la página con fijarFoto
  var miFoto = { src: '', letra: '', nombre: '' };
  // Piso de cada fondo: la superficie donde se para el búho en el escenario del inicio.
  // Va con el fondo (viewBox 300×70, se estira al ancho del piso).
  var S = '<svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">';
  var PISOS = {
    'escena-galaxia': S + '<path d="M27 2h246l25 33-25 33H27L2 35z" fill="#FFC800"/><path d="M31 7h238l21 28-21 28H31L10 35z" fill="url(#mcp-g)"/>' +
      '<defs><linearGradient id="mcp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b3fd0"/><stop offset="1" stop-color="#25145a"/></linearGradient></defs>' +
      '<ellipse cx="150" cy="26" rx="95" ry="16" fill="rgba(255,220,150,.3)"/></svg>',
    'escena-nube': S + '<g fill="#cfe9fb"><ellipse cx="150" cy="44" rx="146" ry="22"/></g>' +
      '<g fill="#fff"><ellipse cx="150" cy="32" rx="140" ry="20"/><circle cx="52" cy="24" r="22"/><circle cx="98" cy="14" r="24"/><circle cx="150" cy="12" r="26"/><circle cx="204" cy="15" r="24"/><circle cx="250" cy="25" r="21"/></g>' +
      '<ellipse cx="150" cy="22" rx="90" ry="7" fill="#eaf6ff"/></svg>',
    'escena-cesped': S + '<path d="M10 28 Q150 60 290 28 L270 58 Q150 74 30 58z" fill="#7a4a24"/><path d="M30 50 Q150 66 270 50" stroke="#5c3518" stroke-width="5" fill="none"/>' +
      '<ellipse cx="150" cy="26" rx="142" ry="20" fill="#3fb24a"/><ellipse cx="150" cy="22" rx="128" ry="14" fill="#5fd35a"/>' +
      '<g fill="#3fb24a"><path d="M40 14l4-10 3 10z"/><path d="M70 9l3-8 3 8z"/><path d="M226 9l3-8 3 8z"/><path d="M256 14l4-10 3 10z"/></g>' +
      '<g fill="#fff"><circle cx="64" cy="26" r="3"/><circle cx="236" cy="27" r="3"/></g><g fill="#FFC800"><circle cx="64" cy="26" r="1.3"/><circle cx="236" cy="27" r="1.3"/></g></svg>',
    'escena-luna': S + '<path d="M8 30 Q150 70 292 30 L278 52 Q150 76 22 52z" fill="#3b3f63"/>' +
      '<ellipse cx="150" cy="28" rx="142" ry="20" fill="#9aa3c7"/><ellipse cx="150" cy="24" rx="126" ry="13" fill="#c3c9e6"/>' +
      '<g fill="#8a92b8"><ellipse cx="80" cy="26" rx="14" ry="5"/><ellipse cx="214" cy="22" rx="10" ry="4"/><ellipse cx="250" cy="31" rx="7" ry="3"/><ellipse cx="46" cy="32" rx="6" ry="2.5"/></g></svg>',
    'escena-volcan': S + '<path d="M8 30 Q150 70 292 30 L276 56 Q150 78 24 56z" fill="#1d0f0c"/>' +
      '<ellipse cx="150" cy="28" rx="143" ry="21" fill="#FF6a10" opacity=".55"/><ellipse cx="150" cy="27" rx="138" ry="18" fill="#3a1c14"/><ellipse cx="150" cy="24" rx="120" ry="12" fill="#4d2618"/>' +
      '<g stroke="#FF9a1f" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M60 26l18 4 14-6 16 5"/><path d="M190 22l16 6 14-3 22 6"/><path d="M130 33l14-4 12 5"/><path d="M60 50l10 6M230 50l-8 7M150 58v8"/></g></svg>',
    'escena-hielo': S + '<path d="M30 6h240l26 26-26 30H30L4 32z" fill="#bff3ff"/><path d="M34 11h232l20 21-20 24H34L14 32z" fill="url(#mcp-h)"/>' +
      '<defs><linearGradient id="mcp-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fdff"/><stop offset="1" stop-color="#5ec4e0"/></linearGradient></defs>' +
      '<g fill="#fff" opacity=".8"><path d="M60 14h40l-22 10z"/><path d="M180 14h30l-14 8z"/></g><path d="M34 56l232 0" stroke="#3aa0c4" stroke-width="3"/></svg>',
    'escena-calabaza': S + '<path d="M8 30 Q150 70 292 30 L276 56 Q150 76 24 56z" fill="#2a1240"/>' +
      '<ellipse cx="150" cy="27" rx="142" ry="20" fill="#4b2a14"/><ellipse cx="150" cy="24" rx="126" ry="13" fill="#6b3d1c"/>' +
      '<g><ellipse cx="40" cy="22" rx="16" ry="12" fill="#FF8A00"/><ellipse cx="40" cy="22" rx="6" ry="12" fill="#ffa53a"/><path d="M40 10l2-7" stroke="#3f8a1e" stroke-width="3"/>' +
      '<ellipse cx="262" cy="24" rx="13" ry="10" fill="#FF8A00"/><ellipse cx="262" cy="24" rx="5" ry="10" fill="#ffa53a"/><path d="M262 14l2-6" stroke="#3f8a1e" stroke-width="3"/></g></svg>'
  };
  // Por ahora salen solo estos (los pines, todos). Los demás quedan guardados para más adelante:
  // si alguien llevaba uno de ellos, vuelve a lo de siempre.
  var VISIBLES = ['buho-clasico', 'buho-antiguo', 'avatar-buho', 'avatar-foto', 'escena-galaxia', 'escena-nube',
    'racha-galaxia', 'racha-cielo', 'cuadro-galaxia', 'cuadro-cielo', 'marco-ninguno', 'marco-lima', 'titulo-cachimbo', 'titulo-constante'];
  CATALOGO = CATALOGO.filter(function (x) { return x.espacio === 'pines' || VISIBLES.indexOf(x.id) >= 0; });
  var POR_ID = {};
  CATALOGO.forEach(function (x) { POR_ID[x.id] = x; });

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function leer(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var CLAVE = 'mc_coleccion';

  // Estado: lo que tienes (mias), lo que llevas (puesto) y los datos para las reglas
  var E = { mias: {}, puesto: copiar(DEFECTO), mejorRacha: 0, maxRango: -1, sql: false, listo: false, rachaOk: false };
  var cache = leer(CLAVE);
  if (cache) { E.mias = cache.mias || {}; E.puesto = mezclar(cache.puesto); E.mejorRacha = cache.mejorRacha || 0; E.maxRango = cache.maxRango == null ? -1 : cache.maxRango; }
  function copiar(o) { return JSON.parse(JSON.stringify(o)); }
  function mezclar(p) { var r = copiar(DEFECTO); Object.keys(p || {}).forEach(function (k) { if (k in r) r[k] = p[k]; }); if (!Array.isArray(r.pines)) r.pines = []; return r; }
  var oyentes = [];
  function avisar() {
    guardar(CLAVE, { mias: E.mias, puesto: E.puesto, mejorRacha: E.mejorRacha, maxRango: E.maxRango });
    oyentes.forEach(function (fn) { try { fn(E); } catch (e) {} });
  }

  function tiene(id) {
    var x = POR_ID[id]; if (!x) return false;
    if (E.mias[id]) return true;
    var r = x.regla;
    if (r.tipo === 'gratis') return true;
    if (r.tipo === 'racha') return E.mejorRacha >= r.n;
    if (r.tipo === 'rango') return E.maxRango >= r.n;
    return false;
  }
  // Cuánto falta (0 a 1) para las reglas que se pueden medir
  function avance(id) {
    var r = (POR_ID[id] || {}).regla || {};
    if (r.tipo === 'racha') return Math.min(1, E.mejorRacha / r.n);
    if (r.tipo === 'rango') return Math.min(1, (E.maxRango + 1) / (r.n + 1));
    return null;
  }
  function como(x) {
    var r = x.regla, ok = tiene(x.id);
    if (r.tipo === 'gratis') return 'Viene con tu cuenta.';
    if (r.tipo === 'racha') return ok ? 'Lo ganaste al llegar a ' + r.n + ' días de racha.' : 'Llega a una racha de ' + r.n + ' días (tu mejor: ' + E.mejorRacha + ').';
    if (r.tipo === 'rango') return ok ? 'Lo ganaste al llegar a ' + RANGO[r.n] + ' en una semana.' : 'Llega a ' + RANGO[r.n] + ' en una semana (' + (window.MCRango ? String(MCRango.minimo[r.n]).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' XP' : '') + ').';
    if (r.tipo === 'evento') return ok ? 'Lo ganaste en ' + r.evento + '. Es tuyo para siempre.' : 'Se ganaba en ' + r.evento + '.';
    return ok ? 'Un regalo de Modo Cachimbo.' : 'Es un regalo especial: no se puede conseguir solo.';
  }
  function puesto(esp) {
    var p = E.puesto[esp];
    if (esp === 'pines') return (p || []).filter(tiene);
    return p && tiene(p) ? p : DEFECTO[esp];
  }

  /* ---------- Carga: SQL de la colección, racha y rangos ---------- */
  var pedido = null;
  function cargar() {
    if (pedido) return pedido;
    if (!window.MCAuth) return Promise.resolve(E);
    pedido = MCAuth.listo.then(function (c) {
      var u = MCAuth.usuario();
      if (!u) return;
      return Promise.all([
        c.rpc('mi_coleccion').then(function (r) {
          if (r.error) throw r.error;
          var d = r.data || {};
          E.sql = true; E.mias = {};
          (d.mias || []).forEach(function (m) { E.mias[m.item] = m.origen || 'regalo'; });
          if (d.puesto) E.puesto = mezclar(d.puesto);
        }).catch(function () { E.sql = false; }),
        c.from('xp_semana').select('semana,xp').eq('usuario', u.id).limit(200).then(function (r) {
          var max = -1, MIN = window.MCRango ? MCRango.minimo : [20, 1500, 4000, 8000, 12000];
          ((!r.error && r.data) || []).forEach(function (f) { for (var i = MIN.length - 1; i >= 0; i--) if (+f.xp >= MIN[i]) { max = Math.max(max, i); break; } });
          E.maxRango = max;
        }).catch(function () {})
      ]);
    }).then(function () { E.listo = true; avisar(); return E; }, function () { E.listo = true; avisar(); return E; });
    // La mejor racha llega con assets/racha.js
    (function esperar(i) {
      if (window.MCRacha) MCRacha.alCambiar(function (r) {
        if (!r) return;
        var m = Math.max(r.mejor || 0, r.actual || 0), antes = E.rachaOk;
        E.rachaOk = true;
        if (m !== E.mejorRacha || !antes) { E.mejorRacha = m; avisar(); }
      });
      else if (i < 100) setTimeout(function () { esperar(i + 1); }, 150);
      else { E.rachaOk = true; avisar(); }
    })(0);
    return pedido;
  }

  // Ponerse algo (o quitarse un pin). Se guarda en la cuenta si existe el SQL.
  function poner(esp, id) {
    if (!tiene(id) || !POR_ID[id] || POR_ID[id].espacio !== esp) return Promise.reject(new Error('no-tienes'));
    var antes = copiar(E.puesto);
    if (esp === 'pines') {
      var l = puesto('pines').slice(), i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else { l.push(id); if (l.length > 3) l.shift(); }
      E.puesto.pines = l;
    } else E.puesto[esp] = id;
    avisar();
    if (!E.sql || !window.MCAuth) return Promise.resolve(E);
    return MCAuth.listo.then(function (c) { return c.rpc('ponerme', { p_espacio: esp, p_item: id }); }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data && r.data.puesto) { E.puesto = mezclar(r.data.puesto); avisar(); }
      return E;
    }).catch(function (e) { E.puesto = antes; avisar(); throw e; });
  }

  /* ---------- Dibujos ---------- */
  function buhoImg(x, animo) {
    if (x.img) return '<img src="' + esc(D + x.img + '-' + (animo || 'feliz') + '.webp') + '" alt="" loading="lazy">';
    // El antiguo: el búho del logo (assets/buho.js)
    if (x.id === 'buho-antiguo' && window.MCBuho) return '<span class="mcc-antiguo">' + MCBuho.svg(animo === 'triste' ? 'triste' : 'feliz', 160) + '</span>';
    // El clásico es el mismo búho animado del inicio (si la página trae assets/buho/buho-vivo.js)
    if (x.id === 'buho-clasico' && window.MCBuhoVivo && window.MCBuhoDatos) return MCBuhoVivo.crear(animo === 'triste' ? 'triste' : 'vivo').outerHTML;
    if (window.MCBuho) return MCBuho.svg(animo === 'triste' ? 'triste' : 'feliz', 160);
    return '<img src="' + esc(BASE + 'assets/app/icono-192.png') + '" alt="">';
  }
  function dibujo(x) {
    if (x.espacio === 'buho') return buhoImg(x);
    // Escenario: un mini escenario con su piso
    if (x.espacio === 'escena') return '<span class="mcc-esc" style="--r1:' + x.tema[0] + ';--r2:' + x.tema[3] + '">' + PISOS[x.id].replace(/mcp-([gh])/g, 'mcp-$1-' + x.id) + '<img class="mcc-esc-b" src="' + esc(D.replace(/disfraces\/$/, 'avatar/') + 'clasico-cuerpo.webp') + '" alt="" loading="lazy"></span>';
    // Fondo de perfil: una mini tarjeta como la de arriba
    if (x.espacio === 'racha') return '<span class="mcc-fp" style="--r1:' + x.tema[0] + ';--r2:' + x.tema[3] + '"><span class="mcc-fp-c"><i' + (avatarSrc() || miFoto.src ? ' style="background-image:url(&quot;' + esc(avatarSrc() || miFoto.src) + '&quot;)"' : '') + '>' + (avatarSrc() || miFoto.src ? '' : esc(miFoto.letra)) + '</i><b>' + esc(miFoto.nombre || 'Tu nombre') + '</b><small>Tu rango</small></span></span>';
    // Cuadro de racha: uno chiquito con su fuego
    if (x.espacio === 'cuadro') { var l = x.llama; return '<span class="mcc-cr" style="--r1:' + x.tema[0] + ';--r2:' + x.tema[1] + ';--rb:' + x.tema[2] + ';--rd:' + x.tema[3] + '"><span class="mcc-cr-c">' + llama(l) + '<b>7</b><i></i><i></i><i></i></span></span>'; }
    if (x.espacio === 'avatar') return avatarSvg(x, miFoto.src, miFoto.letra);
    if (x.espacio === 'marco') return '<span class="mcc-marco" style="--m:' + (x.marco === 'none' ? 'transparent' : x.marco) + '"><span>' + (window.MCBuho ? MCBuho.svg('normal', 80) : '') + '</span></span>';
    if (x.espacio === 'titulo') return '<span class="mcc-titulo">' + (x.svg ? tituloHtml(x) : '<span>★ ' + esc(x.nom) + '</span>') + '</span>';
    if (x.espacio === 'pines') return pinSvg(x);
    return '';
  }
  // El título como texto, o su dibujo si tiene svg
  function tituloHtml(x) {
    if (!x) return '';
    return x.svg ? '<img class="mc-tsvg" src="' + esc(BASE + 'assets/titulos/' + x.svg + '.svg') + '" alt="' + esc(x.nom) + '" title="' + esc(x.nom) + '">' : esc(x.nom);
  }
  function llama(l) { return '<svg viewBox="0 0 32 36" aria-hidden="true"><path fill="' + l[0] + '" d="M16 1.5c1.2 4.6 7.6 8.2 9.6 13.6 2.6 7-1.6 17.4-9.6 17.4S3.8 24.9 6.1 17.6c1-3.2 3.3-5.3 4.9-6.9.2 2.8 1.4 4.6 3 5.2C13.3 10.6 14 6 16 1.5z"/><path fill="' + l[1] + '" d="M16.3 15.5c.6 2.4 4.5 4.4 4.5 8.6a4.8 4.8 0 0 1-9.6 0c0-2 1-3.4 2.1-4.4.2 1.4.8 2.3 1.6 2.6-.4-2.4 0-4.6 1.4-6.8z"/></svg>'; }
  // Foto de perfil: el dibujo del búho o tu foto (o tu inicial) sobre tu fondo
  function avatarSrc(id) { var x = POR_ID[id || puesto('avatar')]; return x && x.av ? D.replace(/disfraces\/$/, 'avatar/') + x.av + '.webp' : ''; }
  function avatarSvg(x, foto, letra) {
    var t = (POR_ID[puesto('racha')] || POR_ID['racha-galaxia']).tema;
    var src = x.av ? avatarSrc(x.id) : foto;
    return '<span class="mcc-av" style="--f1:' + t[0] + ';--f2:' + t[3] + '">' + (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<b>' + esc(letra || '?') + '</b>') + '</span>';
  }
  function pinSvg(x) {
    return '<span class="mcc-pin" style="--pf:' + x.pin[1] + ';--pb:' + x.pin[2] + '"><span>' + x.pin[0] + '</span></span>';
  }
  function tarjeta(x, i) {
    var ok = tiene(x.id), R = RAREZA[x.rareza] || RAREZA.comun, av = ok ? null : avance(x.id);
    var lleva = x.espacio === 'pines' ? puesto('pines').indexOf(x.id) >= 0 : puesto(x.espacio) === x.id;
    var nuevo = ok && !vistos()[x.id] && vistosIniciado();
    return '<button type="button" class="mcc-it' + (ok ? '' : ' lock') + (lleva ? ' mcc-on' : '') + ' e-' + x.espacio + '" data-id="' + x.id + '" style="--c:' + R.c + ';--i:' + (i || 0) + '">' +
      (x.regla.tipo === 'evento' ? '<span class="mcc-cinta">' + esc(x.regla.cinta || (x.regla.evento === HALLOWEEN ? 'Halloween' : 'Evento')) + '</span>' : '') +
      (nuevo && !lleva ? '<span class="mcc-etq nuevo">Nuevo</span>' : '') +
      '<span class="mcc-dib">' + dibujo(x) + '</span>' +
      (ok ? '' : '<span class="mcc-cand"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>') +
      '<b>' + esc(x.nom) + '</b><small>' + R.nom + (x.area ? ' · ' + esc(x.area.replace('Ciencia y Tecnología', 'CyT').replace('Ciencias Sociales', 'Sociales')) : '') + '</small>' +
      // Abajo siempre la misma fila, para que todos los cuadros midan igual
      '<span class="mcc-pie">' + (!ok ? (av != null ? '<span class="mcc-prog"><i style="width:' + Math.round(av * 100) + '%"></i></span>' : '<span class="mcc-usar no">Bloqueado</span>')
        : lleva ? (x.espacio === 'pines' ? '<span class="mcc-usar gris" data-usar>Quitar</span>' : '<span class="mcc-usar on">En uso</span>')
        : '<span class="mcc-usar" data-usar>Usar</span>') + '</span>' +
      '</button>';
  }

  // Objetos que ya viste (para la etiqueta Nuevo y la animación de "ganaste algo")
  var KV = 'mc_coleccion_vistos';
  function vistos() { return leer(KV) || {}; }
  function vistosIniciado() { return !!leer(KV); }
  function marcarVistos(ids) { var v = vistos(); ids.forEach(function (id) { v[id] = 1; }); guardar(KV, v); }
  // Lo que tienes y aún no viste. La primera vez todo cuenta como visto (no salen 20 cofres juntos).
  function nuevos() {
    if (!E.listo || !E.rachaOk) return [];
    var mios = CATALOGO.filter(function (x) { return tiene(x.id); }).map(function (x) { return x.id; });
    if (!vistosIniciado()) { marcarVistos(mios); return []; }
    var v = vistos();
    return mios.filter(function (id) { return !v[id]; });
  }

  /* ---------- Estilos compartidos (perfil y colección) ---------- */
  function css() {
    if (document.getElementById('mcc-css')) return;
    var st = document.createElement('style'); st.id = 'mcc-css';
    st.textContent =
      '.mcc-it{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px;padding:10px 8px 12px;border-radius:18px;cursor:pointer;font:inherit;color:#EEEAF7;' +
      'background:linear-gradient(180deg,rgba(var(--c),.22),rgba(var(--c),.03) 70%),#151127;border:2.5px solid rgba(var(--c),.85);border-bottom-width:5px;overflow:hidden;-webkit-tap-highlight-color:transparent;' +
      'animation:mccEntra .45s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(var(--i) * 40ms);transition:transform .1s}' +
      '.mcc-it:active{transform:translateY(2px)}' +
      '.mcc-it:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
      '.mcc-it b{font-size:14.5px;font-weight:900;line-height:1.15;margin-top:4px}' +
      '.mcc-it small{font-size:10.5px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:rgb(var(--c))}' +
      '.mcc-it.mcc-on{border-color:#C6E000;box-shadow:0 0 22px rgba(198,224,0,.3)}' +
      '.mcc-dib{width:100%;aspect-ratio:1;display:grid;place-items:center}' +
      '.mcc-dib img,.mcc-dib>svg{width:100%;height:100%;object-fit:contain;display:block}' +
      '.mcc-antiguo{display:block;width:84%;margin:0 auto}.mcc-antiguo svg{width:100%;height:auto;display:block}' +
      '.mcc-it.lock .mcc-dib{filter:grayscale(1) brightness(.4)}' +
      '.mcc-it.lock b{color:#A99FC8}' +
      '.mcc-cand{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;background:rgba(11,8,24,.82);display:grid;place-items:center;border:2px solid rgba(255,255,255,.25)}' +
      '.mcc-cand svg{width:18px;height:18px}' +
      '.mcc-etq{position:absolute;left:8px;top:8px;z-index:2;font-size:10.5px;font-weight:1000;text-transform:uppercase;letter-spacing:.5px;padding:3px 8px;border-radius:8px;background:#C6E000;color:#1a1f00}' +
      '.mcc-etq.nuevo{background:#FF4B4B;color:#fff;animation:mccLate 1.4s ease-in-out infinite}' +
      '.mcc-cinta{position:absolute;right:-32px;top:13px;z-index:2;transform:rotate(40deg);background:rgb(var(--c));color:#fff;font-size:9px;font-weight:1000;padding:3px 32px;text-transform:uppercase;letter-spacing:.5px}' +
      '.mcc-it .mcc-dib{flex:none}' +
      '.mcc-pie{margin-top:auto;padding-top:8px;width:100%;height:38px;display:flex;align-items:flex-end;justify-content:center}' +
      '.mcc-usar{display:block;width:88%;padding:6px 0 5px;border-radius:11px;font-size:12.5px;font-weight:1000;text-transform:uppercase;letter-spacing:.6px;background:#C6E000;color:#1a1f00;box-shadow:0 3px 0 #8fa300}' +
      '.mcc-usar:hover{filter:brightness(1.08)}' +
      '.mcc-usar.on{background:none;color:#C6E000;box-shadow:inset 0 0 0 2px #C6E000}' +
      '.mcc-usar.gris{background:#2A2346;color:#EEEAF7;box-shadow:0 3px 0 #1a1530}' +
      '.mcc-usar.no{background:none;color:#6F6690;box-shadow:none}' +
      '.mcc-esc{position:relative;width:92%;aspect-ratio:1.15;border-radius:16px;overflow:hidden;display:block;background:radial-gradient(120% 90% at 50% 25%,var(--r1),var(--r2) 50%,#0b0818 92%);box-shadow:inset 0 -4px 0 rgba(0,0,0,.25)}' +
      '.mcc-esc svg{position:absolute;left:14%;right:14%;bottom:12%;width:72%;height:24%}' +
      '.mcc-it .mcc-esc img.mcc-esc-b,.mcc-esc img.mcc-esc-b{position:absolute;left:50%;bottom:27%;width:34%;height:auto;translate:-50% 0;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}' +
      '.mcc-fp{width:100%;aspect-ratio:1.25;display:grid;place-items:center}' +
      '.mcc-cr{width:100%;aspect-ratio:1.25;display:grid;place-items:center}' +
      '.mcc-cr-c{position:relative;overflow:hidden;display:flex;align-items:center;gap:6px;width:90%;padding:14px 12px;border-radius:14px;color:#fff;background:linear-gradient(135deg,var(--r1),var(--r2));border:2px solid var(--rb);border-bottom:4px solid var(--rd)}' +
      '.mcc-cr-c svg{width:26px;height:30px;flex:none;filter:drop-shadow(0 1px 0 rgba(0,0,0,.25))}' +
      '.mcc-cr-c b{font:900 28px/1 "Barlow Condensed","Arial Narrow",sans-serif;margin-right:auto}' +
      '.mcc-cr-c i{width:11px;height:11px;border-radius:50%;background:rgba(0,0,0,.25);border:2px solid rgba(255,255,255,.3)}' +
      '.mcc-fp-c{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:7px;align-items:center;width:94%;padding:8px 22px 8px 8px;text-align:left;clip-path:polygon(0 0,100% 0,88% 100%,0 100%);' +
        'background:linear-gradient(90deg,rgba(11,8,24,.7),rgba(11,8,24,.3) 65%,rgba(11,8,24,0)),radial-gradient(1.5px 1.5px at 30% 30%,#fff 50%,transparent),radial-gradient(1px 1px at 70% 70%,#fff 50%,transparent),radial-gradient(120% 140% at 85% 0%,var(--r1),var(--r2) 60%,#0d0820)}' +
      '.mcc-fp-c i{grid-row:1/3;width:34px;height:34px;border-radius:9px;display:grid;place-items:center;font:900 16px/1 Nunito,sans-serif;font-style:normal;color:#151A03;background:#C6E000 center/cover}' +
      '.mcc-fp-c b{font:800 15px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#fff;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.mcc-fp-c small{font:800 11px/1 "Barlow Condensed","Arial Narrow",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#cfc8e6!important}' +
      '.mcc-av{width:72%;aspect-ratio:1;border-radius:22%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(120% 120% at 80% 0%,var(--f1),var(--f2) 70%,#0d0820);box-shadow:inset 0 -5px 0 rgba(0,0,0,.25)}' +
      '.mcc-av img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.mcc-av b{font:900 min(48px,12vw)/1 Nunito,sans-serif;color:#fff}' +
      '.mcc-prog{display:block;width:84%;height:6px;border-radius:9px;background:rgba(255,255,255,.1);margin-top:6px;overflow:hidden}.mcc-prog i{display:block;height:100%;background:rgb(var(--c));border-radius:9px}' +
      '.mcc-tema{position:relative;width:86%;aspect-ratio:1.25;border-radius:18px;background:linear-gradient(135deg,var(--r1),var(--r2));display:flex;flex-wrap:wrap;align-content:flex-end;justify-content:center;gap:5px;padding:10px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.2)}' +
      '.mcc-tema svg{position:absolute;left:12px;top:10px;width:26px;height:30px}' +
      '.mcc-tema i{width:17%;aspect-ratio:1;border-radius:50%;background:#FF9600;box-shadow:inset 0 -2px 0 #c76a00}.mcc-tema i:last-child{background:rgba(0,0,0,.22);box-shadow:none}' +
      '.mcc-marco{width:72%;aspect-ratio:1;border-radius:30%;padding:6%;background:var(--m);display:block}' +
      '.mcc-marco>span{display:grid;place-items:center;width:100%;height:100%;border-radius:26%;background:#1D1834;overflow:hidden;border:2px dashed rgba(255,255,255,.12)}' +
      '.mcc-marco svg{width:80%;height:80%}' +
      '.mcc-titulo{width:100%;height:100%;display:grid;place-items:center}' +
      '.mcc-titulo .mc-tsvg{display:block;max-width:94%;max-height:60%}' +
      '.mcc-titulo span{font-size:12.5px;font-weight:1000;color:rgb(var(--c));background:rgba(var(--c),.12);border:1.5px solid rgba(var(--c),.55);border-radius:999px;padding:5px 10px;max-width:96%}' +
      '.mcc-pin{width:74%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.25),transparent 45%),var(--pf);border:5px solid var(--pb);box-shadow:inset 0 -6px 0 rgba(0,0,0,.25),0 4px 0 rgba(0,0,0,.3)}' +
      '.mcc-pin span{font-size:min(44px,11vw);line-height:1}' +
      '@keyframes mccEntra{from{opacity:0;transform:translateY(16px) scale(.92)}to{opacity:1;transform:none}}' +
      '@keyframes mccLate{50%{transform:scale(1.1)}}' +
      '@media (prefers-reduced-motion:reduce){.mcc-it,.mcc-etq.nuevo{animation:none}}';
    document.head.appendChild(st);
  }

  /* ---------- Animación: ¡ganaste algo! ---------- */
  function celebrar(ids, alPoner) {
    css();
    if (!ids.length) return;
    var x = POR_ID[ids[0]], R = RAREZA[x.rareza] || RAREZA.comun;
    var d = document.createElement('div'); d.className = 'mcc-gana'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.setProperty('--c', R.c);
    var conf = ''; var col = ['#C6E000', '#FF9600', '#1CB0F6', '#CE82FF', '#FFC800'];
    for (var i = 0; i < 24; i++) conf += '<i style="left:' + ((i * 37) % 100) + '%;background:' + col[i % 5] + ';animation-delay:' + (i % 8) * 60 + 'ms;--r:' + (i * 47) + 'deg"></i>';
    var esp = ESPACIOS.filter(function (e) { return e.id === x.espacio; })[0];
    d.innerHTML = '<div class="mcc-gana-c"><div class="mcc-rayos"></div><div class="mcc-conf">' + conf + '</div>' +
      '<div class="mcc-cofre" aria-hidden="true">🎁</div>' +
      '<div class="mcc-gana-it"><span class="mcc-dib">' + dibujo(x) + '</span></div>' +
      '<small>' + R.nom + ' · ' + esp.uno + '</small><h2>' + esc(x.nom) + '</h2><p>' + esc(como(x)) + '</p>' +
      '<div class="mcc-gana-bt"><button type="button" class="si">' + (x.espacio === 'pines' ? 'A mi vitrina' : 'Ponérmelo') + '</button><button type="button" class="no">' + (ids.length > 1 ? 'Siguiente' : 'Después') + '</button></div></div>';
    if (!document.getElementById('mcc-gana-css')) {
      var st = document.createElement('style'); st.id = 'mcc-gana-css';
      st.textContent =
        '.mcc-gana{position:fixed;inset:0;z-index:9999;background:rgba(8,6,18,.88);display:grid;place-items:center;padding:20px;opacity:0;transition:opacity .3s;font-family:Nunito,sans-serif}' +
        '.mcc-gana.ver{opacity:1}' +
        '.mcc-gana-c{position:relative;width:min(360px,100%);text-align:center;color:#EEEAF7;padding:24px 18px 20px;border-radius:26px;overflow:hidden;background:radial-gradient(circle at 50% 36%,rgba(var(--c),.45),#0B0818 64%);border:2.5px solid rgba(var(--c),.8);border-bottom-width:6px}' +
        '.mcc-rayos{position:absolute;left:50%;top:36%;width:640px;height:640px;margin:-320px 0 0 -320px;border-radius:50%;background:repeating-conic-gradient(rgba(var(--c),.25) 0 8deg,transparent 8deg 20deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 58%);mask:radial-gradient(circle,#000 18%,transparent 58%);animation:mccGira 14s linear infinite}' +
        '.mcc-cofre{position:absolute;left:50%;top:110px;font-size:96px;transform:translateX(-50%);animation:mccCofre 1s ease-in both;filter:drop-shadow(0 0 24px rgba(var(--c),.9))}' +
        '.mcc-gana-it{position:relative;width:190px;margin:0 auto;animation:mccSale .6s cubic-bezier(.2,1.5,.4,1) .9s both}' +
        '.mcc-gana-it .mcc-dib{display:grid;place-items:center;aspect-ratio:1}' +
        '.mcc-gana-it .mcc-dib img,.mcc-gana-it .mcc-dib>svg{width:100%;height:100%;object-fit:contain}' +
        '.mcc-gana-it .mcc-titulo span{font-size:17px}' +
        '.mcc-gana small{position:relative;display:block;margin-top:8px;font-size:12px;font-weight:1000;letter-spacing:2px;text-transform:uppercase;color:rgb(var(--c))}' +
        '.mcc-gana h2{position:relative;font:italic 900 34px/1 "Barlow Condensed","Arial Narrow",sans-serif;text-transform:uppercase;margin-top:2px}' +
        '.mcc-gana p{position:relative;color:#A99FC8;font-size:13.5px;font-weight:700;margin:6px auto 0;max-width:280px;line-height:1.45}' +
        '.mcc-gana small,.mcc-gana h2,.mcc-gana p,.mcc-gana-bt{animation:mccSube .4s ease-out 1.2s both}' +
        '.mcc-gana-bt{position:relative;display:flex;gap:8px;justify-content:center;margin-top:16px}' +
        '.mcc-gana-bt button{font:1000 13.5px Nunito,sans-serif;text-transform:uppercase;letter-spacing:.5px;border-radius:14px;padding:12px 16px;border:2px solid;border-bottom-width:5px;cursor:pointer}' +
        '.mcc-gana-bt .si{background:#C6E000;color:#1a1f00;border-color:#8fa300}.mcc-gana-bt .no{background:#1D1834;color:#A99FC8;border-color:#352E58}' +
        '.mcc-conf{position:absolute;inset:0;pointer-events:none}.mcc-conf i{position:absolute;top:-12px;width:8px;height:14px;border-radius:2px;animation:mccCae 2.2s ease-in 1s both}' +
        '@keyframes mccGira{to{transform:rotate(360deg)}}' +
        '@keyframes mccCofre{0%{transform:translateX(-50%) scale(.4);opacity:0}25%{transform:translateX(-50%) scale(1);opacity:1}35%,55%,75%{transform:translateX(-52%) rotate(-8deg)}45%,65%{transform:translateX(-48%) rotate(8deg)}90%{transform:translateX(-50%) scale(1.25);opacity:1}100%{transform:translateX(-50%) scale(1.6);opacity:0}}' +
        '@keyframes mccSale{from{transform:scale(.2) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}' +
        '@keyframes mccSube{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}' +
        '@keyframes mccCae{0%{transform:translateY(0) rotate(var(--r));opacity:1}100%{transform:translateY(560px) rotate(calc(var(--r) + 540deg));opacity:0}}' +
        '@media (prefers-reduced-motion:reduce){.mcc-rayos,.mcc-conf{display:none}.mcc-cofre{display:none}.mcc-gana-it,.mcc-gana small,.mcc-gana h2,.mcc-gana p,.mcc-gana-bt{animation:none}}';
      document.head.appendChild(st);
    }
    document.body.appendChild(d);
    if (window.MCSonido && MCSonido.racha) setTimeout(function () { try { MCSonido.racha(); } catch (e) {} }, 900);
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
    function cerrar(sig) {
      marcarVistos([x.id]);
      d.classList.remove('ver');
      setTimeout(function () { d.remove(); if (sig) celebrar(ids.slice(1), alPoner); }, 300);
    }
    d.querySelector('.si').addEventListener('click', function () {
      poner(x.espacio, x.id).then(function () { if (alPoner) alPoner(x); }, function () {});
      cerrar(true);
    });
    d.querySelector('.no').addEventListener('click', function () { cerrar(true); });
  }

  window.MCColeccion = {
    catalogo: CATALOGO, espacios: ESPACIOS, rareza: RAREZA, defecto: DEFECTO,
    item: function (id) { return POR_ID[id]; },
    items: function (esp) { return CATALOGO.filter(function (x) { return !esp || x.espacio === esp; }); },
    estado: function () { return E; },
    cargar: cargar, tiene: tiene, avance: avance, como: como, puesto: puesto, poner: poner,
    alCambiar: function (fn) { oyentes.push(fn); },
    tarjeta: tarjeta, dibujo: dibujo, buho: buhoImg, pin: pinSvg, css: css,
    avatar: avatarSrc, avatarHtml: avatarSvg,
    piso: function (id) { return PISOS[id || puesto('escena')] || ''; },
    escena: function (id) { var x = POR_ID[id || puesto('escena')]; return x && x.tema || POR_ID['escena-galaxia'].tema; },
    fijarFoto: function (src, letra, nombre) { miFoto = { src: /^https:\/\//.test(src || '') ? src : '', letra: letra || '', nombre: nombre || miFoto.nombre || '' }; },
    tema: function (id) { var x = POR_ID[id || puesto('racha')]; return x && x.tema || POR_ID['racha-galaxia'].tema; },
    // Cuadro de racha: { tema: [4 colores], llama: [2 colores] }
    cuadro: function (id) { var x = POR_ID[id || puesto('cuadro')]; if (!x || x.espacio !== 'cuadro') x = POR_ID['cuadro-galaxia']; return { tema: x.tema, llama: x.llama }; },
    llama: llama, titulo: tituloHtml,
    marco: function (id) { var x = POR_ID[id || puesto('marco')]; return x && x.marco !== 'none' ? x.marco : ''; },
    nuevos: nuevos, marcarVistos: marcarVistos, celebrar: celebrar,
    contar: function () { var n = 0; CATALOGO.forEach(function (x) { if (tiene(x.id)) n++; }); return { tengo: n, total: CATALOGO.length }; }
  };
})();

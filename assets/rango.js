/* =========================================================
   Modo Cachimbo · Rangos de la semana
   El rango sale del XP de la semana (xp_semana de supabase/16-corazones.sql)
   y se reinicia cada lunes. Cada rango tiene sus niveles (I, II, III…):
     Bronce · Plata · Esmeralda · Zafiro · Amatista · Leyenda · Mítico
   El XP mínimo de cada nivel y sus colores están en RANGOS; los emblemas
   son las imágenes de assets/rangos/<rango>-<nivel>.webp.
   - MCRango.svg(n, {mini}): el emblema del nivel n (0 = Bronce I).
   - MCRango.grupos(): los rangos con el primer y último nivel de cada uno.
   - En el inicio: tarjeta "Tu rango esta semana" antes de "Empezar a practicar"
     y la pantalla de subida cuando pasas a un nivel nuevo.
   - En el perfil: el emblema junto a tu nombre y un emblema chico en cada fila
     del ranking. La vitrina de semanas (tus filas de xp_semana) está en coleccion.html.
   ========================================================= */
(function () {
  if (window.MCRango) return;
  // c: texto · t: fondo · b: borde · o: barra; min: XP de la semana para cada nivel
  var RANGOS = [
    { id: 'bronce', nom: 'Bronce', c: '#E8A878', t: '#3a1e0e', b: '#9A5A30', o: '#7A3A1C', min: [20, 150, 300] },
    { id: 'plata', nom: 'Plata', c: '#D6DEEA', t: '#262c3a', b: '#8A96AA', o: '#5A6478', min: [500, 750, 1000] },
    { id: 'esmeralda', nom: 'Esmeralda', c: '#5FF59A', t: '#06361a', b: '#0FA845', o: '#0FA845', min: [1300, 1600, 1900, 2200] },
    { id: 'zafiro', nom: 'Zafiro', c: '#5FDAFF', t: '#06304a', b: '#1A6CC0', o: '#123FC0', min: [2600, 3000, 3500, 4000, 4500] },
    { id: 'amatista', nom: 'Amatista', c: '#D79BFF', t: '#2a1050', b: '#8A36E0', o: '#8A36E0', min: [5000, 5600, 6200, 6900, 7600] },
    { id: 'leyenda', nom: 'Leyenda', c: '#FF7AD9', t: '#3e0a34', b: '#C0399E', o: '#E3263F', min: [9000, 11000, 13500, 16500, 20000] },
    { id: 'mitico', nom: 'Mítico', c: '#FFC800', t: '#3e2400', b: '#D08A00', o: '#E3263F', min: [25000, 26500, 28000] }
  ];
  var ROM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  // Todo en una lista de niveles: n = 0 es Bronce I, el último es Mítico III
  var MIN = [], NOM = [], TXT = [], TINTE = [], BORDE = [], OSC = [], IMG = [], GRUPOS = [];
  RANGOS.forEach(function (r) {
    GRUPOS.push({ nom: r.nom, desde: MIN.length, hasta: MIN.length + r.min.length - 1, c: r.c, t: r.t, b: r.b });
    r.min.forEach(function (m, k) {
      MIN.push(m); NOM.push(r.nom + ' ' + ROM[k]); IMG.push(r.id + '-' + (k + 1) + '.webp');
      TXT.push(r.c); TINTE.push(r.t); BORDE.push(r.b); OSC.push(r.o);
    });
  });
  var TOP = MIN.length - 1;
  // Las imágenes están junto a este archivo (sirve igual desde panel/)
  var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^\/]*$/, '') + 'rangos/' : 'assets/rangos/'; })();

  // -1 = todavía sin rango (menos de 20 XP en la semana)
  function nivel(xp) { var n = -1; for (var i = 0; i < MIN.length; i++) if ((+xp || 0) >= MIN[i]) n = i; return n; }
  function miles(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- El emblema ---------- */
  function svg(n, o) {
    n = Math.max(0, Math.min(TOP, n | 0));
    css();
    return '<img class="mc-rgo-em" src="' + BASE + IMG[n] + '" alt="Rango ' + NOM[n] + '" decoding="async"' + (o && o.mini ? ' loading="lazy"' : '') + '>';
  }

  /* ---------- Estilos ---------- */
  function css() {
    if (document.getElementById('mc-rango-css')) return;
    var st = document.createElement('style'); st.id = 'mc-rango-css';
    st.textContent =
      '.mc-rgo-em{display:block;width:100%;height:auto;overflow:visible}' +
      '.mc-rgo-em{aspect-ratio:1;object-fit:contain;filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))}' +
      // Tarjeta del inicio
      '.mc-rgo{display:flex;align-items:center;gap:14px;width:100%;margin:14px 0 2px;padding:10px 14px 12px 8px;border:2px solid #2F284E;border-bottom-width:5px;border-radius:18px;background:radial-gradient(120% 140% at 0% 50%,var(--rg-t) 0%,#19142E 55%);color:#f2f2f2;text-decoration:none;font-family:Nunito,sans-serif;box-sizing:border-box}' +
      '.mc-rgo:focus-visible{outline:3px solid var(--rg-c);outline-offset:2px}' +
      '.mc-rgo-ic{width:84px;flex:none}.mc-rgo-ic.bloq{filter:grayscale(1) brightness(.45)}.mc-rgo.sin .mc-rgo-tx b{color:#9a9a9a}' +
      '.mc-rgo-tx{flex:1;min-width:0}' +
      '.mc-rgo-tx small{display:block;font:900 11px Nunito,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9a9a9a}' +
      '.mc-rgo-tx b{display:block;font:1000 21px Nunito,sans-serif;color:var(--rg-c);line-height:1.15}' +
      '.mc-rgo-bar{height:12px;border-radius:8px;background:#292245;border:2px solid #312A51;margin-top:7px;overflow:hidden}' +
      '.mc-rgo-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(180deg,var(--rg-c),var(--rg-o));position:relative;overflow:hidden}' +
      '.mc-rgo-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.75) 50%,transparent 70%);animation:mcRgoBarra 5s ease-in-out infinite}' +
      '@keyframes mcRgoBarra{0%{transform:translateX(-100%)}70%,100%{transform:translateX(170%)}}' +
      '.mc-rgo-tx span{display:block;font:800 12.5px Nunito,sans-serif;color:#9a9a9a;margin-top:5px}' +
      '.mc-rgo-tx span em{font-style:normal;color:#f2f2f2}' +
      // Pantalla de subida
      '.mc-rgo-up{position:fixed;inset:0;z-index:400;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.78);opacity:0;transition:opacity .35s}' +
      '.mc-rgo-up.ver{opacity:1}' +
      '.mc-rgo-up-c{position:relative;width:100%;max-width:400px;text-align:center;padding:24px 20px 22px;border-radius:26px;border:2px solid var(--rg-b);border-bottom-width:6px;background:radial-gradient(90% 70% at 50% 34%,var(--rg-t) 0%,#151127 78%);color:#f2f2f2;font-family:Nunito,sans-serif;overflow:hidden;transform:scale(.86);transition:transform .45s cubic-bezier(.2,1.4,.4,1)}' +
      '.mc-rgo-up.ver .mc-rgo-up-c{transform:scale(1)}' +
      '.mc-rgo-up-c small{display:block;font:900 12px Nunito,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--rg-c)}' +
      '.mc-rgo-up-em{width:250px;max-width:80%;margin:10px auto 0}' +
      '.mc-rgo-up-c h2{font:1000 30px Nunito,sans-serif;margin:6px 0 4px;color:var(--rg-c)}' +
      '.mc-rgo-up-c p{font:700 15px Nunito,sans-serif;color:#b0b0b0;margin:0}' +
      '.mc-rgo-up-c button{display:block;width:100%;margin-top:18px;border:0;border-radius:16px;padding:15px;font:1000 16px Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:#C6E000;color:#141a00;box-shadow:0 5px 0 #8fa300;cursor:pointer}' +
      '.mc-rgo-up-c button:active{transform:translateY(4px);box-shadow:0 1px 0 #8fa300}' +
      '.mc-rgo-cf{position:absolute;inset:0;pointer-events:none}' +
      '.mc-rgo-cf i{position:absolute;top:-14px;width:7px;height:12px;border-radius:2px;animation:mcRgoCae 3.4s linear infinite}' +
      '@keyframes mcRgoCae{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(560px) rotate(540deg);opacity:0}}' +
      // Perfil: insignia junto al nombre y vitrina
      '.mc-rgo-ins{display:inline-flex;align-items:center;gap:8px;margin:8px auto 0;padding:4px 14px 4px 4px;border-radius:999px;border:2px solid #2F284E;background:#201A38;font:1000 15px Nunito,sans-serif;color:var(--rg-c)}' +
      '.mc-rgo-ins span:first-child{width:38px;flex:none}' +
      '.mc-rgo-ins small{font:800 12.5px Nunito,sans-serif;color:#9a9a9a}' +
      '.mc-rgo-vit{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;margin-top:12px}' +
      '.mc-rgo-pz{position:relative;text-align:center;border:2px solid #2C2549;border-bottom-width:4px;border-radius:16px;padding:8px 4px 10px;background:radial-gradient(80% 70% at 50% 40%,var(--rg-t) 0%,#1D1834 80%)}' +
      '.mc-rgo-pz>span{display:block;width:76px;margin:0 auto}' +
      '.mc-rgo-pz b{display:block;font:1000 13.5px Nunito,sans-serif;color:var(--rg-c)}' +
      '.mc-rgo-pz small{display:block;font:800 11.5px Nunito,sans-serif;color:#9a9a9a}' +
      '.mc-rgo-pz em{position:absolute;top:6px;right:6px;font:1000 11px Nunito,sans-serif;font-style:normal;color:#FFC800;background:rgba(255,200,0,.14);padding:2px 7px;border-radius:7px}' +
      '.mc-rgo-pz{font:inherit;color:inherit;cursor:pointer;width:100%}.mc-rgo-pz.no{cursor:default}.mc-rgo-pz:focus-visible{outline:3px solid var(--rg-c);outline-offset:2px}' +
      '.mc-rgo-sem ul{list-style:none;margin:14px 0 0;padding:0;max-height:240px;overflow:auto;text-align:left}' +
      '.mc-rgo-sem li{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border:2px solid #2C2549;border-radius:12px;margin-top:6px;font:800 14.5px Nunito,sans-serif;background:#1F1936}' +
      '.mc-rgo-sem li b{color:var(--rg-c);font-weight:1000;font-variant-numeric:tabular-nums}' +
      '.mc-rgo-sem button{background:#292245;color:#f2f2f2;box-shadow:0 5px 0 #070512;border:2px solid #352E58}' +
      '.mc-rgo-pz.no>span{filter:grayscale(1) brightness(.3)}.mc-rgo-pz.no b{color:#5f5f5f}.mc-rgo-pz.no{background:#1D1834}' +
      '.mc-rgo-mini{display:inline-block;width:34px;vertical-align:middle;flex:none}' +
      '@media (prefers-reduced-motion:reduce){.mc-rgo-bar i::after,.mc-rgo-cf{animation:none!important}.mc-rgo-cf{display:none}}';
    document.head.appendChild(st);
  }

  function vars(n) { return '--rg-c:' + TXT[n] + ';--rg-t:' + TINTE[n] + ';--rg-b:' + BORDE[n] + ';--rg-o:' + OSC[n]; }

  /* ---------- Semanas ---------- */
  function lunes(d) { d = new Date(d || Date.now()); var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function clave(d) { var x = lunes(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function diasQuedan() { var f = lunes(); f.setDate(f.getDate() + 7); return Math.max(1, Math.ceil((f - Date.now()) / 864e5)); }
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  function rangoSemana(iso) {
    var a = new Date(iso + 'T00:00:00'), b = new Date(a); b.setDate(b.getDate() + 6);
    return a.getMonth() === b.getMonth() ? a.getDate() + ' – ' + b.getDate() + ' ' + MES[b.getMonth()] : a.getDate() + ' ' + MES[a.getMonth()] + ' – ' + b.getDate() + ' ' + MES[b.getMonth()];
  }

  /* ---------- Inicio: tarjeta y subida ---------- */
  function tarjeta(xp) {
    var n = nivel(xp), sig = n < TOP ? MIN[n + 1] : null, base = n < 0 ? 0 : MIN[n];
    var pct = sig ? Math.max(4, Math.min(100, Math.round(100 * (xp - base) / (sig - base)))) : 100;
    var d = diasQuedan();
    var linea = sig ? 'Te faltan <em>' + miles(sig - xp) + ' XP</em> para ' + NOM[n + 1] + ' · ' + (d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días')
      : '<em>' + miles(xp) + ' XP</em> · ¡Rango máximo de la semana!';
    if (n < 0) linea = 'Gana <em>' + miles(sig - xp) + ' XP</em> para llegar a ' + NOM[0] + ' · ' + (d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días');
    return '<span class="mc-rgo-ic' + (n < 0 ? ' bloq' : '') + '">' + svg(Math.max(0, n), { quieto: n < 0 }) + '</span><span class="mc-rgo-tx"><small>Tu rango esta semana</small><b>' + (n < 0 ? 'Aún sin rango' : NOM[n]) + '</b>' +
      '<span class="mc-rgo-bar"><i style="width:' + pct + '%"></i></span><span>' + linea + '</span></span>';
  }
  function subida(n, xp) {
    css();
    var col = ['#CE82FF', '#FFC800', '#1CB0F6', '#FF4B4B', '#C6E000', '#F2F2F2'], cf = '';
    for (var k = 0; k < 24; k++) cf += '<i style="left:' + (k * 37) % 100 + '%;background:' + col[k % 6] + ';animation-delay:' + ((k * .29) % 3).toFixed(2) + 's;animation-duration:' + (2.8 + (k % 5) * .35).toFixed(2) + 's"></i>';
    var d = document.createElement('div');
    d.className = 'mc-rgo-up'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Subiste a ' + NOM[n]);
    d.innerHTML = '<div class="mc-rgo-up-c" style="' + vars(n) + '"><div class="mc-rgo-cf">' + cf + '</div><small>Nuevo rango</small>' +
      '<div class="mc-rgo-up-em">' + svg(n) + '</div><h2>¡Llegaste a ' + NOM[n] + '!</h2>' +
      '<p>Llevas ' + miles(xp) + ' XP esta semana.' + (n < TOP ? ' Siguiente: ' + NOM[n + 1] + ' con ' + miles(MIN[n + 1]) + ' XP.' : ' Es el rango más alto.') + '</p>' +
      '<button type="button">Seguir</button></div>';
    function cerrar() { d.classList.remove('ver'); setTimeout(function () { d.remove(); }, 350); }
    d.querySelector('button').addEventListener('click', cerrar);
    d.addEventListener('click', function (e) { if (e.target === d) cerrar(); });
    document.body.appendChild(d);
    try { if (window.MCSonido && MCSonido.racha) MCSonido.racha(); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
    setTimeout(function () { var b = d.querySelector('button'); if (b) b.focus(); }, 400);
  }
  // Muestra la subida una sola vez por rango y semana (el primer rango visto no celebra)
  function revisarSubida(xp) {
    var n = nivel(xp), k = 'mc_rango_' + clave(), antes;
    try { antes = localStorage.getItem(k); } catch (e) { return; }
    if (antes === null) { try { localStorage.setItem(k, String(n)); } catch (e) {} return; }
    if (n > +antes) { try { localStorage.setItem(k, String(n)); } catch (e) {} subida(n, xp); }
  }

  function enInicio() {
    var agenda = document.getElementById('salAgenda');
    if (!agenda || !window.MCCorazones) return;
    css();
    var caja = document.createElement('a');
    caja.className = 'mc-rgo'; caja.href = 'coleccion.html#rangos'; caja.hidden = true;
    agenda.insertAdjacentElement('beforebegin', caja);
    var ultimo = -1;
    MCCorazones.alCambiar(function (e) {
      if (!e) return;
      var xp = +e.xp_semana || 0;
      if (xp === ultimo) return;
      ultimo = xp;
      var n = nivel(xp);
      caja.setAttribute('style', vars(Math.max(0, n)));
      caja.classList.toggle('sin', n < 0);
      caja.innerHTML = tarjeta(xp);
      caja.setAttribute('aria-label', n < 0 ? 'Aún sin rango esta semana' : 'Tu rango esta semana: ' + NOM[n]);
      caja.hidden = false;
      revisarSubida(xp);
    });
  }

  /* ---------- Perfil: insignia, vitrina y ranking ---------- */
  function vitrina(filas) {
    var hoy = clave(), sem = MIN.map(function () { return []; });
    (filas || []).forEach(function (f) { if (f.semana && f.semana < hoy && nivel(f.xp) >= 0) sem[nivel(f.xp)].push({ semana: f.semana, xp: +f.xp }); });
    sem.forEach(function (l) { l.sort(function (a, b) { return a.semana < b.semana ? 1 : -1; }); });
    var total = sem.reduce(function (a, l) { return a + l.length; }, 0);
    var html = '';
    for (var n = TOP; n >= 0; n--) {
      var c = sem[n].length;
      html += c
        ? '<button type="button" class="mc-rgo-pz" data-n="' + n + '" style="' + vars(n) + '" aria-label="' + NOM[n] + ', ' + c + (c === 1 ? ' semana' : ' semanas') + '">' + (c > 1 ? '<em>×' + c + '</em>' : '') +
          '<span>' + svg(n) + '</span><b>' + NOM[n] + '</b><small>' + rangoSemana(sem[n][0].semana) + '</small></button>'
        : '<div class="mc-rgo-pz no" style="' + vars(n) + '"><span>' + svg(n, { mini: true, quieto: true }) + '</span><b>' + NOM[n] + '</b><small>' + miles(MIN[n]) + ' XP</small></div>';
    }
    return { total: total, html: html, semanas: sem };
  }
  // Al tocar un emblema: las semanas en que lo ganaste, con el XP de cada una
  function semanas(n, lista) {
    var d = document.createElement('div');
    d.className = 'mc-rgo-up'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', NOM[n] + ': semanas');
    d.innerHTML = '<div class="mc-rgo-up-c mc-rgo-sem" style="' + vars(n) + '"><small>Mi vitrina</small>' +
      '<div class="mc-rgo-up-em" style="width:150px">' + svg(n) + '</div><h2>' + NOM[n] + (lista.length > 1 ? ' ×' + lista.length : '') + '</h2>' +
      '<p>' + (lista.length === 1 ? 'Lo ganaste 1 semana.' : 'Lo ganaste ' + lista.length + ' semanas.') + '</p>' +
      '<ul>' + lista.map(function (x) { return '<li><span>' + rangoSemana(x.semana) + '</span><b>' + miles(x.xp) + ' XP</b></li>'; }).join('') + '</ul>' +
      '<button type="button">Cerrar</button></div>';
    function cerrar() { d.classList.remove('ver'); setTimeout(function () { d.remove(); }, 350); }
    d.querySelector('button').addEventListener('click', cerrar);
    d.addEventListener('click', function (e) { if (e.target === d) cerrar(); });
    document.body.appendChild(d);
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('ver'); }); });
  }
  function enPerfil() {
    var saludo = document.getElementById('saludo');
    if (!saludo) return;
    css();
    // Insignia junto al nombre
    var ins = document.createElement('div');
    ins.style.textAlign = 'center'; ins.hidden = true;
    saludo.insertAdjacentElement('afterend', ins);
    if (window.MCCorazones) MCCorazones.alCambiar(function (e) {
      if (!e) return;
      var n = nivel(e.xp_semana);
      if (n < 0) { ins.hidden = true; return; }
      ins.innerHTML = '<a class="mc-rgo-ins" href="coleccion.html#rangos" style="' + vars(n) + ';text-decoration:none"><span>' + svg(n, { mini: true }) + '</span>' + NOM[n] + ' <small>· ' + miles(e.xp_semana) + ' XP</small></a>';
      ins.hidden = false;
    });
    // La vitrina de semanas pasadas vive en Mi colección (coleccion.html#rangos)
  }

  window.MCRango = { svg: svg, nivel: nivel, nombre: function (n) { return NOM[n]; }, minimo: MIN, css: css, subida: subida, vitrina: vitrina, semanas: semanas, color: function (n) { return { c: TXT[n], t: TINTE[n], b: BORDE[n] }; }, grupos: function () { return GRUPOS; }, clave: clave, fechas: rangoSemana, diasQuedan: diasQuedan, mini: function (xp) { return nivel(xp) < 0 ? '' : '<span class="mc-rgo-mini" title="' + NOM[nivel(xp)] + '">' + svg(nivel(xp), { mini: true }) + '</span>'; } };

  // corazones.js trae el XP de la semana; se espera a que cargue
  function iniciar(intento) {
    intento = intento || 0;
    if (!window.MCCorazones && intento < 40) { setTimeout(function () { iniciar(intento + 1); }, 250); return; }
    var pagina = location.pathname.replace(/^.*\//, '');
    if (pagina === '' || pagina === 'index.html') enInicio();
    else if (pagina === 'perfil.html') enPerfil();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { iniciar(); }); else iniciar();
})();

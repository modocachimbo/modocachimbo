/* =========================================================
   Modo Cachimbo · Paquetes de descarga (descargas.html)
   - Un paquete = un curso del ciclo actual, los simuladores de un curso
     del Laboratorio o los exámenes de admisión. Quedan guardados en el
     teléfono para usarlos sin internet.
   - Cachés: "mc-pack-base" (inicio, estilos, scripts, fuentes, Supabase…)
     y "mc-pack-<id>" (las páginas y datos del paquete).
     sw.js no las borra al cambiar de versión y sin internet busca ahí.
   - Los archivos se descubren solos: se lee cada página, script, estilo y
     dato y se guarda lo que piden (src/href, 'assets/…', imágenes de las
     preguntas). Nada que mantener a mano.
   - localStorage mc_paq: { base:{bytes,t,lab}, packs:{ id:{nombre,tipo,items,pags,bytes,t,ver} } }
   window.MCPaquetes: soportado, info, tiene, bajar, borrar, borrarTodo, revisar, uso, ocupado
   ========================================================= */
(function () {
  if (window.MCPaquetes) return;
  var K = 'mc_paq', PRE = 'mc-pack-';
  var RAIZ = (document.currentScript && document.currentScript.src || location.href).replace(/assets\/paquetes\.js(\?.*)?$/, '');
  // Comunes a todos los paquetes: el inicio, esta tienda, la página sin internet y el Repaso global/mixto
  // (mezcla las preguntas de los cursos que bajó)
  var BASE = ['index.html', 'descargas.html', 'offline.html', 'repaso-mixto.html', 'manifest.webmanifest', 'assets/app/icono-192.png'];
  // Si hay simuladores, también el Laboratorio y lo común de sus páginas
  // Versión de la base: SUBIRLA cuando cambie BASE (o algo común que los paquetes ya bajados deban volver a bajar).
  // Así descargas.html marca «Mejora para usar sin internet · Actualizar» y el inicio pone el punto rojo en Descargas.
  // (El inicio repite este número en su script del punto rojo: cambiar los dos.)
  // 2: entra repaso-mixto.html (Repaso global sin internet)
  var BASE_VER = 2;
  var BASE_LAB = ['laboratorio.html', 'assets/lab-plano.js', 'assets/lab-mate.css', 'assets/lab-reto.js'];
  var CDN = /^https:\/\/(fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net)\//;

  function leer() { try { var v = JSON.parse(localStorage.getItem(K) || 'null'); if (v && v.packs) return v; } catch (e) {} return { base: null, packs: {} }; }
  function guardar(v) { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }
  function abs(u) { return new URL(u, RAIZ).href; }
  function rel(u) { return u.indexOf(RAIZ) === 0 ? u.slice(RAIZ.length) : u; }
  function propio(u) { return u.indexOf(RAIZ) === 0; }

  // Lo que pide un archivo: páginas (src/href y 'assets/…'), scripts ('assets/…' de código),
  // estilos (url(…), solo .woff2 e imágenes), la hoja de Google Fonts y las imágenes de las preguntas
  function pedidos(url, tipo, texto) {
    var l = [], m, re;
    if (tipo === 'html') {
      re = /(?:src|href)="([^"#:+'<>]+?\.(?:js|css|webp|png|jpe?g|svg|json|webmanifest)(?:\?v=\d+)?)"/g;
      while ((m = re.exec(texto))) l.push([m[1], url]);
      re = /(?:src|href)="(https:\/\/(?:fonts\.googleapis\.com\/css2\?|cdn\.jsdelivr\.net\/npm\/katex@)[^"]+)"/g;
      while ((m = re.exec(texto))) l.push([m[1].replace(/&amp;/g, '&'), url]);
      re = /['"]((?:assets)\/[\w\-\/.]+\.(?:js|css|webp|png|svg|json)(?:\?v=\d+)?)['"]/g;
      while ((m = re.exec(texto))) l.push([m[1], RAIZ]);
      // Célula: las ilustraciones de cada organela (detalle-<id>.webp) se arman en el código
      if (/assets\/laboratorio\/detalle-/.test(texto)) {
        re = /(\w+):\{w:\d+,h:\d+(?:,img:'([\w-]+)')?/g;
        while ((m = re.exec(texto))) l.push(['assets/laboratorio/detalle-' + (m[2] || m[1]) + '.webp', RAIZ]);
      }
    } else if (tipo === 'js') {
      // En el código, 'assets/…' es desde la raíz del sitio (BASE + 'assets/…')
      re = /['"]((?:assets)\/[\w\-\/.]+\.(?:js|css|json)(?:\?v=\d+)?)['"]/g;
      while ((m = re.exec(texto))) l.push([m[1], RAIZ]);
      re = /['"](https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/[^'"]+\.js)['"]/g;
      while ((m = re.exec(texto))) l.push([m[1], RAIZ]);
    } else if (tipo === 'css') {
      re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
      while ((m = re.exec(texto))) if (/\.(woff2|webp|png|svg|jpe?g)(\?|$)/.test(m[1]) && !/^data:/.test(m[1])) l.push([m[1], url]);
    } else if (tipo === 'json') {
      // Preguntas con imagen: "assets/img/…" o "/modocachimbo/assets/img/…"
      re = /((?:\/[\w-]+\/)?assets\/img\/[^"\\\]\s)]+?\.(?:webp|png|jpe?g|svg))/g;
      while ((m = re.exec(texto))) l.push([m[1].replace(/^\/[\w-]+\/(?=assets\/)/, ''), RAIZ]);
    }
    return l.map(function (p) { try { return new URL(p[0], p[1]).href; } catch (e) { return ''; } })
      .filter(function (u) { return u && (propio(u) || CDN.test(u)); })
      // Otras páginas del sitio no: solo lo que la página necesita para funcionar
      .filter(function (u) { return !/\.html(\?|$)/.test(u); });
  }
  function tipoDe(u, r) {
    var ct = (r.headers.get('content-type') || '');
    if (/\.html?(\?|$)/.test(u) || /text\/html/.test(ct)) return 'html';
    if (/\.js(\?|$)/.test(u) || /javascript/.test(ct)) return 'js';
    if (/\.css(\?|$)/.test(u) || /text\/css/.test(ct) || /fonts\.googleapis\.com\/css/.test(u)) return 'css';
    if (/\.json(\?|$)/.test(u) || /json/.test(ct)) return 'json';
    return '';
  }

  // Baja archivos (y lo que ellos piden) a una caché. fijos: tienen que bajar sí o sí;
  // opc y lo descubierto: si no existen se saltan. ya: archivos que ya están en la base.
  // propio(u): ¿es del paquete? Lo que no (scripts, KaTeX, fuentes…) va a la base, así no se repite en cada curso.
  // reusar: { cambia: {url:1} } → al actualizar, lo que ya está guardado y no cambió se toma de la caché (no gasta datos)
  function llenar(nombre, fijos, opc, ya, alAvance, esPropio, reusar) {
    var cola = [], vistos = {}, duro = {}, bytes = 0, comun = 0, hechos = 0, i = 0, guardados = [], red = 0;
    fijos.concat(opc || []).forEach(function (u) { u = abs(u); if (!vistos[u]) { vistos[u] = 1; cola.push(u); } });
    fijos.forEach(function (u) { duro[abs(u)] = 1; });
    return Promise.all([caches.open(nombre), caches.open(PRE + 'base')]).then(function (cs) {
      var c = cs[0], cb = cs[1];
      function traer(u) {
        var deRed = function () { return fetch(u, { cache: 'no-cache', credentials: propio(u) ? 'same-origin' : 'omit' }).then(function (r) { r._red = 1; return r; }); };
        if (!reusar || reusar.cambia[u]) return deRed();
        return c.match(u).then(function (r) { return r || deRed(); });
      }
      function uno(u) {
        return traer(u).then(function (r) {
          if (!r.ok) throw new Error('falta');
          var tp = tipoDe(u, r), copia = r.clone(), mio = !esPropio || duro[u] || esPropio(rel(u)), nuevo = r._red;
          return r.blob().then(function (b) {
            var paso = Promise.resolve();
            if (tp) paso = b.text().then(function (t) {
              pedidos(u, tp, t).forEach(function (n) { if (!vistos[n] && !(ya && ya[n])) { vistos[n] = 1; cola.push(n); } });
            });
            return paso.then(function () { return (mio ? c : cb).put(u, copia); }).then(function () {
              if (mio) { bytes += b.size; guardados.push(u); } else comun += b.size;
              if (nuevo) red += b.size;
            });
          });
        }).catch(function () {
          if (duro[u]) throw new Error(navigator.onLine === false ? 'Sin internet.' : 'No se pudo bajar ' + rel(u) + '.');
        }).then(function () { hechos++; if (alAvance) alAvance(hechos, cola.length); });
      }
      function siguiente() { return i < cola.length ? uno(cola[i++]).then(siguiente) : Promise.resolve(); }
      // De 4 en 4 para no ahogar el internet del celular; lo descubierto entra en la siguiente ronda
      function ronda() { return Promise.all([siguiente(), siguiente(), siguiente(), siguiente()]).then(function () { return i < cola.length ? ronda() : null; }); }
      return ronda().then(function () {
        // Al actualizar: se borra lo que ya no usa el paquete
        var limpiar = reusar ? c.keys().then(function (ks) { return Promise.all(ks.filter(function (r) { return guardados.indexOf(r.url) < 0; }).map(function (r) { return c.delete(r); })); }) : null;
        return Promise.resolve(limpiar).then(function () { return { bytes: bytes, comun: comun, archivos: guardados, red: red }; });
      });
    });
  }

  // Pide al servidor solo las cabeceras: ¿cambió algo desde que se descargó?
  function etiquetas(urls) {
    return Promise.all(urls.map(function (u) {
      return fetch(abs(u), { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
        return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
      });
    }));
  }
  function firma(urls) { return etiquetas(urls).then(function (l) { return l.join('|'); }); }

  var bajando = null;
  window.MCPaquetes = {
    soportado: function () { return !!(window.caches && navigator.serviceWorker && window.fetch && (location.protocol === 'https:' || location.hostname === 'localhost')); },
    info: leer,
    // ¿Este simulador del Laboratorio está descargado?
    tiene: function (sim) { var v = leer(); return Object.keys(v.packs).some(function (k) { var p = v.packs[k]; return p.tipo === 'lab' && (p.items || []).indexOf(sim) >= 0; }); },
    uso: function () { var v = leer(), n = v.base ? v.base.bytes : 0; Object.keys(v.packs).forEach(function (k) { n += v.packs[k].bytes || 0; }); return n; },
    ocupado: function () { return bajando; },
    // p: { nombre, tipo:'curso'|'lab'|'examenes', fijos:[páginas], opc:[páginas/datos que pueden no existir],
    //      propios:['biologia/', …] (lo demás va a la base), items:[…] }
    // alAvance(hechos, total, fase)
    bajar: function (id, p, alAvance) {
      if (bajando) return Promise.reject(new Error('Espera a que termine la otra descarga.'));
      var v = leer(), base;
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
      var conLab = p.tipo === 'lab' || Object.keys(v.packs).some(function (k) { return v.packs[k].tipo === 'lab' && k !== id; });
      bajando = id;
      // 1) Base: el inicio y todo lo común. Se vuelve a bajar si tiene más de 30 min (así queda al día),
      //    pero no en cada paquete de «Descargar todo»
      var fresca = v.base && v.base.ver === BASE_VER && Date.now() - v.base.t < 1800000 && (!conLab || v.base.lab);
      var pb = fresca ? Promise.resolve({ bytes: v.base.bytes, archivos: [] })
        : llenar(PRE + 'base', BASE.concat(conLab ? BASE_LAB : []), [], null, function (h, t) { if (alAvance) alAvance(h, t, 'base'); });
      return pb
        .then(function (rb) {
          base = rb; var ya = {};
          return caches.open(PRE + 'base').then(function (cb) { return cb.keys(); }).then(function (ks) {
          // Lo que ya está en la base (de esta u otra descarga) no se vuelve a bajar
          ks.forEach(function (r) { ya[r.url] = 1; });
          // 2) El paquete: sus páginas, datos y lo que piden. Lo común (scripts, KaTeX, fuentes) va a la base
          var pre = (p.propios || []).map(function (x) { return x; });
          var esPropio = pre.length ? function (r) { return pre.some(function (x) { return r.indexOf(x) === 0; }); } : null;
          // Actualizar: solo baja las páginas/datos que cambiaron (según sus cabeceras) y lo nuevo que piden
          var antes = v.packs[id], prep;
          if (antes && antes.pags && antes.et && navigator.onLine !== false) {
            prep = etiquetas(antes.pags).then(function (l) {
              var cambia = {};
              antes.pags.forEach(function (u, k) { if (!l[k] || l[k] !== antes.et[k]) cambia[abs(u)] = 1; });
              return { cambia: cambia };
            }, function () { return null; });
          } else prep = caches.delete(PRE + id).then(function () { return null; });
          return prep.then(function (reusar) {
            return llenar(PRE + id, p.fijos || [], p.opc || [], ya, function (h, t) { if (alAvance) alAvance(h, t, 'paquete'); }, esPropio, reusar);
          });
          });
        })
        .then(function (rc) {
          var inicio = (p.fijos || []).concat(p.opc || []).map(abs);
          var pags = rc.archivos.filter(function (u) { return inicio.indexOf(u) >= 0; }).map(rel).sort();
          return etiquetas(pags).catch(function () { return []; }).then(function (et) {
            v = leer();
            var vb = v.base && v.base.bytes || 0;
            v.base = { bytes: (vb || base.bytes) + (rc.comun || 0), t: Date.now(), lab: conLab, ver: BASE_VER };
            v.packs[id] = { nombre: p.nombre, tipo: p.tipo, items: p.items || [], temas: p.temas || 0, pags: pags, bytes: rc.bytes, t: Date.now(), ver: et.join('|'), et: et, red: rc.red };
            guardar(v); bajando = null;
            return v.packs[id];
          });
        })
        .catch(function (e) { bajando = null; throw e; });
    },
    borrar: function (id) {
      var v = leer();
      delete v.packs[id];
      var quedan = Object.keys(v.packs).length;
      if (!quedan) v.base = null;
      guardar(v);
      return caches.delete(PRE + id).then(function () { return quedan ? null : caches.delete(PRE + 'base'); }).then(function () { return v; });
    },
    borrarTodo: function () {
      guardar({ base: null, packs: {} });
      return caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf(PRE) === 0; }).map(function (k) { return caches.delete(k); })); });
    },
    // true si lo común (inicio, Repaso global, scripts…) se bajó con una versión anterior: hay que actualizar
    baseVieja: function () { var v = leer(); return Object.keys(v.packs).length > 0 && (!v.base || v.base.ver !== BASE_VER); },
    // true si cambió alguna página o dato del paquete (solo con internet; sin internet: false)
    revisar: function (id) {
      var c = leer().packs[id];
      if (!c || !c.ver || !c.pags || navigator.onLine === false) return Promise.resolve(false);
      return firma(c.pags).then(function (f) { return f !== c.ver; }, function () { return false; });
    }
  };
})();

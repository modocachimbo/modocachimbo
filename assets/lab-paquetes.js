/* =========================================================
   Modo Cachimbo · Paquetes de descarga del Laboratorio
   - Cada curso es un paquete: sus simuladores (los que el alumno ya tiene
     abiertos) quedan guardados en el teléfono para usarlos sin internet.
   - Cachés: "mc-pack-base" (Laboratorio, estilos, scripts, fuentes, Supabase)
     y "mc-pack-<curso>" (páginas de los simuladores y sus imágenes).
     sw.js no las borra al cambiar de versión y sin internet busca ahí.
   - Los archivos se descubren solos: se lee cada página y cada script y se
     guarda lo que piden (src/href y 'assets/…'). Nada que mantener a mano.
   - localStorage mc_paq: { base:{bytes,t}, cursos:{ id:{sims,bytes,t,ver} } }
   window.MCPaquetes: soportado, info, tiene, bajar, borrar, borrarTodo, revisar, uso
   ========================================================= */
(function () {
  if (window.MCPaquetes) return;
  var K = 'mc_paq', PRE = 'mc-pack-';
  var RAIZ = (document.currentScript && document.currentScript.src || location.href).replace(/assets\/lab-paquetes\.js(\?.*)?$/, '');
  // Comunes a todos los paquetes: el Laboratorio y la página sin internet
  var BASE = ['laboratorio.html', 'offline.html', 'manifest.webmanifest', 'assets/app/icono-192.png'];
  // Archivos que de paso el Laboratorio (sw.js) revisa para saber si hay versión nueva
  var CLAVE = ['laboratorio.html', 'assets/lab-plano.js', 'assets/lab-mate.css', 'assets/lab-reto.js'];

  function leer() { try { var v = JSON.parse(localStorage.getItem(K) || 'null'); if (v && v.cursos) return v; } catch (e) {} return { base: null, cursos: {} }; }
  function guardar(v) { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }
  function abs(u) { return new URL(u, RAIZ).href; }
  function propio(u) { return u.indexOf(RAIZ) === 0; }

  // Lo que pide un archivo: páginas (src/href y 'assets/…'), scripts ('assets/…' de código),
  // estilos (url(…)) y la hoja de Google Fonts (las letras .woff2)
  function pedidos(url, tipo, texto) {
    var l = [], m, re;
    if (tipo === 'html') {
      re = /(?:src|href)="([^"#:+'<>]+?\.(?:js|css|webp|png|jpe?g|svg|json|webmanifest)(?:\?v=\d+)?)"/g;
      while ((m = re.exec(texto))) l.push(m[1]);
      re = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/g;
      while ((m = re.exec(texto))) l.push(m[1].replace(/&amp;/g, '&'));
      re = /['"]((?:assets)\/[\w\-\/.]+\.(?:js|css|webp|png|svg|json)(?:\?v=\d+)?)['"]/g;
      while ((m = re.exec(texto))) l.push(m[1]);
      // Célula: las ilustraciones de cada organela (detalle-<id>.webp) se arman en el código
      if (/assets\/laboratorio\/detalle-/.test(texto)) {
        re = /(\w+):\{w:\d+,h:\d+(?:,img:'([\w-]+)')?/g;
        while ((m = re.exec(texto))) l.push('assets/laboratorio/detalle-' + (m[2] || m[1]) + '.webp');
      }
    } else if (tipo === 'js') {
      re = /['"]((?:assets)\/[\w\-\/.]+\.(?:js|css|json)(?:\?v=\d+)?)['"]/g;
      while ((m = re.exec(texto))) l.push(m[1]);
      re = /['"](https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/[^'"]+\.js)['"]/g;
      while ((m = re.exec(texto))) l.push(m[1]);
    } else if (tipo === 'css') {
      re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
      while ((m = re.exec(texto))) if (!/^data:/.test(m[1])) l.push(m[1]);
    }
    // En el código, 'assets/…' es desde la raíz del sitio (BASE + 'assets/…'); en estilos, desde el archivo
    var desde = tipo === 'css' ? url : RAIZ;
    return l.map(function (u) { try { return new URL(u, /^https?:/.test(u) ? undefined : desde).href; } catch (e) { return ''; } })
      .filter(function (u) { return u && (propio(u) || /^https:\/\/(fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net)\//.test(u)); })
      // Otras páginas del sitio no: solo lo que la página necesita para funcionar
      .filter(function (u) { return !/\.html(\?|$)/.test(u); });
  }
  function tipoDe(u, r) {
    var ct = (r.headers.get('content-type') || '');
    if (/\.html?(\?|$)/.test(u) || /text\/html/.test(ct)) return 'html';
    if (/\.js(\?|$)/.test(u) || /javascript/.test(ct)) return 'js';
    if (/\.css(\?|$)/.test(u) || /text\/css/.test(ct) || /fonts\.googleapis\.com\/css/.test(u)) return 'css';
    return '';
  }

  // Baja una lista de archivos (y lo que ellos piden) a una caché. ya = archivos que van en otra caché.
  // Los de la lista tienen que bajar sí o sí; lo descubierto que falle (no existe) se salta.
  function llenar(nombre, inicio, ya, alAvance) {
    var cola = inicio.map(abs), vistos = {}, fijos = {}, bytes = 0, hechos = 0, i = 0, guardados = [];
    cola.forEach(function (u) { vistos[u] = 1; fijos[u] = 1; });
    return caches.open(nombre).then(function (c) {
      function uno(u) {
        return fetch(u, { cache: 'no-cache', credentials: propio(u) ? 'same-origin' : 'omit' }).then(function (r) {
          if (!r.ok) throw new Error('falta');
          var tp = tipoDe(u, r), copia = r.clone();
          return r.blob().then(function (b) {
            var paso = Promise.resolve();
            if (tp) paso = b.text().then(function (t) {
              pedidos(u, tp, t).forEach(function (n) { if (!vistos[n] && !(ya && ya[n])) { vistos[n] = 1; cola.push(n); } });
            });
            return paso.then(function () { return c.put(u, copia); }).then(function () { bytes += b.size; guardados.push(u); });
          });
        }).catch(function (e) {
          if (fijos[u]) throw new Error(navigator.onLine === false ? 'Sin internet.' : 'No se pudo bajar ' + u.replace(RAIZ, '') + '.');
        }).then(function () { hechos++; if (alAvance) alAvance(hechos, cola.length); });
      }
      function siguiente() { return i < cola.length ? uno(cola[i++]).then(siguiente) : Promise.resolve(); }
      // De 4 en 4 para no ahogar el internet del celular; lo descubierto entra en la siguiente ronda
      function ronda() { return Promise.all([siguiente(), siguiente(), siguiente(), siguiente()]).then(function () { return i < cola.length ? ronda() : null; }); }
      return ronda().then(function () { return { bytes: bytes, archivos: guardados }; });
    });
  }

  function idCurso(curso) { return String(curso).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  // Pide al servidor solo las cabeceras: ¿cambió algo desde que se descargó?
  function firma(urls) {
    return Promise.all(urls.map(function (u) {
      return fetch(abs(u), { method: 'HEAD', cache: 'no-cache' }).then(function (r) {
        return r.ok ? (r.headers.get('etag') || r.headers.get('last-modified') || '') : '';
      });
    })).then(function (l) { return l.join('|'); });
  }

  var bajando = null;
  window.MCPaquetes = {
    soportado: function () { return !!(window.caches && navigator.serviceWorker && window.fetch && (location.protocol === 'https:' || location.hostname === 'localhost')); },
    info: leer,
    id: idCurso,
    // ¿Este simulador está descargado?
    tiene: function (sim) { var v = leer(); return Object.keys(v.cursos).some(function (k) { return (v.cursos[k].sims || []).indexOf(sim) >= 0; }); },
    uso: function () { var v = leer(), n = v.base ? v.base.bytes : 0; Object.keys(v.cursos).forEach(function (k) { n += v.cursos[k].bytes || 0; }); return n; },
    ocupado: function () { return bajando; },
    // sims: [{sim:'mru', url:'lab-mru.html'}, …] · alAvance(hechos, total, fase)
    bajar: function (curso, sims, alAvance) {
      if (bajando) return Promise.reject(new Error('Espera a que termine la otra descarga.'));
      var id = idCurso(curso), v = leer(), base;
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
      var paginas = sims.map(function (s) { return s.url; }).sort();
      bajando = curso;
      // 1) Base: el Laboratorio y todo lo común (se vuelve a bajar en cada descarga, así queda al día)
      var p = llenar(PRE + 'base', BASE.concat(paginas.length ? ['assets/lab-plano.js', 'assets/lab-mate.css', 'assets/lab-reto.js'] : []), null,
        function (h, t) { if (alAvance) alAvance(h, t, 'base'); })
        .then(function (rb) {
          base = rb; var ya = {}; rb.archivos.forEach(function (u) { ya[u] = 1; });
          // 2) El curso: sus páginas y lo que piden (lo común ya está en la base)
          return caches.delete(PRE + id).then(function () {
            return llenar(PRE + id, paginas, ya, function (h, t) { if (alAvance) alAvance(h, t, 'curso'); });
          });
        })
        .then(function (rc) {
          return firma(paginas.concat(CLAVE)).catch(function () { return ''; }).then(function (f) {
            v = leer();
            v.base = { bytes: base.bytes, t: Date.now() };
            v.cursos[id] = { curso: curso, sims: sims.map(function (s) { return s.sim; }), pags: paginas, bytes: rc.bytes, t: Date.now(), ver: f };
            guardar(v); bajando = null;
            return v.cursos[id];
          });
        });
      return p.catch(function (e) { bajando = null; throw e; });
    },
    borrar: function (curso) {
      var id = idCurso(curso), v = leer();
      delete v.cursos[id];
      var quedan = Object.keys(v.cursos).length;
      if (!quedan) v.base = null;
      guardar(v);
      return caches.delete(PRE + id).then(function () { return quedan ? null : caches.delete(PRE + 'base'); }).then(function () { return v; });
    },
    borrarTodo: function () {
      guardar({ base: null, cursos: {} });
      return caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf(PRE) === 0; }).map(function (k) { return caches.delete(k); })); });
    },
    // true si hay versión nueva de algo del paquete (solo con internet; sin internet: false)
    revisar: function (curso) {
      var c = leer().cursos[idCurso(curso)];
      if (!c || !c.ver || !c.pags || navigator.onLine === false) return Promise.resolve(false);
      return firma(c.pags.concat(CLAVE)).then(function (f) { return f !== c.ver; }, function () { return false; });
    }
  };
})();

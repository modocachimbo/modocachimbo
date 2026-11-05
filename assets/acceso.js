/* =========================================================
   Modo Cachimbo · Acceso con código (Repaso y Fijas)
   - Cada dispositivo tiene un identificador propio
   - Los códigos activados se guardan en el navegador y se revisan al entrar
   - Si no hay internet, se respeta el último acceso válido (7 días)
   - Si el alumno entró con Google, sus códigos se guardan en su cuenta
     (supabase/15-codigos-cuenta.sql): en otro equipo, o si se borraron
     los datos del navegador, vuelven solos sin escribirlos otra vez.
     El servidor igual revisa cada código y cuenta cada dispositivo.
   - Si el profesor libera este equipo (o desactiva o borra el código),
     la página abierta se recarga sola y el candado pide el código otra vez.
     Un código liberado se borra de este equipo y de la cuenta (Perfil · Mis accesos).
   - Un código quitado queda marcado en la cuenta (supabase/48-codigos-quitados.sql):
     otro equipo ya no lo vuelve a subir y, si lo tiene con su aviso, lo borra.
   - Lo abierto para todos (Panel → Códigos → Acceso libre) se pregunta al servidor
     al cargar cada página (como mucho una vez cada 2 minutos) y se guarda aquí:
     así los candados de las tarjetas se quitan aunque el alumno no tenga códigos.
   - Acceso por ID (supabase/70-acceso-por-id.sql): lo que el profe dio desde
     Panel → Códigos → «Dar por ID» llega directo a la cuenta, sin código.
     Se pregunta a Supabase (como mucho una vez cada 2 minutos) y se guarda aquí.
     La página abre si hay código O acceso por ID. Si se lo quitan, se recarga sola.
   Requiere assets/mc-config.js
   ========================================================= */
(function () {
  var CFG = window.MC_CONFIG || {};
  var API = CFG.API_URL || CFG.REPORTES_URL || '';
  var K_DISP = 'mc_dispositivo', K_ACC = 'mc_accesos', K_AVISO = 'mc_acceso_aviso', K_ABIERTOS = 'mc_abiertos', K_ID = 'mc_accesos_id';
  var DIA = 24 * 3600 * 1000;
  var memoria = {};
  // true abre todas las páginas sin código (los códigos siguen activables)
  var LIBRE = false;

  /* ---- Paquetes ----
     general        → las 4 áreas (todo lo de adentro), Simulacro, Duelos y Exámenes
     area-<área>    → solo esa área
     seminario-VIP  → Seminarios y Banqueo de todos los cursos
     vocabulario-VIP→ Vocabulario
     biblioteca-VIP → la Biblioteca (todos sus libros)
     descarga-VIP   → Descargas en PDF (assets/descarga-pdf.js, supabase/54-descarga-aparte.sql).
                      Se vende aparte: TODO-VIP no la incluye
     TODO-VIP       → todo, menos las Descargas PDF
     Los códigos de antes (curso-x, repaso-VIP, fijas-x…) siguen abriendo lo suyo. */
  var AREAS = {
    'matematica': ['algebra', 'aritmetica', 'estadistica', 'geometria', 'trigonometria'],
    'ciencia-tecnologia': ['anatomia', 'biologia', 'fisica', 'quimica'],
    'comunicacion': ['lenguaje', 'literatura', 'raz-verbal'],
    'ciencias-sociales': ['ciudadania', 'economia', 'filosofia', 'geografia', 'historia-peru', 'historia-universal', 'psicologia']
  };
  var AREA_DE = {};
  Object.keys(AREAS).forEach(function (a) { AREAS[a].forEach(function (c) { AREA_DE[c] = a; }); });
  // Qué candado tiene la página: el Repaso, las Fijas o las Flashcards de un curso van con su área
  function puerta(x) {
    var m = /^(repaso|fijas|tarjetas|curso)-(.+)$/.exec(x || '');
    return m && AREA_DE[m[2]] ? 'area-' + AREA_DE[m[2]] : x;
  }

  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return memoria[k] || null; } }
  function escribir(k, v) { try { localStorage.setItem(k, v); } catch (e) { memoria[k] = v; } }

  function dispositivo() {
    var d = leer(K_DISP);
    if (!d || !/^d-[a-z0-9]{8,40}$/.test(d)) {
      var r = '';
      try { var a = new Uint8Array(12); crypto.getRandomValues(a); for (var i = 0; i < a.length; i++) r += (a[i] % 36).toString(36); }
      catch (e) { r = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
      d = 'd-' + r.slice(0, 16);
      escribir(K_DISP, d);
    }
    return d;
  }
  function accesos() { try { return JSON.parse(leer(K_ACC) || '{}') || {}; } catch (e) { return {}; } }
  function guardar(a) { escribir(K_ACC, JSON.stringify(a)); }

  function equipo() {
    var u = navigator.userAgent || '';
    var so = /Android/i.test(u) ? 'Android' : /iPhone|iPad|iPod/i.test(u) ? 'iPhone/iPad' : /Windows/i.test(u) ? 'Windows' : /Mac OS/i.test(u) ? 'Mac' : /Linux/i.test(u) ? 'Linux' : 'Otro';
    var nav = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /SamsungBrowser/.test(u) ? 'Samsung' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'Navegador';
    return so + ' · ' + nav;
  }

  // Primero fetch sin cookies: si el teléfono o el navegador tiene varias cuentas de Google abiertas,
  // Google rechaza el pedido que lleva cookies (eso pasa con <script>). Si fetch falla, se usa <script> (JSONP).
  function jsonp(params) {
    if (!API) return Promise.reject(new Error('sin-api'));
    if (!window.fetch) return porScript(params);
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    return fetch(API + (API.indexOf('?') < 0 ? '?' : '&') + q, { credentials: 'omit', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) { clearTimeout(t); return d; }, function () { clearTimeout(t); return porScript(params); });
  }
  function porScript(params) {
    return new Promise(function (resolve, reject) {
      if (!API) { reject(new Error('sin-api')); return; }
      var cb = 'mc_acc_' + Math.random().toString(36).slice(2);
      var s = document.createElement('script');
      var t = setTimeout(function () { fin(); reject(new Error('timeout')); }, 12000);
      function fin() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (data) { fin(); resolve(data); };
      s.onerror = function () { fin(); reject(new Error('red')); };
      var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
      s.src = API + (API.indexOf('?') < 0 ? '?' : '&') + q + '&callback=' + cb;
      (document.body || document.head).appendChild(s);
    });
  }

  // ¿El producto del código "pc" abre la página "x"? Un código puede tener varios: "general,vocabulario-VIP"
  // (la misma regla que cubre_ en el Apps Script)
  function cubre(pc, x) {
    if (!pc || !x) return false;
    x = puerta(x);
    var cat = x.split('-')[0], resto = x.slice(cat.length + 1);
    return String(pc).split(',').some(function (u) {
      if (u === x || (u === 'TODO-VIP' && cat !== 'descarga')) return true;
      if (cat === 'area') {
        if (u === 'general' || /^(repaso|fijas|tarjetas)-VIP$/.test(u)) return true;
        var m = /^(curso|repaso|fijas|tarjetas)-(.+)$/.exec(u);
        return !!m && AREA_DE[m[2]] === resto;
      }
      if (cat === 'simulacro' || cat === 'duelo' || cat === 'examenes') return u === 'general';
      if (cat === 'seminario' || cat === 'banqueo') return u === 'seminario-VIP' || u === cat + '-VIP' || (!!resto && u === 'curso-' + resto);
      if (cat === 'vocabulario') return u === 'vocabulario-VIP';
      if (cat === 'biblioteca') return u === 'biblioteca-VIP';
      if (cat === 'descarga') return u === 'descarga-VIP';
      return false;
    });
  }
  // Accesos del sistema anterior (antes de los códigos del panel)
  function antiguo(x) {
    if (/^(area|duelo|examenes|biblioteca)/.test(puerta(x))) return false;
    var cat = x.split('-')[0];
    return leer('unlocked_' + x) === '1' || leer('unlocked_' + cat + '-VIP') === '1';
  }
  function codigosPara(x) {
    var a = accesos();
    return Object.keys(a).filter(function (c) { return cubre(a[c].producto, x); });
  }

  /* ---- Abierto para todos desde el panel ----
     Las mismas claves que abiertoPara_ en el Apps Script: TODO, general, seminario,
     vocabulario, biblioteca o la página misma (area-x, simulacro, seminario-x…) */
  function hoyLima() { return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); }
  function abiertos() { try { return JSON.parse(leer(K_ABIERTOS) || 'null') || { t: 0, abiertos: {} }; } catch (e) { return { t: 0, abiertos: {} }; } }
  function clavesAbierto(x) {
    x = puerta(x);
    var cat = x.split('-')[0], claves = ['TODO', cat, x];
    if (['area', 'simulacro', 'duelo', 'examenes'].indexOf(cat) >= 0) claves.push('general');
    if (cat === 'banqueo') claves.push('seminario');
    return claves;
  }
  function abiertoLocal(x) {
    var ab = abiertos().abiertos || {}, hoy = hoyLima();
    return clavesAbierto(x).some(function (k) { var a = ab[k]; return !!a && (!a.hasta || hoy <= a.hasta); });
  }
  // Pregunta al servidor qué está abierto. Si cambió, avisa (candado.js vuelve a pintar las tarjetas)
  var alAbiertos = [];
  function revisarAbiertos() {
    var antes = abiertos();
    if (LIBRE || Date.now() - (antes.t || 0) < 2 * 60 * 1000) return;
    jsonp2({ action: 'abiertos' }).then(function (r) {
      // Apps Script sin la acción (antes de v18): no se toca nada
      if (!r || !r.ok || !r.abiertos) return;
      var cambio = JSON.stringify(r.abiertos) !== JSON.stringify(antes.abiertos || {});
      escribir(K_ABIERTOS, JSON.stringify({ t: Date.now(), abiertos: r.abiertos }));
      if (cambio) alAbiertos.forEach(function (fn) { try { fn(); } catch (e) {} });
    }).catch(function () {});
  }
  // La respuesta de cada página revisada también dice si está abierta
  function anotarAbierto(x, si) {
    if (abiertoLocal(x) === si) return;
    var a = abiertos();
    a.abiertos = a.abiertos || {};
    if (si) a.abiertos[puerta(x)] = { hasta: '' };
    else { clavesAbierto(x).forEach(function (k) { delete a.abiertos[k]; }); a.t = 0; } // se cerró algo: la próxima página vuelve a preguntar todo
    escribir(K_ABIERTOS, JSON.stringify(a));
  }

  // Sin esperar al servidor: ¿hay un acceso reciente en este dispositivo?
  function accesoLocal(x) {
    if (LIBRE) return true;
    x = puerta(x);
    if (abiertoLocal(x)) return true;
    if (idCubre(x)) return true;
    var a = accesos(), hoy = Date.now();
    return codigosPara(x).some(function (c) { return hoy - (a[c].ok || 0) < 3 * DIA; }) || antiguo(x);
  }

  /* ---- Códigos guardados en la cuenta de Google ---- */
  // Espera a auth.js (se carga después) y a que diga si hay sesión. null = sin cuenta
  function cuenta() {
    return new Promise(function (resolve) {
      var n = 0;
      (function esperar() {
        if (window.MCAuth) {
          var t = setTimeout(function () { resolve(null); }, 5000);
          MCAuth.listo.then(function (c) { clearTimeout(t); resolve(MCAuth.usuario() ? c : null); }, function () { clearTimeout(t); resolve(null); });
        } else if (++n < 20) setTimeout(esperar, 100);
        else resolve(null);
      })();
    });
  }
  // Trae los códigos de la cuenta a este dispositivo. Devuelve los códigos que tiene la cuenta,
  // también los quitados (null = no se pudo). Uno quitado no se trae, y si aquí está con su aviso, se borra
  function traerDeCuenta() {
    return cuenta().then(function (c) {
      if (!c) return null;
      var leer = function (cols) { return c.from('codigos_cuenta').select(cols); };
      // Sin supabase/48 todavía no existe la columna quitado
      return leer('codigo,producto,vence,quitado').then(function (r) { return r.error ? leer('codigo,producto,vence') : r; }).then(function (r) {
        if (r.error || !r.data) return null;
        var a = accesos(), cambios = 0;
        r.data.forEach(function (f) {
          if (f.quitado) { if (a[f.codigo] && a[f.codigo].error) { delete a[f.codigo]; cambios++; } }
          else if (!a[f.codigo]) { a[f.codigo] = { producto: f.producto, ok: 0, vence: f.vence || '' }; cambios++; }
        });
        if (cambios) guardar(a);
        return r.data.map(function (f) { return f.codigo; });
      });
    }).catch(function () { return null; });
  }
  // Sube a la cuenta los códigos de este dispositivo (los activados antes de entrar con Google también)
  // nuevo: recién escrito por el alumno, vuelve a la cuenta aunque antes lo haya quitado
  function subirACuenta(cods, nuevo) {
    var a = accesos();
    var lista = (cods || Object.keys(a)).filter(function (k) { return a[k]; })
      .map(function (k) { var x = { codigo: k, producto: a[k].producto, vence: a[k].vence || '' }; if (nuevo) x.nuevo = true; return x; });
    if (!lista.length) return Promise.resolve();
    return cuenta().then(function (c) { if (c) return c.rpc('guardar_codigos_cuenta', { p: lista }); }).catch(function () {});
  }
  function quitarDeCuenta(cod) {
    return cuenta().then(function (c) { if (c) return c.rpc('quitar_codigo_cuenta', { p_codigo: cod }); }).catch(function () {});
  }
  // Al entrar o cambiar de cuenta: junta lo del dispositivo con lo de la cuenta
  (function sincronizarAlEntrar() {
    var n = 0, ultimo = null;
    (function esperar() {
      if (!window.MCAuth) { if (++n < 50) setTimeout(esperar, 200); return; }
      function alEntrar(u) {
        var id = u ? u.id : null;
        if (!id || id === ultimo) return;
        ultimo = id;
        // Una vez cada 30 min por sesión basta (antes se hacía en cada página)
        var kSync = 'mc_cod_sync_' + id;
        try { if (Date.now() - (+sessionStorage.getItem(kSync) || 0) < 30 * 60000) return; sessionStorage.setItem(kSync, String(Date.now())); } catch (e) {}
        // Los que solo están en este dispositivo (activados antes de entrar con Google) suben a la cuenta
        traerDeCuenta().then(function (enCuenta) {
          if (!enCuenta) return;
          // Los que ya no sirven aquí no se suben
          var a = accesos(), solo = Object.keys(a).filter(function (k) { return enCuenta.indexOf(k) < 0 && !a[k].error; });
          if (solo.length) return subirACuenta(solo);
        });
      }
      MCAuth.alCambiar(alEntrar);
      MCAuth.listo.then(function () { alEntrar(MCAuth.usuario()); }, function () {});
    })();
  })();

  // Revisa con el servidor. Resuelve { acceso, motivo, mensaje }
  function verificar(x) {
    if (LIBRE) return Promise.resolve({ acceso: true });
    x = puerta(x);
    // Primero lo dado por ID (Supabase); si no lo cubre, los códigos de siempre
    return refrescarID(!idCubre(x)).then(function () {
      // Abierta por ID: si se lo quitan con la página abierta, se recarga (y el candado lo pide)
      if (idCubre(x)) { document.documentElement.classList.add('mc-por-id'); return { acceso: true, motivo: 'id' }; }
      return porCodigo(x);
    });
  }
  function porCodigo(x) {
    // Sin código en este dispositivo: buscar en la cuenta de Google antes de pedirlo
    var previo = codigosPara(x).length ? Promise.resolve() : traerDeCuenta();
    return previo.then(function () { return revisar(x); });
  }
  function revisar(x) {
    var cods = codigosPara(x);
    return jsonp2({ action: 'acceso', producto: x, dispositivo: dispositivo(), codigos: cods.join(','), equipo: equipo() })
      .then(function (r) {
        if (r && r.ok) ultimaRevision = Date.now();
        // Apps Script sin los paquetes nuevos: no deja a nadie afuera mientras se actualiza
        if (r && !r.ok && /producto no v[aá]lido/i.test(r.error || '')) return { acceso: true, motivo: 'servidor-antiguo' };
        if (!r || !r.ok) throw new Error('respuesta');
        anotarAbierto(x, !!r.abierto);
        var a = accesos(), mensaje = '';
        Object.keys(r.estados || {}).forEach(function (c) {
          if (r.estados[c] === 'ok') { if (a[c]) { a[c].ok = Date.now(); delete a[c].error; } }
          else if (LIBERADO.test(r.estados[c])) { mensaje = mensaje || r.estados[c]; delete a[c]; quitarDeCuenta(c); }
          else {
            // Se queda en la lista con su aviso (Perfil · Mis accesos) para que el alumno sepa qué pasó
            mensaje = mensaje || r.estados[c];
            if (a[c]) { a[c].ok = 0; a[c].error = r.estados[c]; }
          }
        });
        guardar(a);
        if (r.abierto) return { acceso: true, motivo: 'abierto' };
        if (r.valido) return { acceso: true, motivo: 'codigo', codigo: r.valido };
        if (r.legacy && antiguo(x)) return { acceso: true, motivo: 'antiguo' };
        // El código ya se borró (equipo liberado): el candado igual dice por qué lo pide otra vez
        var av = leer(K_AVISO);
        if (av) escribir(K_AVISO, '');
        return { acceso: false, mensaje: mensaje || av || '' };
      })
      .catch(function () {
        var a = accesos();
        var reciente = cods.some(function (c) { return Date.now() - (a[c].ok || 0) < 7 * DIA; });
        if (reciente) return { acceso: true, motivo: 'sin-conexion' };
        if (antiguo(x)) return { acceso: true, motivo: 'antiguo' };
        return { acceso: false, error: 'conexion' };
      });
  }

  // Activa un código. producto = página actual (o '' desde el inicio)
  function activar(codigo, x) {
    codigo = String(codigo || '').toUpperCase().replace(/\s+/g, '');
    return jsonp2({ action: 'activar', codigo: codigo, producto: puerta(x || ''), dispositivo: dispositivo(), equipo: equipo() })
      .then(function (r) {
        if (r && r.ok) {
          var a = accesos();
          a[r.codigo] = { producto: r.producto, ok: Date.now(), vence: r.vence || '' };
          guardar(a);
          subirACuenta([r.codigo], true);
        }
        return r || { ok: false, mensaje: 'Respuesta inválida del servidor.' };
      });
  }

  // Los que funcionan. todos() incluye los que el servidor rechazó, con su aviso
  function todos() {
    var a = accesos();
    return Object.keys(a).map(function (c) { return { codigo: c, producto: a[c].producto, vence: a[c].vence, error: a[c].error || '' }; });
  }
  function activos() {
    return todos().filter(function (x) { return !x.error; })
      .concat(idActivos().map(function (g) { return { codigo: 'ID', producto: g.producto, vence: g.vence || '', porId: true }; }));
  }

  // Si el navegador tiene varias cuentas de Google, a veces el Apps Script no responde a la primera
  function jsonp2(params) {
    return jsonp(params).catch(function () { return jsonp(params); });
  }

  // Cómo está cada código en el servidor: equipos usados, vencimiento, quitadas del mes
  function estado() {
    var cods = Object.keys(accesos());
    if (!cods.length) return Promise.resolve({});
    return jsonp2({ action: 'misCodigos', codigos: cods.join(','), dispositivo: dispositivo() }).then(function (r) {
      if (!r || !r.ok) return null;
      var m = {}, a = accesos(), cambios = 0;
      (r.codigos || []).forEach(function (c) {
        m[c.codigo] = c;
        // Queda anotado aquí que ya no sirve: así no se sube a la cuenta y la limpieza lo reconoce
        if (MALOS[c.estado] && a[c.codigo] && !a[c.codigo].error) { a[c.codigo].ok = 0; a[c.codigo].error = c.mensaje || 'Este código ya no funciona en este equipo.'; cambios++; }
      });
      if (cambios) guardar(a);
      return m;
    }).catch(function () { return null; });
  }

  // Quita un código de este equipo: libera su cupo en el servidor y lo borra de aquí y de la cuenta
  // soloAqui: sin conexión con el servidor, lo borra de este equipo sin liberar el cupo
  // Resuelve cuando ya se marcó también en la cuenta (así una recarga no lo trae de vuelta)
  function soltar(cod, soloAqui) {
    function borrar(r) {
      var a = accesos(); delete a[cod]; guardar(a);
      return quitarDeCuenta(cod).then(function () { return r; });
    }
    if (soloAqui) return borrar({ ok: true, liberado: false });
    return jsonp2({ action: 'soltar', codigo: cod, dispositivo: dispositivo() }).then(function (r) {
      if (r && r.ok) return borrar(r);
      // Apps Script sin actualizar: igual se quita de este equipo
      if (r && /acci[oó]n no v[aá]lida/i.test(r.error || '')) return borrar({ ok: true, liberado: false });
      return r || { ok: false, mensaje: 'Respuesta inválida del servidor.' };
    });
  }

  /* ---- Acceso por ID (supabase/70-acceso-por-id.sql) ----
     { uid, t: última pregunta, ok: última respuesta buena, permitido, equipos, max, lista: [{ id, producto, vence }] } */
  function cacheID() { try { return JSON.parse(leer(K_ID) || 'null') || {}; } catch (e) { return {}; } }
  function vigenteID(g) { return !!g && (!g.vence || g.vence >= hoyLima()); }
  // Lo que vale en este equipo: de la cuenta con la que se entró, sin vencer y confirmado hace menos de 7 días
  function idActivos() {
    var c = cacheID(), u = window.MCAuth && MCAuth.usuario ? MCAuth.usuario() : null;
    if (!c.lista || !c.permitido || Date.now() - (c.ok || 0) > 7 * DIA) return [];
    if (u && c.uid && u.id !== c.uid) return [];
    return c.lista.filter(vigenteID);
  }
  function idCubre(x) { return idActivos().some(function (g) { return cubre(g.producto, x); }); }
  var pidiendoID = null;
  // Pregunta a Supabase como mucho una vez cada 2 minutos.
  // ya: la página no abre con lo guardado, se vuelve a preguntar si pasaron 20 s (por si se lo acaban de dar)
  function refrescarID(ya) {
    if (LIBRE) return Promise.resolve();
    var antes = cacheID();
    if (Date.now() - (antes.t || 0) < (ya ? 20 * 1000 : 2 * 60 * 1000)) return Promise.resolve();
    if (pidiendoID) return pidiendoID;
    pidiendoID = cuenta().then(function (c) {
      if (!c) return;
      return c.rpc('mis_accesos_id', { p_dispositivo: dispositivo(), p_equipo: equipo() }).then(function (r) {
        if (r.error || !r.data) return;   // sin supabase/70 todavía: no se toca nada
        var d = r.data, u = MCAuth.usuario();
        var lista = (d.lista || []).map(function (g) { return { id: g.id, producto: g.producto, vence: g.vence || '' }; });
        var ahora = { uid: u ? u.id : '', t: Date.now(), ok: Date.now(), permitido: d.permitido !== false, equipos: d.equipos || 0, max: d.max || 0, lista: lista };
        escribir(K_ID, JSON.stringify(ahora));
        var nuevos = (d.lista || []).filter(function (g) { return g.nuevo; });
        if (nuevos.length) avisoActivado(nuevos);
        // ¿Se quitó algo que abría? (o este equipo quedó fuera)
        var tenia = (antes.permitido ? antes.lista || [] : []).filter(vigenteID).map(function (g) { return g.id; });
        var tiene = (ahora.permitido ? lista : []).map(function (g) { return g.id; });
        var perdio = tenia.some(function (id) { return tiene.indexOf(id) < 0; });
        var cambio = perdio || tiene.some(function (id) { return tenia.indexOf(id) < 0; });
        if (cambio) alAbiertos.forEach(function (fn) { try { fn(); } catch (e) {} });
        if (perdio && document.documentElement.classList.contains('mc-por-id')) location.reload();
      });
    }).catch(function () {}).then(function () { pidiendoID = null; });
    return pidiendoID;
  }
  function idEstado() { var c = cacheID(); return { lista: idActivos(), permitido: c.permitido !== false, equipos: c.equipos || 0, max: c.max || 0, t: c.ok || 0 }; }

  // «¡Acceso activado!» la primera vez que el alumno entra después de que se lo dieron
  var NOM = { 'TODO-VIP': 'Acceso total', general: 'Acceso general', 'seminario-VIP': 'Seminarios + Banqueo', 'vocabulario-VIP': 'Vocabulario', 'biblioteca-VIP': 'Biblioteca', 'descarga-VIP': 'Descargas PDF', simulacro: 'Simulacro', duelo: 'Duelos', examenes: 'Exámenes',
    'area-matematica': 'Área Matemática', 'area-ciencia-tecnologia': 'Área Ciencia y Tecnología', 'area-comunicacion': 'Área Comunicación', 'area-ciencias-sociales': 'Área Ciencias Sociales' };
  function nombreProd(p) { return String(p || '').split(',').map(function (x) { return NOM[x] || x; }).join(' + '); }
  function avisoActivado(nuevos) {
    function pintar() {
      if (document.getElementById('mcIdAviso')) return;
      var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      var vence = nuevos.map(function (g) { return g.vence; }).filter(Boolean).sort().pop();
      var o = document.createElement('div');
      o.id = 'mcIdAviso';
      o.setAttribute('role', 'dialog');
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,3,15,.75);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Nunito,Inter,system-ui,sans-serif';
      o.innerHTML = '<div style="background:#1a1530;border:2px solid #302950;border-bottom-width:5px;border-radius:20px;max-width:360px;width:100%;text-align:center;padding:26px 22px;color:#ece8ff">' +
        '<div style="font-size:52px;line-height:1">🎉</div>' +
        '<div style="font:900 11px Nunito,sans-serif;letter-spacing:2px;color:#38bdf8;margin-top:10px">¡ACCESO ACTIVADO!</div>' +
        '<div style="font:900 28px/1.1 \'Barlow Condensed\',Nunito,sans-serif;text-transform:uppercase;margin:6px 0 10px">' + esc(nuevos.map(function (g) { return nombreProd(g.producto); }).join(' · ')) + '</div>' +
        '<div style="font-size:14px;color:#c9c2e8;line-height:1.5">Modo Cachimbo lo activó en tu cuenta. Entra con tu Google en tu celular o laptop y se abre solo' +
        (vence ? ', hasta el <b style="color:#fff">' + vence.split('-').reverse().join('/') + '</b>' : '') + '.</div>' +
        '<button type="button" style="margin-top:18px;width:100%;border:0;border-bottom:4px solid #8aa300;background:#c8e600;color:#151127;font:900 15px Nunito,sans-serif;padding:14px;border-radius:14px;text-transform:uppercase;cursor:pointer">¡Vamos!</button></div>';
      o.querySelector('button').addEventListener('click', function () { o.remove(); });
      document.body.appendChild(o);
    }
    if (document.body) pintar(); else document.addEventListener('DOMContentLoaded', pintar);
  }

  /* ---- Acceso cortado desde el panel ----
     Con la página abierta se pregunta al servidor cada 5 minutos y al volver a la pestaña o a la app
     (como mucho una vez por minuto). Si el profesor liberó este equipo, desactivó o borró el código,
     la página se recarga y los candados vuelven a pedirlo. Si fue liberado, el código se borra de
     este equipo y de la cuenta (para que no se junten códigos que ya no sirven); si no, queda con su aviso.
     El avance y la XP viven en Supabase y no se tocan. */
  var LIBERADO = /fue liberado/i;
  var CORTADO = { liberado: 1, desactivado: 1, 'no-existe': 1 };
  var MALOS = { vencido: 1, desactivado: 1, 'no-existe': 1, lleno: 1 };
  var ultimaRevision = 0;
  function vigilar() {
    if (document.visibilityState !== 'hidden') refrescarID();
    if (LIBRE || document.visibilityState === 'hidden' || Date.now() - ultimaRevision < 60 * 1000) return;
    var a = accesos(), cods = Object.keys(a).filter(function (c) { return !a[c].error; });
    if (!cods.length) return;
    ultimaRevision = Date.now();
    jsonp2({ action: 'misCodigos', codigos: cods.join(','), dispositivo: dispositivo() }).then(function (r) {
      if (!r || !r.ok) return;
      var a = accesos(), cortados = 0, borrando = [];
      (r.codigos || []).forEach(function (c) {
        if (!CORTADO[c.estado] || !a[c.codigo] || a[c.codigo].error) return;
        if (c.estado === 'liberado') { delete a[c.codigo]; borrando.push(quitarDeCuenta(c.codigo)); escribir(K_AVISO, c.mensaje || ''); }
        else { a[c.codigo].ok = 0; a[c.codigo].error = c.mensaje || 'Este código ya no funciona en este equipo.'; }
        cortados++;
      });
      if (!cortados) return;
      guardar(a);
      // Recarga cuando ya se borró también de la cuenta (o a los 6 s, si la cuenta no responde)
      var recargar = function () { location.reload(); }, t = setTimeout(recargar, 6000);
      Promise.all(borrando).then(function () { clearTimeout(t); recargar(); });
    }).catch(function () {});
  }
  setInterval(vigilar, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', vigilar);
  window.addEventListener('focus', vigilar);
  setTimeout(vigilar, 4000);
  revisarAbiertos();
  setTimeout(function () { refrescarID(); }, 1500);

  window.MCAcceso = { verificar: verificar, activar: activar, activos: activos, todos: todos, estado: estado, soltar: soltar, accesoLocal: accesoLocal, idEstado: idEstado, refrescarID: refrescarID, nombreProd: nombreProd, alAbiertos: function (fn) { alAbiertos.push(fn); }, antiguo: antiguo, cubre: cubre, puerta: puerta, AREAS: AREAS };
})();

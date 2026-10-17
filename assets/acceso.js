/* =========================================================
   Modo Cachimbo · Acceso con código (Repaso y Fijas)
   - Cada dispositivo tiene un identificador propio
   - Los códigos activados se guardan en el navegador y se revisan al entrar
   - Si no hay internet, se respeta el último acceso válido (7 días)
   - Si el alumno entró con Google, sus códigos se guardan en su cuenta
     (supabase/15-codigos-cuenta.sql): en otro equipo, o si se borraron
     los datos del navegador, vuelven solos sin escribirlos otra vez.
     El servidor igual revisa cada código y cuenta cada dispositivo.
   Requiere assets/mc-config.js
   ========================================================= */
(function () {
  var CFG = window.MC_CONFIG || {};
  var API = CFG.API_URL || CFG.REPORTES_URL || '';
  var K_DISP = 'mc_dispositivo', K_ACC = 'mc_accesos';
  var DIA = 24 * 3600 * 1000;
  var memoria = {};

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

  function jsonp(params) {
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

  // ¿El producto del código "pc" abre la página "x"? Un código puede tener varios: "fijas-VIP,simulacro"
  function cubre(pc, x) {
    if (!pc || !x) return false;
    var cat = x.split('-')[0], curso = x.slice(cat.length + 1);
    return String(pc).split(',').some(function (u) {
      return u === x || u === 'TODO-VIP' || u === cat + '-VIP' || (!!curso && u === 'curso-' + curso);
    });
  }
  // Accesos del sistema anterior (antes de los códigos del panel)
  function antiguo(x) {
    var cat = x.split('-')[0];
    return leer('unlocked_' + x) === '1' || leer('unlocked_' + cat + '-VIP') === '1';
  }
  function codigosPara(x) {
    var a = accesos();
    return Object.keys(a).filter(function (c) { return cubre(a[c].producto, x); });
  }

  // Sin esperar al servidor: ¿hay un acceso reciente en este dispositivo?
  function accesoLocal(x) {
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
  // Trae los códigos de la cuenta a este dispositivo. Devuelve los códigos que tiene la cuenta (null = no se pudo)
  function traerDeCuenta() {
    return cuenta().then(function (c) {
      if (!c) return null;
      return c.from('codigos_cuenta').select('codigo,producto,vence').then(function (r) {
        if (r.error || !r.data) return null;
        var a = accesos(), nuevos = 0;
        r.data.forEach(function (f) { if (!a[f.codigo]) { a[f.codigo] = { producto: f.producto, ok: 0, vence: f.vence || '' }; nuevos++; } });
        if (nuevos) guardar(a);
        return r.data.map(function (f) { return f.codigo; });
      });
    }).catch(function () { return null; });
  }
  // Sube a la cuenta los códigos de este dispositivo (los activados antes de entrar con Google también)
  function subirACuenta(cods) {
    var a = accesos();
    var lista = (cods || Object.keys(a)).filter(function (k) { return a[k]; })
      .map(function (k) { return { codigo: k, producto: a[k].producto, vence: a[k].vence || '' }; });
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
        // Los que solo están en este dispositivo (activados antes de entrar con Google) suben a la cuenta
        traerDeCuenta().then(function (enCuenta) {
          if (!enCuenta) return;
          var solo = Object.keys(accesos()).filter(function (k) { return enCuenta.indexOf(k) < 0; });
          if (solo.length) return subirACuenta(solo);
        });
      }
      MCAuth.alCambiar(alEntrar);
      MCAuth.listo.then(function () { alEntrar(MCAuth.usuario()); }, function () {});
    })();
  })();

  // Revisa con el servidor. Resuelve { acceso, motivo, mensaje }
  function verificar(x) {
    // Sin código en este dispositivo: buscar en la cuenta de Google antes de pedirlo
    var previo = codigosPara(x).length ? Promise.resolve() : traerDeCuenta();
    return previo.then(function () { return revisar(x); });
  }
  function revisar(x) {
    var cods = codigosPara(x);
    return jsonp({ action: 'acceso', producto: x, dispositivo: dispositivo(), codigos: cods.join(','), equipo: equipo() })
      .then(function (r) {
        if (!r || !r.ok) throw new Error('respuesta');
        var a = accesos(), mensaje = '';
        Object.keys(r.estados || {}).forEach(function (c) {
          if (r.estados[c] === 'ok') { if (a[c]) { a[c].ok = Date.now(); delete a[c].error; } }
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
        return { acceso: false, mensaje: mensaje };
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
    return jsonp({ action: 'activar', codigo: codigo, producto: x || '', dispositivo: dispositivo(), equipo: equipo() })
      .then(function (r) {
        if (r && r.ok) {
          var a = accesos();
          a[r.codigo] = { producto: r.producto, ok: Date.now(), vence: r.vence || '' };
          guardar(a);
          subirACuenta([r.codigo]);
        }
        return r || { ok: false, mensaje: 'Respuesta inválida del servidor.' };
      });
  }

  // Los que funcionan. todos() incluye los que el servidor rechazó, con su aviso
  function todos() {
    var a = accesos();
    return Object.keys(a).map(function (c) { return { codigo: c, producto: a[c].producto, vence: a[c].vence, error: a[c].error || '' }; });
  }
  function activos() { return todos().filter(function (x) { return !x.error; }); }

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
      var m = {};
      (r.codigos || []).forEach(function (c) { m[c.codigo] = c; });
      return m;
    }).catch(function () { return null; });
  }

  // Quita un código de este equipo: libera su cupo en el servidor y lo borra de aquí y de la cuenta
  // soloAqui: sin conexión con el servidor, lo borra de este equipo sin liberar el cupo
  function soltar(cod, soloAqui) {
    function borrar() {
      var a = accesos(); delete a[cod]; guardar(a);
      quitarDeCuenta(cod);
    }
    if (soloAqui) { borrar(); return Promise.resolve({ ok: true, liberado: false }); }
    return jsonp2({ action: 'soltar', codigo: cod, dispositivo: dispositivo() }).then(function (r) {
      if (r && r.ok) { borrar(); return r; }
      // Apps Script sin actualizar: igual se quita de este equipo
      if (r && /acci[oó]n no v[aá]lida/i.test(r.error || '')) { borrar(); return { ok: true, liberado: false }; }
      return r || { ok: false, mensaje: 'Respuesta inválida del servidor.' };
    });
  }

  window.MCAcceso = { verificar: verificar, activar: activar, activos: activos, todos: todos, estado: estado, soltar: soltar, accesoLocal: accesoLocal, antiguo: antiguo, cubre: cubre };
})();

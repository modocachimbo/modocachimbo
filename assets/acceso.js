/* =========================================================
   Modo Cachimbo · Acceso con código (Repaso y Fijas)
   - Cada dispositivo tiene un identificador propio
   - Los códigos activados se guardan en el navegador y se revisan al entrar
   - Si no hay internet, se respeta el último acceso válido (7 días)
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

  // ¿El producto del código "pc" abre la página "x"?
  function cubre(pc, x) {
    if (!pc || !x) return false;
    if (pc === x || pc === 'TODO-VIP') return true;
    var cat = x.split('-')[0], curso = x.slice(cat.length + 1);
    return pc === cat + '-VIP' || pc === 'curso-' + curso;
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

  // Revisa con el servidor. Resuelve { acceso, motivo, mensaje }
  function verificar(x) {
    var cods = codigosPara(x);
    return jsonp({ action: 'acceso', producto: x, dispositivo: dispositivo(), codigos: cods.join(','), equipo: equipo() })
      .then(function (r) {
        if (!r || !r.ok) throw new Error('respuesta');
        var a = accesos(), mensaje = '';
        Object.keys(r.estados || {}).forEach(function (c) {
          if (r.estados[c] === 'ok') { if (a[c]) a[c].ok = Date.now(); }
          else { mensaje = mensaje || r.estados[c]; delete a[c]; }
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
        }
        return r || { ok: false, mensaje: 'Respuesta inválida del servidor.' };
      });
  }

  function activos() {
    var a = accesos();
    return Object.keys(a).map(function (c) { return { codigo: c, producto: a[c].producto, vence: a[c].vence }; });
  }

  window.MCAcceso = { verificar: verificar, activar: activar, activos: activos, accesoLocal: accesoLocal, antiguo: antiguo, cubre: cubre };
})();

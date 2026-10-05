/* =========================================================
   Modo Cachimbo · Cuentas de alumnos (Supabase)
   - Ingresar con Google o con un enlace al correo
   - Botón "Ingresar" / foto del alumno en cualquier elemento
     con el atributo data-mc-auth
   - window.MCAuth para las demás páginas (perfil, progreso…)
   Requiere assets/mc-config.js (SUPABASE_URL y SUPABASE_KEY)
   ========================================================= */
(function () {
  var CFG = window.MC_CONFIG || {};
  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
  var script = document.currentScript;
  // Carpeta raíz del sitio, para que los enlaces funcionen desde cualquier página
  var BASE = script && script.src ? script.src.replace(/assets\/auth\.js(\?.*)?$/, '') : './';

  var cliente = null, sesion = null, perfilCache = null, iniciado = false;
  var oyentes = [];

  function cargarSDK() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SDK;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('sin-sdk')); };
      document.head.appendChild(s);
    });
  }

  var listo = (CFG.SUPABASE_URL && CFG.SUPABASE_KEY ? cargarSDK() : Promise.reject(new Error('sin-config')))
    .then(function () {
      cliente = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      cliente.auth.onAuthStateChange(function (evento, s) {
        var antes = sesion && sesion.user.id, ahora = s && s.user.id;
        sesion = s;
        if (antes !== ahora) { perfilCache = null; if (iniciado) avisar(); }
      });
      return cliente.auth.getSession();
    })
    .then(function (r) {
      sesion = r.data.session;
      // Quita el #access_token=… de la barra después de entrar
      if (/access_token=|error_description=/.test(location.hash) || location.href.slice(-1) === '#') {
        history.replaceState(null, '', location.pathname + location.search);
      }
      iniciado = true;
      avisar();
      return cliente;
    });
  listo.catch(function () { iniciado = true; avisar(); });

  function usuario() { return sesion ? sesion.user : null; }

  // La racha (assets/racha.js) se carga sola cuando hay alumno con sesión
  var rachaPedida = false;
  function cargarRacha() {
    if (rachaPedida || window.MCRacha || !usuario()) return;
    rachaPedida = true;
    var s = document.createElement('script');
    s.src = BASE + 'assets/racha.js';
    document.head.appendChild(s);
    // Progreso del estudiante (assets/progreso.js)
    var g = document.createElement('script');
    g.src = BASE + 'assets/progreso.js';
    document.head.appendChild(g);
    // Avisos de temas y cursos nuevos (assets/novedades.js)
    var n = document.createElement('script');
    n.src = BASE + 'assets/novedades.js';
    document.head.appendChild(n);
  }

  function avisar() {
    // Página privada sin sesión (venció o cerró sesión): a la bienvenida
    if (window.MC_PRIVADA && cliente && iniciado && !usuario() && window.MC_BIENVENIDA) { window.MC_BIENVENIDA(); return; }
    cargarRacha();
    oyentes.forEach(function (fn) { try { fn(usuario()); } catch (e) {} });
    pintarWidgets();
  }

  function alCambiar(fn) { oyentes.push(fn); }

  function volverAqui() { return location.href.split('#')[0]; }

  function entrarGoogle() {
    return listo.then(function (c) {
      return c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volverAqui() } });
    });
  }

  function entrarCorreo(correo) {
    return listo.then(function (c) {
      return c.auth.signInWithOtp({ email: correo, options: { emailRedirectTo: volverAqui() } });
    });
  }

  function salir() {
    return listo.then(function (c) { return c.auth.signOut(); }).then(function () { perfilCache = null; });
  }

  function perfil(forzar) {
    if (!usuario()) return Promise.resolve(null);
    if (perfilCache && !forzar) return Promise.resolve(perfilCache);
    return listo.then(function (c) {
      return c.from('perfiles').select('*').eq('id', usuario().id).maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      perfilCache = r.data || { id: usuario().id };
      return perfilCache;
    });
  }

  function guardarPerfil(datos) {
    if (!usuario()) return Promise.reject(new Error('sin-sesion'));
    var fila = Object.assign({}, datos, { id: usuario().id });
    return listo.then(function (c) {
      return c.from('perfiles').upsert(fila).select().single();
    }).then(function (r) {
      if (r.error) throw r.error;
      perfilCache = r.data;
      pintarWidgets();
      return r.data;
    });
  }

  // Nombre y foto a mostrar: primero el perfil, luego lo que trae Google
  function nombreCorto(p) {
    var u = usuario() || {}, m = u.user_metadata || {};
    var n = (p && (p.apodo || p.nombre)) || m.full_name || m.name || (u.email || '').split('@')[0] || 'Alumno';
    return n.split(' ')[0];
  }
  function foto(p) {
    var m = (usuario() || {}).user_metadata || {};
    var f = (p && p.foto_url) || m.avatar_url || m.picture || '';
    return /^https:\/\//.test(f) ? f : '';
  }

  /* ---------- Interfaz: botón, menú y ventana de ingreso ---------- */

  var CSS = '' +
    '.mcu-btn{background:var(--accent,#C6E000);color:#0e0e0e;font-family:Sora,sans-serif;font-weight:700;font-size:13.5px;padding:9px 20px;border-radius:100px;border:none;cursor:pointer}' +
    '.mcu-btn:hover{opacity:.88}' +
    '.mcu-user{position:relative;display:flex;align-items:center;gap:8px}' +
    '.mcu-chip{display:flex;align-items:center;gap:10px;min-width:132px;max-width:220px;background:var(--surface,#0e0e0e);border:1px solid var(--border,#232323);color:var(--text,#f2f2f2);border-radius:100px;padding:5px 20px 5px 5px;cursor:pointer;font:600 14.5px Inter,sans-serif}' +
    '.mcu-chip .mcu-nom{flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.mcu-chip:hover{border-color:var(--accent,#C6E000)}' +
    '.mcu-av{width:34px;height:34px;border-radius:50%;background:var(--accent,#C6E000);color:#0e0e0e;display:flex;align-items:center;justify-content:center;font:800 13px Sora,sans-serif;overflow:hidden;flex-shrink:0}' +
    '.mcu-av img{width:100%;height:100%;object-fit:cover}' +
    '.mcu-menu{display:none;position:absolute;top:calc(100% + 8px);right:0;min-width:190px;background:var(--surface,#0e0e0e);border:1px solid var(--border,#232323);border-radius:14px;padding:6px;z-index:60;box-shadow:0 20px 40px rgba(0,0,0,.5)}' +
    '.mcu-menu.show{display:block}' +
    '.mcu-menu a,.mcu-menu button{display:block;width:100%;text-align:left;background:none;border:none;color:var(--text,#f2f2f2);font:500 13.5px Inter,sans-serif;padding:10px 12px;border-radius:9px;text-decoration:none;cursor:pointer}' +
    '.mcu-menu a:hover,.mcu-menu button:hover{background:var(--surface-2,#141414);color:var(--accent,#C6E000)}' +
    '.mcu-menu small{display:block;color:var(--text-faint,#5f5f5f);font-size:11.5px;padding:6px 12px 8px;border-bottom:1px solid var(--border,#232323);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.mcu-fondo{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:center;justify-content:center;z-index:200;padding:16px}' +
    '.mcu-fondo.show{display:flex}' +
    '.mcu-caja{background:var(--surface,#0e0e0e);border:1px solid var(--border,#232323);border-radius:22px;padding:28px 24px;width:100%;max-width:380px;position:relative;color:var(--text,#f2f2f2);font-family:Inter,sans-serif}' +
    '.mcu-caja h3{font:800 21px Sora,sans-serif;margin:0 0 6px}' +
    '.mcu-caja p.sub{color:var(--text-dim,#9a9a9a);font-size:13px;line-height:1.55;margin:0 0 20px}' +
    '.mcu-x{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--text-dim,#9a9a9a);font-size:22px;cursor:pointer;line-height:1}' +
    '.mcu-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;border:none;border-radius:12px;padding:12px;font:600 14px Inter,sans-serif;cursor:pointer}' +
    '.mcu-google:hover{background:#ececec}' +
    '.mcu-google svg{width:18px;height:18px}' +
    '.mcu-o{display:flex;align-items:center;gap:10px;color:var(--text-faint,#5f5f5f);font-size:12px;margin:18px 0}' +
    '.mcu-o:before,.mcu-o:after{content:"";flex:1;height:1px;background:var(--border,#232323)}' +
    '.mcu-caja input{width:100%;box-sizing:border-box;background:var(--surface-2,#141414);border:1px solid var(--border,#232323);border-radius:12px;padding:12px;color:var(--text,#f2f2f2);font:500 14px Inter,sans-serif;margin-bottom:10px}' +
    '.mcu-caja input:focus{outline:none;border-color:var(--accent,#C6E000)}' +
    '.mcu-enviar{width:100%;background:var(--accent,#C6E000);color:#0e0e0e;border:none;border-radius:12px;padding:12px;font:700 14px Sora,sans-serif;cursor:pointer}' +
    '.mcu-enviar:disabled,.mcu-google:disabled{opacity:.6;cursor:default}' +
    '.mcu-msg{display:none;margin-top:12px;font-size:12.5px;line-height:1.5;padding:9px 11px;border-radius:9px}' +
    '.mcu-msg.show{display:block}' +
    '.mcu-msg.ok{background:rgba(198,224,0,.1);color:var(--accent,#C6E000)}' +
    '.mcu-msg.error{background:rgba(224,60,60,.08);color:#ff8a8a}' +
    '.mcu-legal{color:var(--text-faint,#5f5f5f);font-size:11px;line-height:1.5;margin-top:16px;text-align:center}';

  var G_SVG = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  var modal = null;

  function el(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function estilos() {
    if (document.getElementById('mcu-css')) return;
    var st = el('style'); st.id = 'mcu-css'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function crearModal() {
    if (modal) return modal;
    estilos();
    var fondo = el('div', 'mcu-fondo');
    fondo.innerHTML =
      '<div class="mcu-caja" role="dialog" aria-modal="true" aria-labelledby="mcu-titulo">' +
        '<button class="mcu-x" type="button" aria-label="Cerrar">×</button>' +
        '<h3 id="mcu-titulo">Ingresa a Modo Cachimbo</h3>' +
        '<p class="sub">Guarda tu avance, activa tus códigos en tu cuenta y estudia desde cualquier equipo.</p>' +
        '<button class="mcu-google" type="button">' + G_SVG + '<span>Continuar con Google</span></button>' +
        '<div class="mcu-o">o con tu correo</div>' +
        '<input type="email" placeholder="tucorreo@gmail.com" autocomplete="email" inputmode="email">' +
        '<button class="mcu-enviar" type="button">Enviarme enlace</button>' +
        '<div class="mcu-msg" role="status"></div>' +
        '<p class="mcu-legal">Solo usamos tu nombre, correo y foto para tu perfil.</p>' +
      '</div>';
    document.body.appendChild(fondo);

    var q = function (s) { return fondo.querySelector(s); };
    var msg = q('.mcu-msg'), input = q('input'), enviar = q('.mcu-enviar'), google = q('.mcu-google');

    function mostrar(texto, tipo) {
      msg.textContent = texto;
      msg.className = 'mcu-msg show ' + tipo;
    }
    function cerrar() { fondo.classList.remove('show'); }

    q('.mcu-x').addEventListener('click', cerrar);
    fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });

    google.addEventListener('click', function () {
      google.disabled = true;
      entrarGoogle().then(function (r) {
        if (r && r.error) throw r.error;
      }).catch(function () {
        google.disabled = false;
        mostrar('No se pudo abrir Google. Revisa tu conexión e inténtalo otra vez.', 'error');
      });
    });

    function porCorreo() {
      var correo = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { mostrar('Escribe un correo válido.', 'error'); return; }
      enviar.disabled = true; enviar.textContent = 'Enviando…';
      entrarCorreo(correo).then(function (r) {
        if (r && r.error) throw r.error;
        mostrar('Listo. Revisa tu correo (y la carpeta de spam) y abre el enlace desde este mismo equipo.', 'ok');
        input.value = '';
      }).catch(function (err) {
        var limite = err && (err.status === 429 || /rate|limit/i.test(err.message || ''));
        mostrar(limite ? 'Se enviaron muchos correos. Espera unos minutos o entra con Google.' :
          'No se pudo enviar el correo. Inténtalo otra vez o entra con Google.', 'error');
      }).then(function () {
        enviar.disabled = false; enviar.textContent = 'Enviarme enlace';
      });
    }
    enviar.addEventListener('click', porCorreo);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') porCorreo(); });

    modal = {
      abrir: function () {
        msg.className = 'mcu-msg'; google.disabled = false;
        fondo.classList.add('show');
      }
    };
    return modal;
  }

  function abrirIngreso() { crearModal().abrir(); }

  function pintarWidgets() {
    var cajas = document.querySelectorAll('[data-mc-auth]');
    // Hasta saber si hay sesión no se dibuja nada (evita el parpadeo de "Ingresar")
    if (!cajas.length || !iniciado) return;
    estilos();
    var u = usuario();
    if (u) perfil().then(function () { dibujar(cajas, u); }, function () { dibujar(cajas, u); });
    dibujar(cajas, u);
  }

  function dibujar(cajas, u) {
    Array.prototype.forEach.call(cajas, function (caja) {
      caja.innerHTML = '';
      if (!u) {
        var b = el('button', 'mcu-btn', 'Ingresar');
        b.type = 'button';
        b.addEventListener('click', abrirIngreso);
        caja.appendChild(b);
        return;
      }
      var cont = el('div', 'mcu-user');
      var chip = el('button', 'mcu-chip'); chip.type = 'button';
      chip.setAttribute('aria-haspopup', 'true');
      var av = el('span', 'mcu-av'), f = foto(perfilCache), n = nombreCorto(perfilCache);
      if (f) { var img = el('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = f; av.appendChild(img); }
      else av.textContent = n.charAt(0).toUpperCase();
      chip.appendChild(av);
      chip.appendChild(el('span', 'mcu-nom', n));
      // Lugar para la racha (lo llena assets/racha.js)
      var racha = el('a', 'mcu-racha'); racha.href = BASE + 'perfil.html#racha';
      racha.setAttribute('data-mc-racha', ''); racha.hidden = true;
      cont.appendChild(racha);

      var menu = el('div', 'mcu-menu');
      menu.appendChild(el('small', '', u.email || ''));
      var aPerfil = el('a', '', 'Mi perfil'); aPerfil.href = BASE + 'perfil.html';
      var bSalir = el('button', '', 'Cerrar sesión'); bSalir.type = 'button';
      bSalir.addEventListener('click', function () { salir(); });
      menu.appendChild(aPerfil); menu.appendChild(bSalir);

      chip.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('show'); });

      cont.appendChild(chip); cont.appendChild(menu);
      caja.appendChild(cont);
    });
    if (u && window.MCRacha) window.MCRacha.pintar();
  }

  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(document.querySelectorAll('.mcu-menu.show'), function (m) {
      if (!m.parentNode.contains(e.target)) m.classList.remove('show');
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarWidgets);
  else pintarWidgets();

  window.MCAuth = {
    listo: listo,
    usuario: usuario,
    perfil: perfil,
    guardarPerfil: guardarPerfil,
    entrarGoogle: entrarGoogle,
    entrarCorreo: entrarCorreo,
    salir: salir,
    alCambiar: alCambiar,
    abrirIngreso: abrirIngreso,
    token: function () { return sesion ? sesion.access_token : ''; },
    base: BASE
  };
})();

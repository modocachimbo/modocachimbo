/* =========================================================
   Modo Cachimbo · Anuncios flotantes (solo en el inicio)
   Se crean en Panel → Web → Anuncios. Datos: supabase/84-anuncios.sql.
   - Sale una imagen al centro. Tocarla (o el botón de abajo) abre el link;
     la X, Esc o tocar afuera la cierra.
   - Como mucho un anuncio al día por alumno (los "cada vez que entra"
     salen una vez por visita). Si hay varios, se turnan.
   - Espera a que no haya otra ventana abierta (código, alertas, tutorial…).
   - Cuenta vista y clic en Supabase (alumno único por día).
   Requiere assets/auth.js (y usa assets/acceso.js si está).
   ========================================================= */
(function () {
  if (window.MCAnuncios) return;
  var SCRIPT = document.currentScript;
  var K_VISTO = 'mc_anuncio_visto', K_HOY = 'mc_anuncio_hoy', K_SES = 'mc_anuncio_ses', K_CACHE = 'mc_anuncios';
  var ICONOS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.4v13.4a3 3 0 1 1-3-3c.3 0 .6 0 .9.1V9a6.4 6.4 0 1 0 5.5 6.4V8.6a8 8 0 0 0 4.4 1.4V6.6a4.5 4.5 0 0 1-4.4-4.6z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.3h-3.2V8.4c0-.9.3-1.6 1.6-1.6h1.7V3.9a23 23 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.3h2.8V22z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 7.5a3 3 0 0 0-2.1-2.1C18 5 12 5 12 5s-6 0-7.9.4A3 3 0 0 0 2 7.5 31 31 0 0 0 1.6 12 31 31 0 0 0 2 16.5a3 3 0 0 0 2.1 2.1C6 19 12 19 12 19s6 0 7.9-.4a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.5 31 31 0 0 0-.4-4.5zM10 15.2V8.8l5.2 3.2z"/></svg>'
  };
  var COLOR = { whatsapp: ['#25D366', '#169C49', '#06240F'], tiktok: ['#F2F2F2', '#9A9A9A', '#0A0A0A'], instagram: ['#E1306C', '#9C1F4A', '#FFFFFF'],
    facebook: ['#1877F2', '#0F4FA8', '#FFFFFF'], youtube: ['#FF3B30', '#B3221A', '#FFFFFF'], web: ['#C6E000', '#8FA300', '#151A03'] };

  var css = '' +
    'body.mcan-abierto{overflow:hidden}' +
    '.mcan-ov{position:fixed;inset:0;z-index:220;display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:rgba(0,0,0,.74);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);animation:mcanF .25s ease}' +
    '.mcan-ov.cerrando{animation:mcanFo .2s ease forwards}' +
    '.mcan-caja{position:relative;width:min(100%,460px);display:flex;flex-direction:column;align-items:stretch;animation:mcanP .38s cubic-bezier(.2,.9,.3,1.25);font-family:Nunito,Inter,system-ui,sans-serif}' +
    '.mcan-ov.cerrando .mcan-caja{animation:mcanPo .2s ease forwards}' +
    '.mcan-img{display:block;width:100%;height:auto;max-height:calc(100vh - 150px);max-height:calc(100dvh - 150px);object-fit:contain;border-radius:20px;' +
      'box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08);background:#111}' +
    '.mcan-img.link{cursor:pointer}' +
    '.mcan-x{position:absolute;top:-14px;right:-10px;width:42px;height:42px;border-radius:50%;background:#1B1B1B;border:2px solid #3A3A3A;' +
      'display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5);padding:0;z-index:2}' +
    '.mcan-x:hover{background:#262626}.mcan-x:focus:not(:focus-visible){outline:none}.mcan-x svg{width:18px;height:18px;stroke:#fff;stroke-width:3;stroke-linecap:round}' +
    '.mcan-tag{align-self:flex-start;margin:0 0 8px 4px;background:rgba(255,255,255,.1);color:#d4d4d4;font-size:11px;font-weight:800;letter-spacing:1.5px;' +
      'padding:4px 9px;border-radius:8px;text-transform:uppercase;max-width:calc(100% - 50px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.mcan-btn{margin-top:14px;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;box-sizing:border-box;border:0;cursor:pointer;' +
      'background:var(--b1);color:var(--b3);box-shadow:0 5px 0 var(--b2);border-radius:14px;padding:14px;font:900 16px/1.1 Nunito,Inter,sans-serif;' +
      'letter-spacing:.5px;text-transform:uppercase;transition:transform .1s}' +
    '.mcan-btn:active{transform:translateY(3px);box-shadow:0 2px 0 var(--b2)}' +
    '.mcan-btn svg{width:21px;height:21px;flex-shrink:0}' +
    '@keyframes mcanF{from{opacity:0}}@keyframes mcanFo{to{opacity:0}}' +
    '@keyframes mcanP{from{opacity:0;transform:scale(.88) translateY(14px)}}@keyframes mcanPo{to{opacity:0;transform:scale(.94)}}' +
    '@media (prefers-reduced-motion:reduce){.mcan-ov,.mcan-caja{animation:none!important}}';

  function hoyLima() { return new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); }
  function leer(st, k, def) { try { var v = JSON.parse(st.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } }
  function poner(st, k, v) { try { st.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ¿Hay otra ventana encima? (código, alertas, tutorial, regalos, hoja de cursos…)
  function ocupado() {
    if (document.hidden) return true;
    if (document.body.classList.contains('mca-open')) return true;
    var sel = '.cod-fondo.show,.mca-ov,.mct-capa,#mcIdAviso,#mckFondo,.mcz-fondo,.mcd-ov,.rep-overlay,.mcj-ov,#hojaFondo,.bienvenida';
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hidden) continue;
      var cs = getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length) return true;
    }
    return false;
  }

  function traer() {
    var c = leer(sessionStorage, K_CACHE, null);
    if (c && Date.now() - c.t < 10 * 60e3) return Promise.resolve(c.d);
    return MCAuth.listo.then(function (cl) { return cl.rpc('anuncios_activos'); }).then(function (r) {
      if (r.error) throw r.error;
      var d = Array.isArray(r.data) ? r.data : [];
      poner(sessionStorage, K_CACHE, { t: Date.now(), d: d });
      return d;
    });
  }

  function activos() {
    try { return (window.MCAcceso && MCAcceso.activos()) || []; } catch (e) { return []; }
  }
  function tieneCodigo() { return activos().length > 0; }
  // ¿Alguno de sus accesos cubre este producto? (los mismos nombres que el panel)
  var AREAS = ['area-matematica', 'area-ciencia-tecnologia', 'area-comunicacion', 'area-ciencias-sociales'];
  function tieneProd(prod, acc) {
    return acc.some(function (x) {
      var pc = String(x.producto || '');
      if (prod === 'TODO-VIP') return pc.split(',').indexOf('TODO-VIP') >= 0;
      if (!window.MCAcceso || !MCAcceso.cubre) return false;
      if (prod === 'area') return AREAS.some(function (k) { return MCAcceso.cubre(pc, k); });
      return MCAcceso.cubre(pc, prod);
    });
  }
  function equipo() {
    if (document.documentElement.classList.contains('mc-app')) return 'app';
    var tactil = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    return tactil && Math.min(screen.width, screen.height) < 820 ? 'celular' : 'pc';
  }
  // Todas las reglas del segmento tienen que cumplirse
  function cumple(seg, perfil) {
    seg = seg || {};
    var acc = null;
    function A() { return acc || (acc = activos()); }
    if (seg.no_tiene && seg.no_tiene.length && seg.no_tiene.some(function (p) { return tieneProd(p, A()); })) return false;
    if (seg.tiene && seg.tiene.length && !seg.tiene.some(function (p) { return tieneProd(p, A()); })) return false;
    if (seg.modalidad && (!perfil || perfil.modalidad !== seg.modalidad)) return false;
    if (seg.cuenta) {
      var u = MCAuth.usuario(), t = u && Date.parse(u.created_at);
      if (!t) return false;
      var nueva = Date.now() - t < (seg.dias || 7) * 864e5;
      if ((seg.cuenta === 'nuevas') !== nueva) return false;
    }
    if (seg.equipo) {
      var e = equipo();
      if (seg.equipo === 'app' ? e !== 'app' : seg.equipo === 'celular' ? e === 'pc' : e !== 'pc') return false;
    }
    return true;
  }

  function elegir(lista, perfil) {
    var hoy = hoyLima(), visto = leer(localStorage, K_VISTO, {}), ses = leer(sessionStorage, K_SES, null);
    if (ses) return null; // ya salió uno en esta visita
    var yaHoy = leer(localStorage, K_HOY, '') === hoy;
    var cod = null;
    var ok = lista.filter(function (a) {
      if (!a || !a.img) return false;
      // En la app de Play Store no salen los anuncios propios (venden códigos) ni los que llevan a WhatsApp
      if (window.MCEnApp && (a.tipo === 'propio' || /wa\.me|whatsapp/i.test(a.link || ''))) return false;
      if (a.publico === 'sin-codigo' || a.publico === 'con-codigo') {
        if (cod === null) cod = tieneCodigo();
        if ((a.publico === 'con-codigo') !== cod) return false;
      }
      if ((a.publico === 'Ordinario' || a.publico === 'CPU') && (!perfil || perfil.modalidad !== a.publico)) return false;
      if (!cumple(a.segmento, perfil)) return false;
      var v = visto[a.id];
      if (a.frecuencia === 'una-vez') return !v && !yaHoy;
      if (a.frecuencia === 'dia') return (!v || v.slice(0, 10) !== hoy) && !yaHoy;
      return true; // siempre: una vez por visita
    });
    if (!ok.length) return null;
    // Avisos primero; entre los demás, el que hace más tiempo no sale (se turnan)
    ok.sort(function (a, b) {
      if ((a.tipo === 'aviso') !== (b.tipo === 'aviso')) return a.tipo === 'aviso' ? -1 : 1;
      return String(visto[a.id] || '').localeCompare(String(visto[b.id] || ''));
    });
    return ok[0];
  }

  function evento(a, que) {
    MCAuth.listo.then(function (c) { return c.rpc('anuncio_evento', { p_id: a.id, p_que: que }); }).then(function () {}, function () {});
  }

  function mostrar(a, img, prueba) {
    if (!document.getElementById('mcanCss')) {
      var st = document.createElement('style'); st.id = 'mcanCss'; st.textContent = css; document.head.appendChild(st);
    }
    var link = /^https:\/\//.test(a.link || '') ? a.link : '';
    var ic = ICONOS[a.icono] ? a.icono : 'web', col = COLOR[ic];
    var ov = document.createElement('div');
    ov.className = 'mcan-ov';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Anuncio');
    ov.innerHTML = '<div class="mcan-caja">' +
      (a.tipo === 'patrocinado' ? '<span class="mcan-tag">Publicidad' + (a.anunciante ? ' · ' + esc(a.anunciante) : '') + '</span>' : '') +
      '<div style="position:relative">' +
        '<button class="mcan-x" type="button" aria-label="Cerrar anuncio"><svg viewBox="0 0 24 24" fill="none"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>' +
      '</div>' +
      (link && a.boton ? '<button class="mcan-btn" type="button" style="--b1:' + col[0] + ';--b2:' + col[1] + ';--b3:' + col[2] + '">' + ICONOS[ic] + '<span>' + esc(a.boton) + '</span></button>' : '') +
      '</div>';
    var marco = ov.querySelector('.mcan-caja > div');
    img.className = 'mcan-img' + (link ? ' link' : '');
    img.alt = a.anunciante ? 'Anuncio de ' + a.anunciante : 'Anuncio';
    marco.appendChild(img);
    document.body.appendChild(ov);
    document.body.classList.add('mcan-abierto');

    if (!prueba) {
      var hoy = hoyLima(), visto = leer(localStorage, K_VISTO, {});
      visto[a.id] = hoy + 'T' + new Date().toISOString().slice(11, 19);
      poner(localStorage, K_VISTO, visto);
      if (a.frecuencia !== 'siempre') poner(localStorage, K_HOY, hoy);
      poner(sessionStorage, K_SES, a.id);
      evento(a, 'vista');
    }

    var cerrado = false;
    function cerrar() {
      if (cerrado) return; cerrado = true;
      document.removeEventListener('keydown', tecla);
      ov.classList.add('cerrando');
      setTimeout(function () { ov.remove(); document.body.classList.remove('mcan-abierto'); }, 200);
    }
    function abrir() {
      if (!link) return;
      if (!prueba) evento(a, 'clic');
      // Sin 'noopener' en open(): con él siempre devuelve null y no se sabría si se bloqueó
      var w = window.open(link, '_blank');
      if (w) { try { w.opener = null; } catch (e) {} } else location.href = link;
      cerrar();
    }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', tecla);
    ov.querySelector('.mcan-x').addEventListener('click', cerrar);
    img.addEventListener('click', abrir);
    var b = ov.querySelector('.mcan-btn'); if (b) b.addEventListener('click', abrir);
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
  }

  // Espera a que la página esté libre (hasta ~25 s) y entonces lo muestra
  function cuandoLibre(fn) {
    var n = 0;
    (function mirar() {
      if (!ocupado()) { fn(); return; }
      if (++n < 25) setTimeout(mirar, 1000);
    })();
  }

  function iniciar() {
    if (!window.MCAuth) return;
    MCAuth.listo.then(function () {
      if (!MCAuth.usuario()) return;
      return Promise.all([traer(), MCAuth.perfil().catch(function () { return null; })]).then(function (r) {
        var a = elegir(r[0], r[1]);
        if (!a) return;
        // Se carga la imagen antes de mostrar nada: si falla, no sale
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () { setTimeout(function () { cuandoLibre(function () { if (!leer(sessionStorage, K_SES, null)) mostrar(a, img); }); }, 1200); };
        img.src = a.img;
      });
    }).catch(function () {});
  }

  window.MCAnuncios = { iniciar: iniciar, ocupado: ocupado, cumple: cumple, equipo: equipo };
  // Vista previa del panel: no cuenta vistas ni clics
  window.MCAnunciosVista = function (a) {
    var img = new Image();
    img.onload = function () { mostrar(a, img, true); };
    img.src = a.img;
  };
  if (SCRIPT && SCRIPT.hasAttribute('data-solo-vista')) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

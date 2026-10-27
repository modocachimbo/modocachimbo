/* =========================================================
   Modo Cachimbo · Corazones, misiones del día y XP
   - Lo carga assets/auth.js cuando hay un alumno con sesión.
   - Reglas en Supabase: supabase/16-corazones.sql
   - Las páginas de preguntas avisan cada respuesta con:
       window.MCCorazones && MCCorazones.respuesta(esCorrecta);
     y al empezar una ronda piden las vidas con:
       lives = window.MCCorazones ? MCCorazones.vidasInicio(MAX_LIVES) : MAX_LIVES;
     (0 = sin corazones: se muestra la pantalla para recuperarlos)
   - Solo Repaso, Fijas, Seminarios y Banqueo gastan corazones.
     En todas las demás partes las respuestas solo suman XP.
   ========================================================= */
(function () {
  if (window.MCCorazones || !window.MCAuth) return;
  var CFG = window.MC_CONFIG || {};
  var BASE = new URL(MCAuth.base || './', location.href).href;
  var uid = (MCAuth.usuario() || {}).id || '';
  var CLAVE = 'mc_cz_' + uid;

  /* ---------- ¿Qué página es? ---------- */
  var rel = location.href.replace(/[?#].*$/, '');
  rel = rel.indexOf(BASE) === 0 ? rel.slice(BASE.length) : '';
  var PAG = (function () {
    var m;
    if ((m = /^([a-z0-9-]+)\/libros\/quiz\.html$/.exec(rel))) return { fuente: 'libro', curso: m[1] };
    if ((m = /^([a-z0-9-]+)\/(seminarios|banqueo)\/quiz\.html$/.exec(rel))) return { fuente: m[2], curso: m[1], gasta: true };
    if ((m = /^([a-z0-9-]+)\/(repaso|fijas)\.html$/.exec(rel)) && m[1] !== 'examenes') return { fuente: m[2], curso: m[1], gasta: true };
    if (/^examenes\/[^/]+\/quiz\.html$/.test(rel)) return { fuente: 'examen', curso: '' };
    if (rel === 'falladas.html') return { fuente: 'falladas', curso: '' };
    if (rel === 'vocabulario.html') return { fuente: 'vocabulario', curso: '' };
    if (rel === 'tarjetas.html') return { fuente: 'tarjetas', curso: (new URLSearchParams(location.search).get('curso') || '').replace(/[^a-z0-9-]/g, '') };
    if (rel === 'duelo.html') return { fuente: 'duelo', curso: '' };
    if (rel === 'simulacro.html') return { fuente: 'simulacro', curso: '' };
    return null;
  })();

  function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var estado = null, oyentes = [], nombres = {}, areas = {}, cursosLista = null, conRepaso = false;
  try { estado = JSON.parse(leer(CLAVE) || 'null'); } catch (e) {}

  /* ---------- Íconos propios ---------- */
  var SVG = {
    corazon: '<svg class="mcz-i-cor" viewBox="0 0 24 24" aria-hidden="true"><g class="mcz-late"><path fill="var(--c1,#FF4B4B)" d="M12 21.4s-8.2-4.9-10.1-10C.4 7.3 2.9 3.4 6.7 3.4c2.3 0 3.9 1.3 5.3 3.1 1.4-1.8 3-3.1 5.3-3.1 3.8 0 6.3 3.9 4.8 8-1.9 5.1-10.1 10-10.1 10z"/><path fill="var(--c2,#D93636)" d="M12 21.4s8.2-4.9 10.1-10c.6-1.6.6-3.2.1-4.5-.2 4.3-5 9.6-10.2 12.4-5.2-2.8-10-8.1-10.2-12.4-.5 1.3-.5 2.9.1 4.5C3.8 16.5 12 21.4 12 21.4z"/><path fill="#fff" opacity="var(--c3,.7)" d="M6.5 6.2c-1.7.1-2.8 1.6-2.6 3.3.1.7.9.8 1.1 0 .3-1.1 1-1.8 1.9-2.1.8-.3.5-1.3-.4-1.2z"/><circle fill="#fff" opacity="var(--c3,.7)" cx="8.6" cy="5.6" r=".9"/></g></svg>',
    vacio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#2a2a2a" d="M12 21.4s-8.2-4.9-10.1-10C.4 7.3 2.9 3.4 6.7 3.4c2.3 0 3.9 1.3 5.3 3.1 1.4-1.8 3-3.1 5.3-3.1 3.8 0 6.3 3.9 4.8 8-1.9 5.1-10.1 10-10.1 10z"/></svg>',
    xp: '<svg class="mcz-i-xp" viewBox="0 0 24 24" aria-hidden="true"><g class="mcz-gema"><path fill="#FFC800" d="M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z"/><path fill="#FFDD4A" d="M12 1.6 21 6.8 12 12 3 6.8z"/><path fill="#E0A100" d="M21 6.8v10.4L12 22.4V12z"/><path class="mcz-destello" fill="#fff" d="M12 1.6 16 3.9 7 9.1 3 6.8z"/><path fill="#fff" opacity=".95" d="M13 5.6 8.2 12.6h3.2l-.9 5.8 5.3-7.4h-3.3z"/><path fill="#FFE98A" d="M13 5.6 8.2 12.6h3.2l-.9 5.8 1.4-6.8H9.9z"/></g></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    explora: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    vocabulario: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20M9 8h7M9 12h5"/></svg>',
    duelo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 3.5 13 13M3.5 3.5h4l9 9M20.5 3.5 11 13M20.5 3.5h-4l-4.2 4.2M6 15.5 8.5 18M18 15.5 15.5 18M4 20l3-3M20 20l-3-3"/></svg>',
    tarjetas: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="13" height="14" rx="2.5"/><path d="M8 3h10a3 3 0 0 1 3 3v10M7 14h5"/></svg>',
    seguidas: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    repaso: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
    simulacro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13.5" r="8"/><path d="M12 9.5v4l2.5 2.5M9.5 2.5h5M12 2.5v3"/></svg>'
  };
  var COLOR = { explora: 'az', vocabulario: 'mo', duelo: 'na', tarjetas: 'li', seguidas: 'az', repaso: 'ro', simulacro: 'or' };

  function css() {
    if (document.getElementById('mcz-css')) return;
    // Barlow Condensed para los títulos (las páginas que no la traen)
    if (!document.querySelector('link[href*="Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800;1,900"]')) {
      var fu = document.createElement('link'); fu.rel = 'stylesheet';
      fu.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,800;1,900&display=swap';
      document.head.appendChild(fu);
    }
    var st = document.createElement('style'); st.id = 'mcz-css';
    st.textContent =
      // Píldoras de arriba (junto a la racha)
      '.mcz-pill{display:inline-flex;align-items:center;gap:5px;height:42px;padding:0 12px 0 10px;border-radius:14px;border:2px solid #322B52;border-bottom-width:4px;background:#1D1834;font:900 15px Nunito,Sora,Inter,sans-serif;font-variant-numeric:tabular-nums;cursor:pointer;transition:transform .08s ease;-webkit-tap-highlight-color:transparent;text-decoration:none}' +
      '.mcz-pill[hidden]{display:none}.mcz-pill svg{width:24px;height:24px;overflow:visible}.mcz-pill:active{transform:translateY(2px);border-bottom-width:2px;margin-bottom:2px}' +
      '.mcz-cor{color:#FF4B4B}.mcz-xp{color:#FFC800}' +
      // El corazón late en bucle; sin corazones queda gris y quieto
      '.mcz-late,.mcz-gema{transform-box:fill-box;transform-origin:50% 60%}' +
      '.mcz-cor .mcz-late{animation:mczBum 1.4s ease-in-out infinite}' +
      '@keyframes mczBum{0%,40%,100%{transform:scale(1)}10%{transform:scale(1.16)}20%{transform:scale(.96)}30%{transform:scale(1.1)}}' +
      '.mcz-cor.cero{color:#9a9a9a;--c1:#5a5a5a;--c2:#444;--c3:0}.mcz-cor.cero .mcz-late{animation:none}' +
      '.mcz-cor.late .mcz-late{animation:mczLatido .6s ease}' +
      '@keyframes mczLatido{0%,100%{transform:scale(1)}40%{transform:scale(1.3)}70%{transform:scale(.92)}}' +
      // La gema del XP se inclina y destella de vez en cuando
      '.mcz-xp .mcz-gema{transform-origin:50% 50%;animation:mczGema 2.8s ease-in-out infinite}' +
      '@keyframes mczGema{0%,70%,100%{transform:scale(1) rotate(0)}80%{transform:scale(1.1) rotate(-8deg)}90%{transform:scale(1) rotate(4deg)}}' +
      '.mcz-destello{opacity:0}.mcz-xp .mcz-destello{animation:mczDestello 2.8s ease-in-out infinite}' +
      '@keyframes mczDestello{0%,68%,100%{opacity:0}80%{opacity:.55}}' +
      '@media (max-width:560px){.mcz-pill{height:38px;padding:0 9px;font-size:14px}.mcz-xp{display:none}}' +
      // "+10 XP" que sube cada vez que responde (desde la gema de arriba; en celular, arriba a la derecha)
      '.mcz-gana{position:fixed;z-index:230;display:inline-flex;white-space:nowrap;max-width:calc(100vw - 32px);align-items:center;gap:6px;padding:6px 12px 6px 8px;border-radius:999px;background:#1c1600;border:2px solid #FFC800;border-bottom-width:4px;color:#FFC800;font:1000 15px Nunito,Sora,Inter,sans-serif;font-variant-numeric:tabular-nums;pointer-events:none;box-shadow:0 0 18px rgba(255,200,0,.35);animation:mczGana 1.25s cubic-bezier(.2,.8,.3,1) forwards}' +
      '.mcz-gana svg{width:20px;height:20px}.mcz-gana small{font:800 11.5px Nunito,sans-serif;color:#bfa24a;margin-left:2px}' +
      '.mcz-gana.poco{border-color:#7a6620;color:#d9b84a;box-shadow:none}' +
      '@keyframes mczGana{0%{opacity:0;transform:translate(-50%,8px) scale(.7)}15%{opacity:1;transform:translate(-50%,0) scale(1.08)}30%{transform:translate(-50%,0) scale(1)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-26px) scale(.96)}}' +
      '.mcz-xp.sube{animation:mczSubeXp .45s ease}@keyframes mczSubeXp{40%{transform:scale(1.14)}}' +
      '@media (prefers-reduced-motion:reduce){.mcz-gana{animation:mczGanaQuieto 1.2s forwards}@keyframes mczGanaQuieto{0%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}}' +
      '@media (max-width:420px){.mcz-pill{padding:0 7px;gap:4px}.mcz-pill svg{width:19px;height:19px}}' +
      // Hoja que sube desde abajo
      '.mcz-fondo{position:fixed;inset:0;z-index:240;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}' +
      '.mcz-fondo[hidden]{display:none}' +
      '.mcz-hoja{width:100%;max-width:520px;max-height:88vh;overflow-y:auto;display:grid;gap:14px;background:#151127;color:#f2f2f2;border:2px solid #2C2549;border-bottom:0;border-radius:26px 26px 0 0;padding:18px 16px calc(20px + env(safe-area-inset-bottom));font-family:Nunito,Inter,sans-serif;animation:mczSube .22s ease-out}' +
      '@media (min-width:560px){.mcz-fondo{align-items:center}.mcz-hoja{border-radius:26px;border-bottom:5px solid #2C2549}}' +
      '@keyframes mczSube{from{transform:translateY(40px);opacity:0}}' +
      // Títulos en Barlow cursiva y cuadros con borde de color abajo, como el inicio del repaso
      '.mcz-hoja .bc,.mcz-sin .bc{font-family:"Barlow Condensed",Nunito,sans-serif;text-transform:uppercase}' +
      '.mcz-cab{display:flex;align-items:center;gap:8px}.mcz-cab b{flex:1;font:italic 900 28px/1 "Barlow Condensed",Nunito,sans-serif;letter-spacing:.01em}.mcz-cab .mcz-pill{height:38px}' +
      '.mcz-x{width:40px;height:40px;border-radius:12px;border:2px solid #322B52;background:transparent;color:#9a9a9a;cursor:pointer;display:grid;place-items:center}.mcz-x svg{width:18px;height:18px}' +
      '.mcz-vidas{display:flex;justify-content:center;gap:8px}.mcz-vidas svg{width:42px;height:42px}.mcz-vidas .vacio{--c1:#2F284E;--c2:#241E3E;--c3:0}.mcz-vidas .vacio .mcz-late{animation:none}' +
      '.mcz-rec{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 12px;border-radius:14px;background:#1D1834;border:1px solid #2A2346;border-bottom:4px solid #1CB0F6;font:800 14px Nunito,sans-serif;color:#A99FC8}' +
      '.mcz-rec svg{width:18px;height:18px;color:#1CB0F6;flex-shrink:0}.mcz-rec b{color:#fff;font:italic 900 20px/1 "Barlow Condensed",Nunito,sans-serif;letter-spacing:.02em}.mcz-rec.lleno{border-bottom-color:#C6E000}.mcz-rec.lleno svg{color:#C6E000}' +
      '.mcz-sub{display:flex;align-items:center;gap:8px;margin:4px 0 -4px}.mcz-sub b{font:italic 900 21px/1 "Barlow Condensed",Nunito,sans-serif;color:#fff}.mcz-sub small{font:900 12px Nunito,sans-serif;color:#FF6B6B}.mcz-sub::after{content:"";flex:1;height:2px;background:#2A2346}' +
      '.mcz-mis{--mc:#2A2346;display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:#1D1834;border:1px solid #2A2346;border-bottom:4px solid var(--mc);color:inherit;text-decoration:none;text-align:left;transition:transform .08s ease}' +
      'a.mcz-mis:active{transform:translateY(2px)}' +
      '.mcz-mis .ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;flex-shrink:0}' +
      '.mcz-mis .ic svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
      '.mcz-mis .tx{flex:1;min-width:0;display:grid;gap:6px}.mcz-mis .tx b{font-size:15px;font-weight:900;line-height:1.25}.mcz-mis small{font-size:12px;color:#A99FC8;font-weight:700}' +
      '.mcz-bar{height:9px;border-radius:6px;background:#2C2549;overflow:hidden}.mcz-bar i{display:block;height:100%;border-radius:6px;background:var(--mc)}' +
      '.mcz-prem{display:flex;align-items:center;gap:3px;padding:5px 8px;border-radius:10px;background:rgba(255,75,75,.12);font:italic 900 17px/1 "Barlow Condensed",Nunito,sans-serif;color:#FF4B4B;flex-shrink:0}.mcz-prem svg{width:18px;height:18px}' +
      '.mcz-mis.az{--mc:#1CB0F6}.mcz-mis.mo{--mc:#CE82FF}.mcz-mis.na{--mc:#FF9600}.mcz-mis.or{--mc:#FFC800}.mcz-mis.li{--mc:#C6E000}.mcz-mis.ro{--mc:#FF4B4B}' +
      '.mcz-mis .ic{background:color-mix(in srgb,var(--mc) 14%,transparent);color:var(--mc)}' +
      '.mcz-mis.ok{--mc:#C6E000}.mcz-mis.ok .mcz-prem{color:#C6E000;background:rgba(198,224,0,.12)}' +
      '.mcz-mis.bonus{background:linear-gradient(90deg,rgba(255,200,0,.1),#1D1834 60%)}' +
      '.mcz-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:14px;border-radius:16px;font:italic 900 21px/1 "Barlow Condensed",Nunito,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;text-decoration:none;-webkit-tap-highlight-color:transparent;transition:transform .08s ease}' +
      '.mcz-btn.prin{background:#C6E000;color:#2b3300;border:0;box-shadow:0 5px 0 #8fa300}.mcz-btn.prin:active{transform:translateY(4px);box-shadow:0 1px 0 #8fa300}' +
      '.mcz-btn.prin:disabled{background:#2F284E;color:#6F6690;box-shadow:0 5px 0 #241E3E;cursor:default}' +
      '.mcz-btn.sec{background:transparent;color:#f2f2f2;border:2px solid #322B52;border-bottom-width:5px}.mcz-btn.sec svg{width:22px;height:22px}.mcz-btn.sec:active{transform:translateY(3px);border-bottom-width:2px}' +
      '.mcz-msg{text-align:center;font-size:13px;font-weight:700;color:#ff8a8a;min-height:1em}' +
      // Canje
      '.mcz-trueque{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:4px}' +
      '.mcz-ficha{--fc:#FFC800;display:grid;justify-items:center;gap:4px;width:118px;padding:14px 8px 12px;border-radius:18px;background:#1D1834;border:1px solid #2A2346;border-bottom:5px solid var(--fc)}.mcz-ficha.cor{--fc:#FF4B4B}' +
      '.mcz-ficha svg{width:44px;height:44px}.mcz-ficha b{font:italic 900 36px/1 "Barlow Condensed",Nunito,sans-serif;color:#fff}.mcz-ficha small{font:800 13px/1 "Barlow Condensed",Nunito,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#A99FC8}.mcz-flecha{width:28px;height:28px;color:#6F6690}' +
      '.mcz-saldo{text-align:center;font-size:14px;color:#A99FC8;font-weight:700}.mcz-saldo b{color:#FFC800}.mcz-saldo b.mcz-n{color:#fff}' +
      '.mcz-cupos{display:flex;gap:6px;justify-content:center}.mcz-cupos span{width:34px;height:8px;border-radius:5px;background:#FFC800}.mcz-cupos span.usado{background:#2F284E}' +
      '.mcz-nota{text-align:center;font-size:12.5px;color:#6F6690;line-height:1.5;font-weight:700}' +
      // Sin corazones (pantalla completa) con el búho triste disfrazado del área
      '.mcz-sin{position:fixed;inset:0;z-index:230;background:#0B0818;color:#f2f2f2;overflow-y:auto;font-family:Nunito,Inter,sans-serif;padding:24px 16px calc(24px + env(safe-area-inset-bottom))}' +
      '.mcz-sin[hidden]{display:none}' +
      '.mcz-sin-in{max-width:440px;margin:0 auto;display:grid;gap:14px;justify-items:center;text-align:center}' +
      '.mcz-sin h2{font:italic 900 36px/1 "Barlow Condensed",Nunito,sans-serif;letter-spacing:.01em}.mcz-sin h2 span{color:#FF4B4B}.mcz-sin .mcz-vidas{margin-top:-4px}.mcz-sin .mcz-rec{width:100%}' +
      '.mcz-sin .mcz-lista{display:grid;gap:10px;width:100%;text-align:left}.mcz-sin .mcz-sub{width:100%}' +
      '.mcz-link{font:900 14px Nunito,sans-serif;color:#9a9a9a;text-decoration:underline;text-underline-offset:3px;background:none;border:0;cursor:pointer}' +
      '.mcz-buho{display:flex;align-items:flex-end;justify-content:center;gap:4px;width:100%}.mcz-buho img{width:140px;height:auto;flex:none;transform-origin:50% 100%;filter:drop-shadow(0 5px 4px rgba(0,0,0,.4));animation:mczSuspiro 3s ease-in-out infinite}' +
      '@keyframes mczSuspiro{0%,100%{transform:none}50%{transform:scale(1.015,.975)}}' +
      '.mcz-globo{position:relative;flex:1;max-width:240px;margin-bottom:36px;padding:10px 14px;text-align:left;background:#1D1834;color:#EEEAF7;border:2px solid #2F284E;border-bottom:4px solid #FF4B4B;border-radius:16px;font:800 14px/1.35 Nunito,sans-serif}' +
      '.mcz-globo b{color:#FF6B6B;font-weight:900}.mcz-globo::before{content:"";position:absolute;left:-9px;bottom:16px;width:14px;height:14px;background:#1D1834;border:solid #2F284E;border-width:0 0 2px 2px;rotate:45deg;border-radius:0 0 0 4px}' +
      // Aviso de corazón ganado
      '.mcz-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:300;display:flex;align-items:center;gap:12px;background:#19142E;border:2px solid rgba(255,75,75,.45);color:#f2f2f2;border-radius:18px;padding:12px 18px 12px 14px;box-shadow:0 18px 40px rgba(0,0,0,.6);font:700 13.5px Nunito,Inter,sans-serif;transition:transform .35s ease,opacity .35s ease;max-width:calc(100vw - 32px)}' +
      '.mcz-toast.show{transform:translate(-50%,0);opacity:1}.mcz-toast svg{width:30px;height:30px;flex-shrink:0;animation:mczLatido .7s ease 2}.mcz-toast b{display:block;font-size:16px;font-weight:1000;color:#FF4B4B}' +
      '@media (prefers-reduced-motion:reduce){.mcz-hoja,.mcz-toast svg,.mcz-late,.mcz-gema,.mcz-destello{animation:none!important}}';
    document.head.appendChild(st);
  }

  /* ---------- Servidor ---------- */
  function rpc(nombre, args) {
    return MCAuth.listo.then(function (c) { return c.rpc(nombre, args || {}); }).then(function (r) {
      if (r.error) throw r.error;
      return r.data;
    });
  }

  var recibido = 0;  // cuándo llegó el estado (para la cuenta regresiva)
  function cambiar(e) {
    if (!e || typeof e !== 'object') return;
    var antes = estado;
    estado = e; recibido = Date.now();
    guardar(CLAVE, JSON.stringify(e));
    pintar();
    oyentes.forEach(function (fn) { try { fn(estado); } catch (x) {} });
    (e.nuevas || []).forEach(function (t) { celebrar(t); });
    if (antes && antes.quedan === 0 && e.quedan > 0) cerrarBloqueo();
  }

  // Cursos que puede practicar (para la misión de explorar)
  function cursosPracticables() {
    if (cursosLista) return Promise.resolve(cursosLista);
    return fetch(BASE + 'assets/cursos.json').then(function (r) { return r.json(); }).then(function (d) {
      var todos = (d.cursos || []).filter(function (c) { return !c.oculto; });
      todos.forEach(function (c) { nombres[c.id] = c.nombre; });
      (d.cursos || []).forEach(function (c) { if (c.area) areas[c.id] = c.area; });
      var A = window.MCAcceso;
      var con = A && A.accesoLocal ? todos.filter(function (c) { try { return A.accesoLocal('repaso-' + c.id); } catch (e) { return false; } }) : [];
      conRepaso = con.length > 0;
      cursosLista = (con.length ? con : todos).map(function (c) { return c.id; });
      return cursosLista;
    }).catch(function () { return []; });
  }

  function cargar() {
    return cursosPracticables().then(function (lista) {
      // p_repaso: si tiene algún Repaso abierto (para la misión de Repaso).
      // Si el SQL 20 aún no corrió, se pide como antes.
      return rpc('mis_corazones', { p_cursos: lista, p_repaso: conRepaso }).catch(function () {
        return rpc('mis_corazones', { p_cursos: lista });
      });
    }).then(cambiar, function () { pintar(); });
  }

  /* ---------- Respuestas: XP y corazones ---------- */
  var buf = { ok: 0, mal: 0, seguidas: 0 }, racha = 0, tEnvio = null, enviando = false, vuelo = 0;
  // XP que ya ganó pero el servidor todavía no anotó (se ve al instante)
  function pendiente() { return 10 * buf.ok + 2 * buf.mal + vuelo; }
  function verXp() { return ((estado && estado.xp_semana) || 0) + pendiente(); }
  function respuesta(ok) {
    if (!PAG) return;
    if (ok) { buf.ok++; racha++; buf.seguidas = Math.max(buf.seguidas, racha); }
    else { buf.mal++; racha = 0; if (PAG.gasta) perder(); }
    ganaXp(ok ? 10 : 2);
    if (buf.ok + buf.mal >= 10) enviar(); else if (!tEnvio) tEnvio = setTimeout(enviar, 4000);
  }
  // Varias respuestas juntas (el simulacro las manda al terminar)
  function sumar(ok, mal) {
    if (!PAG) return;
    buf.ok += Math.max(0, ok | 0); buf.mal += Math.max(0, mal | 0);
    ganaXp(10 * Math.max(0, ok | 0) + 2 * Math.max(0, mal | 0));
    enviar();
  }
  // El servidor acepta hasta 50 de cada una por envío; lo demás queda para el siguiente
  function paquete() {
    var p = { fuente: PAG.fuente, curso: PAG.curso || '', ok: Math.min(buf.ok, 50), mal: Math.min(buf.mal, 50), seguidas: buf.seguidas };
    buf = { ok: buf.ok - p.ok, mal: buf.mal - p.mal, seguidas: racha };
    return p;
  }
  function enviar() {
    clearTimeout(tEnvio); tEnvio = null;
    if (enviando || !PAG || buf.ok + buf.mal === 0) return;
    var p = paquete(); enviando = true; vuelo = 10 * p.ok + 2 * p.mal;
    rpc('sumar_xp', { p: p }).then(function (e) { enviando = false; vuelo = 0; cambiar(e); if (buf.ok + buf.mal) enviar(); },
      function () { enviando = false; vuelo = 0; buf.ok += p.ok; buf.mal += p.mal; });
  }
  // Al cerrar la página se manda lo que falte
  window.addEventListener('pagehide', function () {
    if (!PAG || buf.ok + buf.mal === 0 || !MCAuth.token || !MCAuth.token()) return;
    try {
      fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/sumar_xp', {
        method: 'POST', keepalive: true,
        headers: { apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + MCAuth.token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ p: paquete() })
      });
    } catch (e) {}
  });

  var cola = Promise.resolve();
  function perder() {
    if (estado) {
      var e = {}; for (var k in estado) e[k] = estado[k];
      if (e.quedan === 5) e.proximo = 10800;
      e.quedan = Math.max(0, (e.quedan || 0) - 1);
      e.nuevas = [];
      estado = e; recibido = Date.now(); pintar(true);
      if (e.quedan === 0) setTimeout(bloqueo, 1300);
    }
    cola = cola.then(function () { return rpc('perder_corazon').then(cambiar, function () {}); });
  }

  function vidasInicio(max) {
    if (!PAG || !PAG.gasta || !estado) return max;
    if (estado.quedan <= 0) { bloqueo(); return 0; }
    return Math.min(max, estado.quedan);
  }

  /* ---------- "+10 XP": que se note lo que gana ---------- */
  var chipXp = null, tChip = null, sumaChip = 0;
  function ganaXp(n) {
    if (!n || !estado) return;
    css();
    // La gema de arriba sube al instante
    Array.prototype.forEach.call(document.querySelectorAll('.mcz-xp span'), function (s) { s.textContent = verXp(); });
    var gema = Array.prototype.filter.call(document.querySelectorAll('.mcu-user .mcz-xp'), function (x) { return x.offsetParent; })[0];
    if (gema) { gema.classList.remove('sube'); void gema.offsetWidth; gema.classList.add('sube'); }
    // Respuestas seguidas se juntan en el mismo globo: +10, +20, +30…
    sumaChip = chipXp && chipXp.isConnected ? sumaChip + n : n;
    if (!chipXp || !chipXp.isConnected) { chipXp = document.createElement('div'); chipXp.setAttribute('aria-hidden', 'true'); document.body.appendChild(chipXp); }
    chipXp.className = 'mcz-gana' + (sumaChip < 10 ? ' poco' : '');
    chipXp.innerHTML = SVG.xp + '+' + sumaChip + ' XP' + (gema ? '' : '<small>· ' + verXp() + ' esta semana</small>');
    if (gema) { var b = gema.getBoundingClientRect(); chipXp.style.left = (b.left + b.width / 2) + 'px'; chipXp.style.top = (b.bottom + 8) + 'px'; chipXp.style.right = ''; }
    else { chipXp.style.left = '50%'; chipXp.style.top = 'calc(env(safe-area-inset-top, 0px) + 74px)'; }
    chipXp.style.animation = 'none'; void chipXp.offsetWidth; chipXp.style.animation = '';
    clearTimeout(tChip); tChip = setTimeout(function () { if (chipXp) chipXp.remove(); chipXp = null; sumaChip = 0; }, 1300);
  }

  /* ---------- Pintar las píldoras de arriba ---------- */
  function pintar(late) {
    if (!estado) return;
    css();
    Array.prototype.forEach.call(document.querySelectorAll('.mcu-user'), function (cont) {
      var cor = cont.querySelector('.mcz-cor'), xp = cont.querySelector('.mcz-xp');
      if (!cor) {
        xp = document.createElement('button'); xp.type = 'button'; xp.className = 'mcz-pill mcz-xp';
        xp.addEventListener('click', function () { abrirCanje(); });
        cor = document.createElement('button'); cor.type = 'button'; cor.className = 'mcz-pill mcz-cor';
        cor.addEventListener('click', function () { abrirMisiones(); });
        cont.insertBefore(xp, cont.firstChild); cont.insertBefore(cor, cont.firstChild);
      }
      cor.innerHTML = SVG.corazon + '<span>' + estado.quedan + '</span>';
      cor.setAttribute('aria-label', estado.quedan + ' corazones. Ver misiones');
      xp.innerHTML = SVG.xp + '<span>' + verXp() + '</span>';
      xp.setAttribute('aria-label', verXp() + ' XP esta semana. Canjear');
      cor.classList.toggle('cero', !estado.quedan);
      if (late) { cor.classList.remove('late'); void cor.offsetWidth; cor.classList.add('late'); setTimeout(function () { cor.classList.remove('late'); }, 700); }
    });
    ajustarInicio();
    if (hoja && !hoja.hidden && hoja.dataset.vista === 'misiones') abrirMisiones();
  }

  // Inicio de la práctica: "5 vidas" pasa a los corazones que le quedan hoy
  function ajustarInicio() {
    if (!PAG || !PAG.gasta || !estado) return;
    var n = estado.quedan, txt = n + (n === 1 ? ' corazón' : ' corazones');
    Array.prototype.forEach.call(document.querySelectorAll('#startScreen .start-stat span'), function (s) {
      if (/vidas|coraz/.test(s.textContent) && s.textContent !== txt) s.textContent = txt;
    });
    // Inicio del repaso con cuadros: el número y la palabra van por separado
    var vn = document.getElementById('startVidasN'), vt = document.getElementById('startVidasTx');
    // Solo si cambia: el MutationObserver de abajo llama aquí en cada cambio del DOM
    if (vn && vn.textContent !== String(n)) vn.textContent = n;
    if (vt && vt.textContent !== (n === 1 ? 'Corazón' : 'Corazones')) vt.textContent = n === 1 ? 'Corazón' : 'Corazones';
    var d = document.getElementById('startDesc');
    if (d && /Tienes \d vidas/.test(d.textContent)) d.textContent = d.textContent.replace(/Tienes \d vidas/, 'Tienes ' + txt + ' hoy');
  }

  /* ---------- Misiones ---------- */
  function tiempo(seg) {
    if (seg == null) return '';
    seg = Math.max(0, seg - Math.round((Date.now() - recibido) / 1000));
    var h = Math.floor(seg / 3600), m = Math.ceil((seg % 3600) / 60);
    if (m === 60) { h++; m = 0; }
    return (h ? h + ' h ' : '') + m + ' min';
  }
  function cursoNombre(c) { return nombres[c] || c || 'un curso'; }
  function mision(m) {
    var t = m.tipo, tit, link, sub = '';
    if (t === 'explora') { tit = 'Explora: responde 10 preguntas de ' + cursoNombre(m.curso); link = m.curso ? m.curso + '/libros/index.html' : 'index.html#cursos'; sub = 'en Práctica'; }
    else if (t === 'vocabulario') { tit = 'Practica 10 palabras en Vocabulario'; link = 'vocabulario.html'; }
    else if (t === 'duelo') { tit = 'Juega un duelo con un amigo'; link = 'duelo.html'; sub = 'termínalo'; }
    else if (t === 'repaso') { tit = 'Acierta 10 en Repaso'; link = (explora().curso || 'biologia') + '/repaso.html'; sub = 'sin quedarte sin corazones'; }
    else if (t === 'tarjetas') { tit = 'Repasa 10 flashcards'; link = 'tarjetas.html?curso=' + encodeURIComponent(explora().curso || 'biologia'); sub = 'de ' + cursoNombre(explora().curso || 'biologia'); }
    else if (t === 'seguidas') { tit = 'Acierta 5 seguidas en Práctica'; link = (explora().curso || 'biologia') + '/libros/index.html'; }
    return { tit: tit, link: link, sub: sub };
  }
  function explora() { return ((estado && estado.misiones) || []).filter(function (m) { return m.tipo === 'explora'; })[0] || {}; }
  function filaMision(m, corta) {
    var d = mision(m), hecho = m.estado !== 'pend', cobrada = m.estado === 'cobrada';
    var pct = Math.round(Math.min(1, (m.hecho || 0) / (m.meta || 1)) * 100);
    var bajo = cobrada ? '¡Cobrada!' : m.estado === 'lista' ? 'Lista: se cobra cuando te falte un corazón' : (m.hecho || 0) + ' / ' + m.meta + (d.sub ? ' · ' + d.sub : '');
    return '<a class="mcz-mis ' + COLOR[m.tipo] + (hecho ? ' ok' : '') + '" href="' + esc(BASE + d.link) + '"><span class="ic">' + SVG[m.tipo] + '</span>' +
      '<span class="tx"><b>' + esc(d.tit) + '</b><span class="mcz-bar"><i style="width:' + pct + '%"></i></span>' + (corta ? '' : '<small>' + esc(bajo) + '</small>') + '</span>' +
      '<span class="mcz-prem bc">' + (cobrada ? SVG.check : SVG.corazon + '+1') + '</span></a>';
  }
  function filaSimulacro(corta) {
    var s = estado.simulacro, cobrada = s === 'cobrada';
    return '<a class="mcz-mis or bonus' + (cobrada ? ' ok' : '') + '" href="' + esc(BASE + 'simulacro.html') + '"><span class="ic">' + SVG.simulacro + '</span>' +
      '<span class="tx"><b>' + (corta ? 'Haz tu primer simulacro del día' : 'Bonus: tu primer simulacro del día') + '</b>' +
      (corta ? '' : '<small>' + (cobrada ? '¡Cobrado!' : s === 'lista' ? 'Listo: te devuelve los 5 cuando te falten' : 'Te devuelve los 5 corazones') + '</small>') + '</span>' +
      '<span class="mcz-prem bc">' + (cobrada ? SVG.check : SVG.corazon + '+5') + '</span></a>';
  }
  function filaVidas() {
    var h = '';
    for (var i = 0; i < 5; i++) h += i < estado.quedan ? SVG.corazon : '<span class="vacio">' + SVG.corazon + '</span>';
    return '<div class="mcz-vidas">' + h + '</div>';
  }

  // Muchas páginas fijan Nunito con !important en todo; los títulos Barlow lo pisan en línea
  function barlow(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll('.bc'), function (e) { e.style.setProperty('font-family', "'Barlow Condensed', Nunito, sans-serif", 'important'); });
  }
  function reloj() {
    return estado.quedan < 5 ? '<div class="mcz-rec">' + SVG.reloj + 'Próximo corazón en <b class="bc" id="mczReloj">' + tiempo(estado.proximo) + '</b></div>' : '<div class="mcz-rec lleno">' + SVG.check + 'Tienes tus 5 corazones</div>';
  }

  var hoja = null;
  function abrirHoja(vista, html) {
    css();
    if (!hoja) {
      hoja = document.createElement('div'); hoja.className = 'mcz-fondo'; hoja.hidden = true;
      hoja.addEventListener('click', function (e) { if (e.target === hoja || e.target.closest('.mcz-x')) cerrarHoja(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !hoja.hidden) cerrarHoja(); });
      document.body.appendChild(hoja);
    }
    hoja.dataset.vista = vista;
    hoja.innerHTML = '<div class="mcz-hoja" role="dialog" aria-modal="true">' + html + '</div>';
    barlow(hoja);
    hoja.hidden = false;
  }
  function cerrarHoja() { if (hoja) hoja.hidden = true; }

  function abrirMisiones() {
    if (!estado) return;
    abrirHoja('misiones',
      '<div class="mcz-cab"><b class="bc">Tus corazones</b><button type="button" class="mcz-pill mcz-xp" data-canje style="display:inline-flex">' + SVG.xp + (estado.xp_semana || 0) + '</button><button type="button" class="mcz-x" aria-label="Cerrar">' + SVG.x + '</button></div>' +
      filaVidas() + reloj() +
      '<div class="mcz-sub"><b class="bc">Misiones de hoy</b><small>+1 corazón c/u</small></div>' +
      (estado.misiones || []).map(function (m) { return filaMision(m); }).join('') + filaSimulacro() +
      '<button type="button" class="mcz-btn sec bc" data-canje>' + SVG.xp + 'Canjear XP por corazones</button>' +
      '<a class="mcz-link" style="justify-self:center" href="' + esc(BASE + 'perfil.html#ranking') + '">Ver el ranking de la semana</a>' +
      '<p class="mcz-nota">Los corazones se gastan solo en Repaso, Fijas, Seminarios y Banqueo. Recuperas 1 cada 3 horas y a medianoche vuelven los 5.</p>');
    Array.prototype.forEach.call(hoja.querySelectorAll('[data-canje]'), function (b) { b.addEventListener('click', abrirCanje); });
  }

  function abrirCanje() {
    if (!estado) return;
    var quedan = estado.canjes_max - estado.canjes, lleno = estado.quedan >= 5, falta = estado.xp_saldo < estado.precio;
    var cupos = ''; for (var i = 0; i < estado.canjes_max; i++) cupos += '<span' + (i < estado.canjes ? ' class="usado"' : '') + '></span>';
    var motivo = lleno ? 'Ya tienes tus 5 corazones.' : quedan <= 0 ? 'Ya usaste tus ' + estado.canjes_max + ' canjes de hoy.' : falta ? 'Te faltan ' + (estado.precio - estado.xp_saldo) + ' XP. Gánalos respondiendo en Práctica, Vocabulario o Flashcards.' : '';
    abrirHoja('canje',
      '<div class="mcz-cab"><b class="bc">Canjear XP</b><button type="button" class="mcz-x" aria-label="Cerrar">' + SVG.x + '</button></div>' +
      '<div class="mcz-trueque"><span class="mcz-ficha">' + SVG.xp + '<b class="bc">' + estado.precio + '</b><small class="bc">XP</small></span><span class="mcz-flecha">' + SVG.flecha + '</span><span class="mcz-ficha cor">' + SVG.corazon + '<b class="bc">1</b><small class="bc">Corazón</small></span></div>' +
      '<div class="mcz-saldo">Tienes <b>' + estado.xp_saldo + ' XP</b> para canjear</div>' +
      '<div class="mcz-cupos">' + cupos + '</div>' +
      '<div class="mcz-saldo">Te ' + (quedan === 1 ? 'queda <b class="mcz-n">1 canje</b>' : 'quedan <b class="mcz-n">' + Math.max(0, quedan) + ' canjes</b>') + ' hoy</div>' +
      '<button type="button" class="mcz-btn prin bc" id="mczCanjear"' + (motivo ? ' disabled' : '') + '>Canjear ' + estado.precio + ' XP</button>' +
      '<div class="mcz-msg" id="mczMsg">' + esc(motivo) + '</div>' +
      '<p class="mcz-nota">Canjear no te baja en el ranking: ahí se cuenta todo el XP que ganaste en la semana.</p>');
    var b = document.getElementById('mczCanjear');
    b.addEventListener('click', function () {
      b.disabled = true;
      rpc('canjear_xp').then(function (e) {
        if (e && e.error) { document.getElementById('mczMsg').textContent = e.error; cambiar(e); return; }
        cambiar(e); cerrarHoja();
        celebrar('canje');
      }, function () { b.disabled = false; document.getElementById('mczMsg').textContent = 'No se pudo canjear. Revisa tu conexión.'; });
    });
  }

  /* ---------- Sin corazones ---------- */
  var capa = null, tReloj = null;
  function bloqueo() {
    if (!estado || estado.quedan > 0) return;
    css();
    if (!capa) {
      capa = document.createElement('div'); capa.className = 'mcz-sin'; capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true');
      document.body.appendChild(capa);
    }
    var pend = (estado.misiones || []).filter(function (m) { return m.estado === 'pend'; });
    var primera = pend[0] ? BASE + mision(pend[0]).link : BASE + 'simulacro.html';
    // El búho triste disfrazado del área del curso (assets/buho/disfraces), con un globo de ánimo
    var area = areas[PAG.curso] || document.documentElement.getAttribute('data-area');
    var buho = area ? '<img src="' + esc(BASE + 'assets/buho/disfraces/' + area + '-triste.webp') + '" alt="Búho de Modo Cachimbo triste">' : window.MCBuho ? MCBuho.svg('triste', 110) : '';
    var animo = ['¡Tranqui! <b>Hasta los mejores</b> se quedan sin corazones.', 'Equivocarse también es aprender. <b>Recupéralos</b> con una misión.', 'Respira y vuelve más fuerte. <b>¡Yo te espero!</b>'];
    capa.innerHTML = '<div class="mcz-sin-in">' +
      '<div class="mcz-buho">' + buho + '<div class="mcz-globo">' + animo[Math.floor(Math.random() * animo.length)] + '</div></div>' +
      '<h2 class="bc">Te quedaste sin <span>corazones</span></h2>' +
      filaVidas() + reloj() +
      '<div class="mcz-sub"><b class="bc">Gánalos ahora</b><small>con tus misiones</small></div>' +
      '<div class="mcz-lista">' + pend.map(function (m) { return filaMision(m, true); }).join('') + (estado.simulacro !== 'cobrada' ? filaSimulacro(true) : '') + '</div>' +
      '<a class="mcz-btn prin bc" href="' + esc(primera) + '">Ir a una misión</a>' +
      '<button type="button" class="mcz-btn sec bc" data-canje>' + SVG.xp + 'Canjear ' + estado.precio + ' XP</button>' +
      '<a class="mcz-link" href="' + esc(BASE + 'index.html') + '">Volver al inicio</a></div>';
    barlow(capa);
    capa.querySelector('[data-canje]').addEventListener('click', abrirCanje);
    capa.hidden = false;
    if (window.MCSonido && MCSonido.perder) try { MCSonido.perder(); } catch (e) {}
    clearInterval(tReloj);
    tReloj = setInterval(function () {
      var r = capa.querySelector('#mczReloj');
      if (!r || capa.hidden) { clearInterval(tReloj); return; }
      r.textContent = tiempo(estado.proximo);
      if (estado.proximo != null && estado.proximo - (Date.now() - recibido) / 1000 <= 0) { clearInterval(tReloj); cargar(); }
    }, 30000);
  }
  function cerrarBloqueo() { if (capa) capa.hidden = true; clearInterval(tReloj); }

  /* ---------- Aviso: ganaste un corazón ---------- */
  var TEXTO = { explora: 'Misión Explora cumplida', vocabulario: 'Misión de Vocabulario cumplida', duelo: 'Terminaste un duelo', tarjetas: 'Repasaste tus flashcards', repaso: 'Misión de Repaso cumplida',
    seguidas: '5 seguidas, ¡bien!', simulacro: 'Simulacro del día: vuelven los 5', canje: 'Canjeaste 150 XP' };
  function celebrar(t) {
    css();
    var d = document.createElement('div'); d.className = 'mcz-toast'; d.setAttribute('role', 'status');
    d.innerHTML = SVG.corazon + '<div><b>' + (t === 'simulacro' ? '¡+5 corazones!' : '¡+1 corazón!') + '</b><span></span></div>';
    d.querySelector('span').textContent = TEXTO[t] || 'Misión cumplida';
    document.body.appendChild(d);
    try { if (window.MCSonido && MCSonido.racha) MCSonido.racha(); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('show'); }); });
    setTimeout(function () { d.classList.remove('show'); setTimeout(function () { d.remove(); }, 400); }, 3800);
  }

  window.MCCorazones = {
    respuesta: respuesta, sumar: sumar, vidasInicio: vidasInicio, perder: perder, estado: function () { return estado; },
    alCambiar: function (fn) { oyentes.push(fn); if (estado) fn(estado); },
    abrirMisiones: abrirMisiones, abrirCanje: abrirCanje, recargar: cargar, gasta: !!(PAG && PAG.gasta)
  };

  // Las píldoras se vuelven a poner si el menú de la cuenta se redibuja
  new MutationObserver(function () {
    if (!estado) return;
    if (Array.prototype.some.call(document.querySelectorAll('.mcu-user'), function (u) { return !u.querySelector('.mcz-cor'); })) pintar();
    else ajustarInicio();
  })
    .observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pintar(); }); else pintar();
  cargar();
  // Al volver a la pestaña (por ejemplo, después de una misión) se actualiza
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') cargar(); else enviar(); });
})();

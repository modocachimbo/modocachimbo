/* =========================================================
   Modo Cachimbo · Comprar un plan con Yape (solo web)
   MCYapePlan.abrir({ plan: 'area'|'total', periodo: 'mes'|'ciclo', area, nombre, precio, color })
   1. Yapea  2. Sube tu captura  3. Código de seguridad  → yape_pedir_plan
   · Monto bajo: el plan se activa solo por su ID.
   · Monto alto: acceso de prueba hasta mañana + aviso a Javier por Telegram.
   El precio lo pone el servidor (supabase/146-yape-planes.sql).
   Dentro de la app de Play Store no se cobra por fuera: sale «Muy pronto».
   Requiere assets/auth.js
   ========================================================= */
(function () {
  if (window.MCYapePlan) return;
  var WSP = '51928030708', YAPE = '928 030 708', YAPE_NOMBRE = 'Javier R.';

  var CSS = '' +
    '.ypl-ov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(6,4,14,.82);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:yplIn .2s ease-out}' +
    '@keyframes yplIn{from{opacity:0}}' +
    '.ypl{position:relative;width:min(420px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#151127;border:1px solid #2A2346;border-radius:24px;padding:20px 18px 18px;color:#EEEAF7;font:500 14.5px/1.45 Inter,sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:yplSube .25s cubic-bezier(.2,1.3,.4,1)}' +
    '@keyframes yplSube{from{transform:translateY(18px);opacity:0}}' +
    '.ypl *{box-sizing:border-box}' +
    '.ypl-x{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:10px;border:0;background:#1D1834;display:grid;place-items:center;cursor:pointer;color:#A99FC8}' +
    '.ypl svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;flex:none}' +
    '.ypl-top{display:flex;align-items:center;gap:12px;padding-right:40px}' +
    '.ypl-top .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:#1D1834;color:var(--yc,#C6E000)}' +
    '.ypl-top .ic svg{width:26px;height:26px}' +
    '.ypl-top b{display:block;font:900 19px/1.15 Nunito,sans-serif}' +
    '.ypl-top small{color:#A99FC8;font-size:12.5px}' +
    '.ypl-precio{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:14px 0 4px;padding:12px 14px;border-radius:16px;background:rgba(198,224,0,.07);border:1px solid rgba(198,224,0,.35)}' +
    '.ypl-precio span{color:#A99FC8;font-size:13px;font-weight:600}' +
    '.ypl-precio b{font:900 28px/1 Nunito,sans-serif;color:#C6E000}' +
    '.ypl-paso{display:flex;gap:12px;margin-top:10px;padding:12px;border-radius:16px;background:#1A1530;border:1.5px solid #2A2346}' +
    '.ypl-paso.ok{border-color:rgba(198,224,0,.6)}' +
    '.ypl-n{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#2A2346;color:#EEEAF7;font:900 14px Nunito,sans-serif}' +
    '.ypl-paso.ok .ypl-n{background:#C6E000;color:#151A03}' +
    '.ypl-c{flex:1;min-width:0}' +
    '.ypl-c h4{margin:3px 0 0;font:900 15px Nunito,sans-serif}' +
    '.ypl-num{display:flex;align-items:center;gap:10px;margin-top:8px;padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(116,33,163,.45),rgba(116,33,163,.15));border:1.5px solid rgba(150,60,210,.9)}' +
    '.ypl-num b{font:900 21px/1 Nunito,sans-serif;letter-spacing:.5px;white-space:nowrap}' +
    '.ypl-num small{display:block;font-size:12px;color:#A99FC8}' +
    '.ypl-num button{margin-left:auto;border:0;border-radius:10px;padding:8px 12px;background:#EEEAF7;color:#2a1a40;font:900 13px Nunito,sans-serif;cursor:pointer}' +
    '.ypl-sube{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;min-height:58px;border-radius:12px;border:2px dashed #3a3360;background:#0F0C1E;color:#A99FC8;font:800 14px Nunito,sans-serif;cursor:pointer}' +
    '.ypl-sube svg{width:24px;height:24px}' +
    '.ypl-sube input{position:absolute;inset:0;opacity:0;cursor:pointer}' +
    '.ypl-sube.con{justify-content:flex-start;padding:6px;border-style:solid;border-color:rgba(198,224,0,.6);color:#EEEAF7}' +
    '.ypl-sube.con img{width:46px;height:72px;object-fit:cover;border-radius:8px}' +
    '.ypl-cod{display:flex;gap:8px;margin-top:8px}' +
    '.ypl-cod input{width:52px;height:58px;border-radius:12px;border:2px solid #2A2346;background:#0F0C1E;color:#fff;text-align:center;font:900 26px Nunito,sans-serif;outline:none}' +
    '.ypl-cod input:focus{border-color:#C6E000}' +
    '.ypl-ej{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;line-height:1.3;color:#A99FC8}' +
    '.ypl-ej i{display:inline-flex;gap:3px;font-style:normal}' +
    '.ypl-ej i span{display:inline-grid;place-items:center;width:20px;height:22px;border-radius:5px;background:#e9e6f2;color:#2a2152;font:900 12px Nunito,sans-serif}' +
    '.ypl-bt{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:16px;border:0;border-radius:16px;padding:14px;background:#C6E000;color:#151A03;font:900 17px Nunito,sans-serif;box-shadow:0 4px 0 #8fa300;cursor:pointer;text-decoration:none}' +
    '.ypl-bt:active{transform:translateY(3px);box-shadow:0 1px 0 #8fa300}' +
    '.ypl-bt:disabled{opacity:.45;cursor:default;transform:none;box-shadow:0 4px 0 #8fa300}' +
    '.ypl-bt.gris{background:#1D1834;color:#EEEAF7;box-shadow:0 4px 0 #0c0918}' +
    '.ypl-nota{display:flex;gap:8px;margin-top:12px;font-size:12px;line-height:1.4;color:#A99FC8}' +
    '.ypl-nota svg{width:16px;height:16px;margin-top:1px;color:#1CB0F6}' +
    '.ypl-ayuda{display:block;margin-top:10px;text-align:center;font:800 12.5px Nunito,sans-serif;color:#A99FC8}' +
    '.ypl-ayuda a{color:#C6E000;text-decoration:underline}' +
    '.ypl-est{text-align:center;padding:10px 4px 2px}' +
    '.ypl-est .ic{width:86px;height:86px;margin:4px auto 10px;display:grid;place-items:center;border-radius:50%;background:rgba(198,224,0,.12);color:#C6E000}' +
    '.ypl-est .ic.oro{background:rgba(255,200,0,.12);color:#FFC800}' +
    '.ypl-est .ic.rojo{background:rgba(255,75,75,.12);color:#FF6B6B}' +
    '.ypl-est .ic svg{width:46px;height:46px;stroke-width:2.2}' +
    '.ypl-est h3{font:900 24px/1.15 Nunito,sans-serif}' +
    '.ypl-est h3 em{color:#C6E000;font-style:normal}' +
    '.ypl-est p{color:#A99FC8;margin-top:8px;font-size:14px}' +
    '.ypl-est p b{color:#EEEAF7}' +
    '.ypl-chip{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:99px;background:rgba(28,176,246,.12);color:#1CB0F6;font:800 13px Nunito,sans-serif}' +
    '.ypl-chip svg{width:16px;height:16px}' +
    '.ypl-gira{width:64px;height:64px;margin:12px auto 10px;border-radius:50%;border:6px solid #2A2346;border-top-color:#C6E000;animation:yplGira 1s linear infinite}' +
    '@keyframes yplGira{to{transform:rotate(360deg)}}' +
    '.ypl-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:70;max-width:calc(100% - 32px);padding:10px 16px;border-radius:12px;background:#EEEAF7;color:#151127;font:800 14px Nunito,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)}' +
    '@media (prefers-reduced-motion:reduce){.ypl-ov,.ypl,.ypl-gira{animation:none}}';

  var IC = {
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    area: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>',
    total: '<svg viewBox="0 0 24 24"><path d="M5 18h14l1.5-10-5 3.5L12 5l-3.5 6.5-5-3.5z"/><path d="M5 21h14"/></svg>',
    sube: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L7 20"/></svg>',
    reloj: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>',
    escudo: '<svg viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/></svg>',
    llave: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/></svg>',
    no: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>'
  };

  function css() {
    if (document.getElementById('yplCss')) return;
    var s = document.createElement('style'); s.id = 'yplCss'; s.textContent = CSS; document.head.appendChild(s);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sol(n) { return 'S/ ' + (+n).toFixed(2); }
  function fecha(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); if (!m) return '';
    var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    return +m[3] + ' ' + MES[+m[2] - 1] + ' ' + m[1];
  }
  function toast(t) {
    var v = document.querySelector('.ypl-toast'); if (v) v.remove();
    v = document.createElement('div'); v.className = 'ypl-toast'; v.textContent = t; document.body.appendChild(v);
    setTimeout(function () { v.remove(); }, 3200);
  }
  function rpc(fn, args) {
    if (!window.MCAuth) return Promise.reject(new Error('sin auth'));
    return MCAuth.listo.then(function (c) { return c.rpc(fn, args || {}); }).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function ventana(html, color) {
    css();
    var o = document.createElement('div'); o.className = 'ypl-ov';
    o.innerHTML = '<div class="ypl" role="dialog" aria-modal="true" style="--yc:' + (color || '#C6E000') + '"><button type="button" class="ypl-x" aria-label="Cerrar" data-cerrar>' + IC.x + '</button><div class="ypl-in">' + html + '</div></div>';
    o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-cerrar]')) o.remove(); });
    document.body.appendChild(o);
    return o;
  }
  // Achica la captura (máx. 1280 px, JPG) para que suba rápido
  function achicar(file) {
    return new Promise(function (ok, mal) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : mal(new Error('imagen')); }, 'image/jpeg', .82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('imagen')); };
      img.src = url;
    });
  }
  function wsp(texto) { window.open('https://wa.me/' + WSP + '?text=' + encodeURIComponent(texto), '_blank'); }

  function abrir(P) {
    P = P || {};
    var nombre = P.nombre || (P.plan === 'total' ? 'Plan Total' : 'Plan'), per = P.periodo === 'mes' ? '30 días' : 'Ciclo · 90 días';
    var precio = +P.precio || 0, miId = null;
    function msgWsp(extra) {
      return 'Hola Modo Cachimbo, quiero el ' + nombre + ' (' + (P.periodo === 'mes' ? 'mensual' : 'por ciclo') + ') por ' + sol(precio) + '.\nMi ID: ' + (miId || '(sin ID)') + (extra || '');
    }

    // App de Play Store: no se cobra por fuera de Google Play
    if (window.MCEnApp) {
      ventana('<div class="ypl-est"><div class="ic oro">' + IC.reloj + '</div><h3>Muy <em>pronto</em></h3><p>Muy pronto podrás activar tu plan aquí en la app. Mientras tanto, si ya tienes un código, actívalo desde el candado.</p>' +
        '<button type="button" class="ypl-bt" data-cerrar>Entendido</button><small class="ypl-ayuda">¿Necesitas ayuda? <a href="#" data-ayuda>Escríbenos por WhatsApp</a></small></div>')
        .addEventListener('click', function (e) { if (e.target.closest('[data-ayuda]')) { e.preventDefault(); wsp('Hola Modo Cachimbo, necesito ayuda con mi código.'); } });
      return;
    }

    var archivo = null;
    var o = ventana(
      '<div class="ypl-top"><span class="ic">' + (P.plan === 'total' ? IC.total : IC.area) + '</span><span><b>' + esc(nombre) + '</b><small>' + per + ' · se activa en tu cuenta</small></span></div>' +
      '<div class="ypl-precio"><span>Total a pagar</span><b id="yplPrecio">' + sol(precio) + '</b></div>' +
      '<div class="ypl-paso"><span class="ypl-n">1</span><div class="ypl-c"><h4>Yapea <span data-monto>' + sol(precio) + '</span></h4><div class="ypl-num"><div><b>' + YAPE + '</b><small>A nombre de ' + YAPE_NOMBRE + '</small></div><button type="button" data-copiar>Copiar</button></div></div></div>' +
      '<div class="ypl-paso" id="yplP2"><span class="ypl-n">2</span><div class="ypl-c"><h4>Sube tu captura</h4><label class="ypl-sube" id="yplSube">' + IC.sube + '<span>Elegir captura</span><input type="file" accept="image/*" id="yplFile"></label></div></div>' +
      '<div class="ypl-paso" id="yplP3"><span class="ypl-n">3</span><div class="ypl-c"><h4>Código de seguridad</h4><div class="ypl-cod"><input inputmode="numeric" maxlength="1" aria-label="Primer número"><input inputmode="numeric" maxlength="1" aria-label="Segundo número"><input inputmode="numeric" maxlength="1" aria-label="Tercer número"></div>' +
        '<div class="ypl-ej"><i><span>3</span><span>3</span><span>9</span></i>Los 3 números que salen en tu captura de Yape.</div></div></div>' +
      '<button type="button" class="ypl-bt" id="yplEnviar" disabled>Enviar y activar</button>' +
      '<div class="ypl-nota">' + IC.escudo + '<span>Revisamos cada pago. Si la captura no corresponde a un Yape real, el acceso se quita.</span></div>' +
      '<small class="ypl-ayuda">¿Problemas? <a href="#" data-wsp>Escríbenos por WhatsApp</a></small>', P.color);

    // El precio de verdad lo da el servidor
    rpc('yape_plan_ver', { p_plan: P.plan, p_periodo: P.periodo, p_area: P.area || null }).then(function (d) {
      if (!d) return;
      miId = d.id || null;
      if (+d.monto > 0 && +d.monto !== precio) {
        precio = +d.monto;
        o.querySelector('#yplPrecio').textContent = sol(precio);
        o.querySelector('[data-monto]').textContent = sol(precio);
      }
    }, function () {});

    var cods = [].slice.call(o.querySelectorAll('.ypl-cod input')), env = o.querySelector('#yplEnviar');
    function codigo() { return cods.map(function (x) { return x.value; }).join(''); }
    function listo() {
      o.querySelector('#yplP3').classList.toggle('ok', /^\d{3}$/.test(codigo()));
      env.disabled = !(archivo && /^\d{3}$/.test(codigo()));
    }
    cods.forEach(function (x, k) {
      x.addEventListener('input', function () {
        var v = x.value.replace(/\D/g, '');
        if (v.length > 1) { v.split('').slice(0, 3 - k).forEach(function (d, j) { cods[k + j].value = d; }); (cods[Math.min(2, k + v.length)] || x).focus(); }
        else { x.value = v; if (v && cods[k + 1]) cods[k + 1].focus(); }
        listo();
      });
      x.addEventListener('keydown', function (e) { if (e.key === 'Backspace' && !x.value && cods[k - 1]) cods[k - 1].focus(); });
    });
    o.querySelector('[data-copiar]').addEventListener('click', function () {
      var num = YAPE.replace(/\s/g, '');
      try { navigator.clipboard.writeText(num).then(function () { toast('Número copiado: ' + YAPE); }, function () { toast('Yape: ' + YAPE); }); } catch (e) { toast('Yape: ' + YAPE); }
    });
    o.querySelector('[data-wsp]').addEventListener('click', function (e) { e.preventDefault(); wsp(msgWsp('\nTe paso la captura del Yape.')); });
    o.querySelector('#yplFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      archivo = f;
      var sube = o.querySelector('#yplSube');
      sube.classList.add('con');
      var sv = sube.querySelector('svg'); if (sv) sv.remove();
      var im = sube.querySelector('img') || sube.insertBefore(document.createElement('img'), sube.firstChild);
      im.src = URL.createObjectURL(f);
      sube.querySelector('span').textContent = 'Captura lista · toca para cambiar';
      o.querySelector('#yplP2').classList.add('ok');
      listo();
      if (!codigo()) cods[0].focus();
    });
    env.addEventListener('click', function () {
      if (env.disabled) return;
      var u = window.MCAuth && MCAuth.usuario();
      if (!u) { toast('Entra con tu cuenta primero.'); return; }
      env.disabled = true; env.textContent = 'Enviando…';
      var ruta = u.id + '/' + Date.now() + '.jpg';
      achicar(archivo).then(function (blob) {
        return MCAuth.listo.then(function (c) { return c.storage.from('yape').upload(ruta, blob, { contentType: 'image/jpeg', upsert: false }); });
      }).then(function (r) {
        if (r && r.error) throw r.error;
        return rpc('yape_pedir_plan', { p_plan: P.plan, p_periodo: P.periodo, p_area: P.area || null, p_codigo: codigo(), p_captura: ruta });
      }).then(function (d) { resultado(o, d); }, function (e) {
        var m = String(e && (e.message || e) || '');
        env.disabled = false; env.textContent = 'Enviar y activar';
        if (/yape_codigo/.test(m)) return toast('Escribe los 3 números del código de seguridad.');
        if (/yape_muchas/.test(m)) return toast('Ya tienes pagos en revisión. Espera a que terminen.');
        if (/yape_dia/.test(m)) return toast('Llegaste al máximo de compras de hoy. Escríbenos por WhatsApp.');
        if (/yape_plan/.test(m)) return toast('Ese plan no está disponible ahora.');
        if (/imagen/.test(m)) return toast('No se pudo leer esa imagen. Prueba con otra captura.');
        if (/bucket|does not exist|Could not find the function/i.test(m)) { toast('La compra automática se activa pronto. Te abrimos WhatsApp.'); return wsp(msgWsp('\nYa yapeé a ' + YAPE + ' (' + YAPE_NOMBRE + '). Te paso la captura.')); }
        toast('No se pudo enviar. Revisa tu internet e intenta otra vez.');
      });
    });

    function resultado(o, d) {
      // Que la próxima página vuelva a preguntar sus accesos
      try { localStorage.removeItem('mc_accesos_id'); } catch (e) {}
      var caja = o.querySelector('.ypl-in'), h;
      d = d || {};
      if (d.estado === 'aprobada') {
        h = '<div class="ypl-est"><div class="ic">' + IC.check + '</div><h3>¡Plan <em>activado</em>!</h3><p>Tu <b>' + esc(d.detalle || nombre) + '</b> ya está en tu cuenta.</p>' +
          (d.vence ? '<span class="ypl-chip">' + IC.cal + 'Hasta el ' + fecha(d.vence) + '</span>' : '') +
          '<a class="ypl-bt" href="index.html">Empezar a estudiar</a></div>';
      } else if (d.estado === 'revision' && d.prueba) {
        h = '<div class="ypl-est"><div class="ic">' + IC.llave + '</div><h3>Ya puedes <em>estudiar</em></h3><p>Te dimos <b>acceso de prueba hasta mañana</b> mientras confirmamos tu Yape de <b>' + sol(d.monto || precio) + '</b>. Cuando lo confirmemos, tu plan queda completo.</p>' +
          '<span class="ypl-chip">' + IC.reloj + 'Pago en revisión</span>' +
          '<a class="ypl-bt" href="index.html">Empezar a estudiar</a></div>';
      } else if (d.estado === 'rechazada') {
        h = '<div class="ypl-est"><div class="ic rojo">' + IC.no + '</div><h3>No se <em>activó</em></h3><p>' + esc(d.nota || 'No encontramos ese pago.') + '</p><button type="button" class="ypl-bt gris" data-wsp2>Escribir por WhatsApp</button></div>';
      } else {
        h = '<div class="ypl-est"><div class="ic oro">' + IC.reloj + '</div><h3>Pago en <em>revisión</em></h3><p>Estamos revisando tu Yape de <b>' + sol(d.monto || precio) + '</b>. Tu plan se activa apenas lo confirmemos, normalmente el mismo día. Puedes cerrar esta ventana.</p>' +
          '<button type="button" class="ypl-bt" data-cerrar>Entendido</button></div>';
      }
      caja.innerHTML = h;
      var w = caja.querySelector('[data-wsp2]'); if (w) w.addEventListener('click', function () { wsp(msgWsp('\nMi compra no se activó.')); });
    }
  }

  window.MCYapePlan = { abrir: abrir };
})();

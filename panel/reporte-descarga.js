/* Panel → Reportes: descargar un reporte (o la lista filtrada) en PDF o en imagen
   con los datos del alumno que lo mandó TAPADOS.
   El nombre, apodo, correo e ID del alumno nunca se ponen en la hoja que se
   fotografía: en su lugar van barras de "dato oculto". Si el alumno escribió un
   correo o un número de celular dentro del comentario, también se tapa. */
(function () {
  var CDN = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
  };
  var C = { fondo: '#0B0818', tarjeta: '#151127', caja: '#110D20', borde: '#2A2346', lima: '#C6E000', ambar: '#FBBF24', verde: '#25D366', texto: '#EEEAF7', tenue: '#A99FC8', apagado: '#6F6690' };
  var ANCHO = 900; // px de la hoja que se fotografía

  var ICO = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 18 15 15"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><polyline points="21 15 16 10 5 21"/></svg>',
    ojo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    gira: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fecha(iso) { var d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'reporte'; }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  function cargarJs(src) {
    return new Promise(function (ok, mal) {
      var s0 = document.querySelector('script[data-mcd="' + src + '"]');
      if (s0) { if (s0.dataset.listo) return ok(); s0.addEventListener('load', function () { ok(); }); s0.addEventListener('error', mal); return; }
      var s = document.createElement('script'); s.src = src; s.async = true; s.dataset.mcd = src;
      s.onload = function () { s.dataset.listo = '1'; ok(); }; s.onerror = function () { mal(new Error('No se pudo cargar la herramienta de descarga. Revisa tu internet.')); };
      document.head.appendChild(s);
    });
  }
  function libs(conPdf) {
    return Promise.all([
      window.html2canvas ? null : cargarJs(CDN.h2c),
      conPdf && !window.jspdf ? cargarJs(CDN.jspdf) : null
    ]);
  }

  var LOGO = null;
  function logo() {
    if (LOGO) return Promise.resolve(LOGO);
    return fetch('../assets/img/logo-modo-cachimbo-horizontal.svg').then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) {
        // Las clases del SVG (.cls-1…) se pasan a fill="" porque html2canvas no lee el <style> interno
        t = t.replace(/<\?xml[^>]*>/, '');
        var reglas = {}, m = t.match(/<style[^>]*>([\s\S]*?)<\/style>/);
        if (m) m[1].replace(/\.([\w-]+)\s*\{\s*fill\s*:\s*([^;}]+);?\s*\}/g, function (x, c, f) { reglas[c] = f.trim(); });
        t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/, '').replace(/class="([\w-]+)"/g, function (x, c) { return reglas[c] ? 'fill="' + reglas[c] + '"' : x; });
        // Se pasa a PNG: html2canvas recorta los SVG sin ancho/alto propio
        return new Promise(function (ok) {
          var im = new Image();
          im.onload = function () {
            var h = 120, w = Math.round(h * (im.naturalWidth || 1844) / (im.naturalHeight || 393));
            var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(im, 0, 0, w, h);
            try { LOGO = cv.toDataURL('image/png'); } catch (e) { LOGO = ''; }
            ok(LOGO);
          };
          im.onerror = function () { LOGO = ''; ok(LOGO); };
          var vb = (t.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/) || []);
          if (vb[1] && !/<svg[^>]*\swidth=/.test(t)) t = t.replace('<svg', '<svg width="' + vb[1] + '" height="' + vb[2] + '"');
          im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t);
        });
      })
      .catch(function () { LOGO = ''; return LOGO; });
  }

  // Correos y celulares escritos dentro del comentario o la pregunta → barra tapada
  var TAPA_IN = '<span style="display:inline-block;vertical-align:middle;width:110px;height:14px;border-radius:4px;background:#3A3260;border:1px solid #4A4178;"></span>';
  function tapar(txt) {
    return esc(txt)
      .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, TAPA_IN)
      .replace(/(\+?51[\s-]?)?\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, TAPA_IN);
  }

  function barra(w) { return '<span style="display:inline-block;width:' + w + 'px;height:18px;border-radius:5px;background:#3A3260;border:1px solid #4A4178;"></span>'; }

  function ubicacion(r) {
    return /^examenes\//.test(r.carpeta || '') ? esc(r.anio) : esc(r.anio) + ' · Tema ' + esc(r.tema) + (r.temaNombre ? ' – ' + esc(r.temaNombre) : '');
  }
  function colorEstado(e) { return e === 'Pendiente' ? C.ambar : e === 'Corregido' ? C.verde : C.apagado; }

  function tarjetaHtml(r) {
    var pill = 'display:inline-block;font-size:15px;font-weight:800;padding:6px 14px;border-radius:100px;';
    var caja = 'background:' + C.caja + ';border:1.5px solid #251F3F;border-radius:14px;padding:14px 16px;';
    var k = 'font-size:12.5px;letter-spacing:1.6px;text-transform:uppercase;color:' + C.apagado + ';font-weight:800;margin-bottom:6px;';
    var ec = colorEstado(r.estado);
    return '<div style="background:' + C.tarjeta + ';border:1.5px solid ' + C.borde + ';border-bottom:5px solid ' + (r.estado === 'Pendiente' ? C.ambar : '#2C2549') + ';border-radius:20px;padding:26px 28px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px;">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<span style="' + pill + 'background:rgba(198,224,0,.12);color:' + C.lima + ';">' + esc(r.curso) + '</span>' +
          '<span style="' + pill + 'background:#221C3B;color:' + C.tenue + ';font-weight:700;">' + ubicacion(r) + '</span>' +
          '<span style="' + pill + 'background:#221C3B;color:' + ec + ';">' + esc(r.estado) + '</span>' +
        '</div>' +
        '<span style="font-size:14px;color:' + C.apagado + ';font-weight:600;">' + fecha(r.fecha) + '</span>' +
      '</div>' +
      '<div class="mcrd-q" style="font-size:19px;line-height:1.6;color:#ECE8F6;margin-bottom:18px;"><b style="color:' + C.lima + ';font-weight:900;margin-right:6px;">P' + esc(r.pregunta) + '</b>' + tapar(r.extracto) + '</div>' +
      '<div style="display:flex;gap:12px;margin-bottom:' + (r.comentario ? 14 : 18) + 'px;">' +
        '<div style="flex:1;' + caja + '"><div style="' + k + '">Clave marcada</div><div style="font-size:18px;color:' + C.texto + ';font-weight:700;">' + (tapar(r.marcada) || '—') + '</div></div>' +
        '<div style="flex:1;' + caja + 'border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.08);"><div style="' + k + '">Alumno sugiere</div><div style="font-size:18px;color:' + C.ambar + ';font-weight:800;">' + (tapar(r.sugerida) || '—') + '</div></div>' +
      '</div>' +
      (r.comentario ? '<div style="font-size:16px;line-height:1.55;color:' + C.tenue + ';background:' + C.caja + ';border-left:4px solid #352E58;border-radius:0 12px 12px 0;padding:12px 16px;margin-bottom:18px;"><div style="' + k + '">Comentario</div>' + tapar(r.comentario) + '</div>' : '') +
      // Quién lo mandó: siempre tapado
      '<div style="display:flex;align-items:center;gap:14px;background:#0F0C1C;border:1.5px dashed #3A3260;border-radius:14px;padding:12px 16px;">' +
        '<span style="flex:none;width:34px;height:34px;border-radius:10px;background:rgba(198,224,0,.12);color:' + C.lima + ';display:flex;align-items:center;justify-content:center;"><span style="width:20px;height:20px;display:block;">' + ICO.ojo + '</span></span>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:12.5px;letter-spacing:1.6px;text-transform:uppercase;color:' + C.apagado + ';font-weight:800;margin-bottom:7px;">Reportado por</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' + barra(150) + barra(90) + barra(210) + '</div>' +
        '</div>' +
        '<span style="flex:none;font-size:13px;font-weight:800;color:' + C.lima + ';">Datos ocultos</span>' +
      '</div>' +
    '</div>';
  }

  function cabeceraHtml(titulo, sub, logoSrc) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:22px;">' +
      (logoSrc ? '<img src="' + logoSrc + '" style="height:46px;width:auto;display:block;">' : '<span style="font-size:26px;font-weight:900;color:' + C.lima + ';">MODO CACHIMBO</span>') +
      '<div style="text-align:right;">' +
        '<div style="font-family:\'Barlow Condensed\',\'Arial Narrow\',sans-serif;font-size:30px;font-weight:800;color:' + C.texto + ';text-transform:uppercase;letter-spacing:.5px;line-height:1;">' + esc(titulo) + '</div>' +
        '<div style="font-size:14px;color:' + C.tenue + ';margin-top:4px;font-weight:600;">' + esc(sub) + '</div>' +
      '</div>' +
    '</div>';
  }
  function pieHtml() {
    return '<div style="margin-top:20px;display:flex;justify-content:space-between;font-size:13px;color:' + C.apagado + ';font-weight:600;">' +
      '<span>Los datos del alumno se ocultaron al descargar.</span><span>modocachimbo.github.io</span></div>';
  }

  // Arma una hoja fuera de la pantalla y la convierte en lienzo
  function foto(interior) {
    var hoja = document.createElement('div');
    hoja.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + ANCHO + 'px;box-sizing:border-box;padding:34px 36px 26px;background:' + C.fondo + ';color:' + C.texto + ';font-family:Nunito,Inter,system-ui,sans-serif;';
    hoja.innerHTML = interior;
    document.body.appendChild(hoja);
    if (window.renderMathInElement) {
      try { renderMathInElement(hoja, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false }); } catch (e) {}
    }
    var esperaImgs = Array.prototype.map.call(hoja.querySelectorAll('img'), function (im) {
      return im.complete ? null : new Promise(function (ok) { im.onload = im.onerror = ok; });
    });
    return Promise.all(esperaImgs).then(function () { return document.fonts ? document.fonts.ready : null; }).then(function () {
      return html2canvas(hoja, { scale: 2, backgroundColor: C.fondo, logging: false, useCORS: true });
    }).then(function (cv) { hoja.remove(); return cv; }, function (e) { hoja.remove(); throw e; });
  }

  function bajar(href, nombre) {
    var a = document.createElement('a'); a.href = href; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }

  // Una página A4 con fondo oscuro; si la imagen es más alta que la hoja, se reparte en varias páginas
  function pdfDe(lienzos, nombre) {
    var PDF = window.jspdf.jsPDF, doc = new PDF({ unit: 'mm', format: 'a4' });
    var W = 210, H = 297, M = 10, ancho = W - 2 * M;
    var y = M, primera = true;
    function pagina() { if (!primera) doc.addPage(); primera = false; doc.setFillColor(11, 8, 24); doc.rect(0, 0, W, H, 'F'); y = M; }
    pagina();
    lienzos.forEach(function (cv) {
      var alto = cv.height * ancho / cv.width;
      if (alto <= H - 2 * M) {
        if (y + alto > H - M) pagina();
        doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', M, y, ancho, alto);
        y += alto + 4;
        return;
      }
      // Muy alta: se corta en tiras del alto de la página
      var tiraPx = Math.floor((H - 2 * M) * cv.width / ancho), hecho = 0;
      while (hecho < cv.height) {
        if (y > M) pagina();
        var h = Math.min(tiraPx, cv.height - hecho), t = document.createElement('canvas');
        t.width = cv.width; t.height = h; t.getContext('2d').drawImage(cv, 0, hecho, cv.width, h, 0, 0, cv.width, h);
        doc.addImage(t.toDataURL('image/jpeg', 0.92), 'JPEG', M, M, ancho, h * ancho / cv.width);
        hecho += h; y = H;
      }
    });
    doc.save(nombre);
  }

  function nombreDe(r) { return 'reporte-' + slug(r.curso) + '-P' + slug(r.pregunta) + '-' + hoy(); }

  function trabajando(btn, si) {
    if (!btn) return;
    if (si) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="mcrd-gira">' + ICO.gira + '</span> Preparando…'; }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  }
  function aviso(msg, err) { if (typeof window.toast === 'function') window.toast(msg, err); }

  function uno(r, formato, btn) {
    trabajando(btn, true);
    return Promise.all([libs(formato === 'pdf'), logo()]).then(function (x) {
      return foto(cabeceraHtml('Reporte de clave', 'Descargado el ' + new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), x[1]) + tarjetaHtml(r) + pieHtml());
    }).then(function (cv) {
      if (formato === 'pdf') pdfDe([cv], nombreDe(r) + '.pdf');
      else bajar(cv.toDataURL('image/png'), nombreDe(r) + '.png');
      aviso(formato === 'pdf' ? 'PDF descargado (datos del alumno tapados)' : 'Imagen descargada (datos del alumno tapados)');
    }).catch(function (e) { aviso((e && e.message) || 'No se pudo descargar', true); })
      .then(function () { trabajando(btn, false); });
  }

  // Todos los reportes que se ven con el filtro actual, en un solo PDF
  function lista(rows, etiqueta, btn) {
    if (!rows || !rows.length) { aviso('No hay reportes para descargar con ese filtro.', true); return Promise.resolve(); }
    if (rows.length > 150) { aviso('Son ' + rows.length + ' reportes. Usa un filtro (curso o estado) para bajar 150 o menos.', true); return Promise.resolve(); }
    trabajando(btn, true);
    return Promise.all([libs(true), logo()]).then(function (x) {
      var cab = cabeceraHtml('Reportes de claves', etiqueta + ' · ' + rows.length + (rows.length === 1 ? ' reporte' : ' reportes'), x[1]);
      var lienzos = [], i = 0;
      function sig() {
        if (i >= rows.length) return lienzos;
        var html = (i === 0 ? cab : '') + tarjetaHtml(rows[i]) + (i === rows.length - 1 ? pieHtml() : '');
        i++;
        return foto(html).then(function (cv) { lienzos.push(cv); if (btn) btn.lastChild.textContent = ' ' + i + ' de ' + rows.length + '…'; return sig(); });
      }
      return sig();
    }).then(function (lienzos) {
      pdfDe(lienzos, 'reportes-' + slug(etiqueta) + '-' + hoy() + '.pdf');
      aviso('PDF descargado con ' + rows.length + (rows.length === 1 ? ' reporte' : ' reportes') + ' (datos tapados)');
    }).catch(function (e) { aviso((e && e.message) || 'No se pudo descargar', true); })
      .then(function () { trabajando(btn, false); });
  }

  function botones(fila) {
    return '<span class="mcrd-grupo"><span class="mcrd-lbl">Descargar</span>' +
      '<button class="rbtn" type="button" data-rd="pdf" data-fila="' + esc(fila) + '" title="Descargar en PDF con los datos del alumno tapados">' + ICO.pdf + ' PDF</button>' +
      '<button class="rbtn" type="button" data-rd="img" data-fila="' + esc(fila) + '" title="Descargar como imagen con los datos del alumno tapados">' + ICO.img + ' Imagen</button></span>';
  }

  var st = document.createElement('style');
  st.textContent = '.mcrd-grupo{display:inline-flex;align-items:center;gap:6px;margin-right:auto;flex-wrap:wrap}' +
    '.mcrd-lbl{font-size:11px;letter-spacing:1.4px;text-transform:uppercase;font-weight:800;color:var(--text-faint)}' +
    '.mcrd-gira{display:inline-flex;width:13px;height:13px;animation:mcrdg 1s linear infinite}.mcrd-gira svg{width:13px;height:13px}' +
    '@keyframes mcrdg{to{transform:rotate(360deg)}}' +
    '#btnRepPdf[disabled],.rbtn[disabled]{opacity:.7;cursor:progress}';
  document.head.appendChild(st);

  window.MCRepDesc = { botones: botones, uno: uno, lista: lista, tarjetaHtml: tarjetaHtml };
})();

/* =========================================================
   Modo Cachimbo · Registro de cursos (assets/cursos.json)
   Lo administra el panel. Aquí se usa para:
   - dibujar los cursos de cada área
   - configurar Repaso / Fijas en la página de cada curso
   - marcar Seminarios / Banqueo como Próximamente si aún no tienen temas
   - saber qué temas usa Fijas
   - agregar la tarjeta de Flashcards (tarjetas.html) en cada curso
   - ordenar las tarjetas del curso (automático o el orden del panel)
   ========================================================= */
(function () {
  var SCRIPT = document.currentScript;
  var ROOT = new URL('..', SCRIPT ? SCRIPT.src : location.href);
  var prom = null;

  function registro() {
    if (!prom) prom = fetch(new URL('assets/cursos.json', ROOT).href, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return prom;
  }
  function manifest(id, seccion) {
    return fetch(new URL(id + '/' + (seccion || 'libros') + '/data/manifest.json', ROOT).href, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }
  function curso(id) { return registro().then(function (reg) { return reg ? (reg.cursos || []).filter(function (c) { return c.id === id; })[0] || null : null; }); }
  function temasDe(man, anio) { var m = (man || []).filter(function (x) { return x.id === anio; })[0]; return m ? (m.temas || 0) : 0; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function estilosDisabled() {
    if (document.getElementById('mcc-css')) return;
    var st = document.createElement('style'); st.id = 'mcc-css';
    st.textContent = '.course.disabled{opacity:.5}.course.disabled .icon{color:var(--text-faint,#5f5f5f)}.course.disabled h3{color:var(--text-faint,#5f5f5f)}' +
      '.course.disabled .rule{background:var(--text-faint,#5f5f5f)}.course.disabled .btn{background:var(--surface-2,#141414);color:var(--text-faint,#5f5f5f);pointer-events:none;cursor:default}' +
      '.course .icon img{width:100%;height:100%;object-fit:contain;display:block}';
    document.head.appendChild(st);
  }

  // Ícono: los SVG se insertan en la página (así toman el color verde); los PNG van como imagen
  var cacheIcono = {};
  function icono(ruta) {
    if (!ruta) return Promise.resolve('');
    if (!/\.svg$/i.test(ruta)) return Promise.resolve('<img src="' + esc(new URL(ruta, ROOT).href) + '" alt="">');
    if (!cacheIcono[ruta]) cacheIcono[ruta] = fetch(new URL(ruta, ROOT).href).then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) {
        t = String(t || '').replace(/<\?xml[^>]*>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
          .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
        return /<svg[\s>]/i.test(t) ? t : '';
      }).catch(function () { return ''; });
    return cacheIcono[ruta];
  }

  /* ---------- Página de un área: dibuja sus cursos ---------- */
  function pintarArea(areaId) {
    return registro().then(function (reg) {
      if (!reg) return;
      var cont = document.querySelector('.courses'); if (!cont) return;
      var lista = (reg.cursos || []).filter(function (c) { return c.area === areaId && !c.oculto; })
        .sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
      estilosDisabled();
      return Promise.all(lista.map(function (c) { return icono(c.icono); })).then(function (iconos) {
        [].slice.call(cont.querySelectorAll('.course')).forEach(function (el) {
          var a = el.querySelector('a.btn');
          if (a && /^\.\.\/[a-z0-9-]+\/index\.html$/.test(a.getAttribute('href') || '')) el.remove();
        });
        var ref = cont.firstElementChild;
        lista.forEach(function (c, i) {
          var d = document.createElement('div');
          d.className = 'course active';
          d.innerHTML = '<div class="icon">' + iconos[i] + '</div><h3>' + esc(c.corto || c.nombre) + '</h3><div class="rule"></div>' +
            '<a class="btn" href="../' + esc(c.id) + '/index.html">Ver Curso</a>';
          cont.insertBefore(d, ref);
        });
      });
    });
  }

  /* ---------- Página de un curso: Seminarios y Banqueo ---------- */
  // Sin temas publicados en ningún ciclo, la tarjeta dice "Próximamente"
  function pintarSecciones(id) {
    return Promise.all(['seminarios', 'banqueo'].map(function (sec) {
      var a = document.querySelector('a[data-mc="' + sec + '"]');
      if (!a) return;
      return manifest(id, sec).then(function (man) {
        var total = (man || []).reduce(function (s, m) { return s + (m.temas || 0); }, 0);
        if (total > 0) return;
        estilosDisabled();
        var card = a.closest('.course');
        a.removeAttribute('href');
        a.textContent = 'Próximamente';
        if (card) { card.classList.remove('active'); card.classList.add('disabled'); }
      });
    }));
  }

  /* ---------- Página de un curso: tarjeta de Flashcards ---------- */
  var ICONO_TARJETAS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30 6h52a8 8 0 0 1 8 8v58a8 8 0 0 1-8 8h-3V14a1 1 0 0 0-1-1H22V14a8 8 0 0 1 8-8z" opacity=".55"/>' +
    '<path fill-rule="evenodd" d="M18 20h52a8 8 0 0 1 8 8v58a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8zm26 14c-9 0-15 5.5-15 12.5h9c0-2.4 2.4-4.5 6-4.5s6 1.9 6 4.3c0 2-1.2 3.1-4 4.7-4.3 2.4-6.5 5-6.5 10v2h8.6v-1.3c0-2.7 1-3.9 4-5.6 4.3-2.4 7-5.4 7-10.2C59 39.7 53 34 44 34zm-1 33a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/></svg>';
  function pintarTarjetas(id) {
    var cont = document.querySelector('.courses');
    if (!cont || cont.querySelector('[data-mc="tarjetas"]')) return;
    var d = document.createElement('div');
    d.className = 'course active';
    d.innerHTML = '<div class="icon">' + ICONO_TARJETAS + '</div><h3>Flashcards</h3><div class="rule"></div>' +
      '<a class="btn" data-mc="tarjetas" href="../tarjetas.html?curso=' + encodeURIComponent(id) + '">Entrar</a>';
    cont.appendChild(d);
    // 6 tarjetas: en pantallas anchas van de 3 en 3 para que ninguna quede sola
    if (!document.getElementById('mcc-css6')) {
      var st = document.createElement('style'); st.id = 'mcc-css6';
      st.textContent = '@media (min-width:1001px){.courses.con-tarjetas{grid-template-columns:repeat(3,1fr)}}';
      document.head.appendChild(st);
    }
    cont.classList.add('con-tarjetas');
  }

  /* ---------- Página de un curso: Repaso y Fijas ---------- */
  // Preguntas del banco propio de Fijas ({año}-fijas.json)
  function bancoFijas(id, anio) {
    if (!anio) return Promise.resolve(0);
    return fetch(new URL(id + '/libros/data/' + anio + '-fijas.json', ROOT).href, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (t) { return (t || []).reduce(function (s, x) { return s + ((x && x.questions) || []).length; }, 0); })
      .catch(function () { return 0; });
  }

  /* ---------- Orden de las tarjetas del curso ---------- */
  // Automático: este orden, y las de "Próximamente" al final. El panel puede guardar otro (c.ordenTarjetas).
  var ORDEN = ['libro', 'repaso', 'tarjetas', 'seminarios', 'banqueo', 'fijas'];
  function claveTarjeta(card) {
    var a = card.querySelector('a.btn'); if (!a) return '';
    var mc = a.getAttribute('data-mc'); if (mc) return mc;
    return /^libros\//.test(a.getAttribute('href') || '') ? 'libro' : '';
  }
  function ordenarTarjetas(c) {
    var cont = document.querySelector('.courses'); if (!cont) return;
    var manual = c && Array.isArray(c.ordenTarjetas) && c.ordenTarjetas.length ? c.ordenTarjetas : null;
    var orden = manual ? manual.concat(ORDEN.filter(function (k) { return manual.indexOf(k) < 0; })) : ORDEN;
    var cards = [].slice.call(cont.children).filter(function (el) { return el.classList.contains('course'); });
    cards.map(function (el, i) {
      var k = orden.indexOf(claveTarjeta(el));
      return { el: el, peso: (!manual && el.classList.contains('disabled') ? 100 : 0) + (k < 0 ? 50 : k), i: i };
    }).sort(function (a, b) { return a.peso - b.peso || a.i - b.i; })
      .forEach(function (x) { cont.appendChild(x.el); });
  }

  function pintarCurso(id) {
    pintarTarjetas(id);
    var secciones = pintarSecciones(id);
    return Promise.all([curso(id), manifest(id)]).then(function (r) {
      var c = r[0], man = r[1];
      if (!c) return secciones.then(function () { ordenarTarjetas(null); });
      return bancoFijas(id, c.fijas && c.fijas.modo === 'banco' && c.fijas.anio).then(function (nFijas) {
      estilosDisabled();
      var back = document.querySelector('a.back');
      if (back && c.area) back.setAttribute('href', '../areas/' + c.area + '.html');
      [['repaso', 'Repaso', c.repaso], ['fijas', 'Fijas', c.fijas]].forEach(function (x) {
        var a = document.querySelector('a[href^="' + x[0] + '.html"], a[data-mc="' + x[0] + '"]');
        if (!a) return;
        a.setAttribute('data-mc', x[0]);
        var card = a.closest('.course'), h = card && card.querySelector('h3');
        var cfg = x[2];
        // Fijas solo se abre con su banco propio con preguntas (se arma en el panel: Cursos → Armar Fijas)
        var listo = x[0] === 'fijas' ? nFijas > 0 : cfg && cfg.anio && temasDe(man, cfg.anio) > 0;
        if (listo) {
          a.setAttribute('href', x[0] + '.html?year=' + encodeURIComponent(cfg.anio));
          a.textContent = 'Entrar';
          if (h) h.textContent = x[1] + ' ' + cfg.anio;
          card.classList.remove('disabled'); card.classList.add('active');
        } else {
          a.removeAttribute('href');
          a.textContent = 'Próximamente';
          if (h) h.textContent = x[1];
          card.classList.remove('active'); card.classList.add('disabled');
        }
      });
      return secciones.then(function () { ordenarTarjetas(c); });
      });
    });
  }

  window.MCCursos = { registro: registro, curso: curso, manifest: manifest, pintarArea: pintarArea, pintarCurso: pintarCurso, icono: icono, raiz: ROOT };
})();

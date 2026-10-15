/* =========================================================
   Modo Cachimbo · Agenda del alumno
   - Fechas de Modo Cachimbo (agenda_general, con candado) y las
     que anota el alumno (agenda_alumno)
   - window.MCAgenda para Inicio, Perfil y el búho
   Requiere assets/auth.js y supabase/21-agenda.sql
   ========================================================= */
(function () {
  if (window.MCAgenda) return;

  var TIPOS = {
    examen:    { n: 'Examen',    c: '#FF4B4B' },
    seminario: { n: 'Seminario', c: '#FF9600' },
    simulacro: { n: 'Simulacro', c: '#1CB0F6' },
    tarea:     { n: 'Tarea',     c: '#CE82FF' },
    otro:      { n: 'Otro',      c: '#9A9A9A' }
  };
  var AVISOS = [[0, 'El mismo día'], [1, '1 día antes'], [3, '3 días antes'], [7, '1 semana antes']];
  var AVISO_GENERAL = 3;   // las fechas de Modo Cachimbo avisan desde 3 días antes
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

  var ICO = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    candado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    lapiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/></svg>',
    mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>'
  };

  var lista = null, pedido = null, sinTabla = false, oyentes = [];

  function dosDig(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate()); }
  function hoy() { return iso(new Date()); }
  function aFecha(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dias(s) {
    var a = aFecha(hoy()), b = aFecha(s);
    return Math.round((b - a) / 86400000);
  }
  function fechaCorta(s) { var d = aFecha(s); return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function hoyBurbuja() {
    var d = new Date();
    return d.getDate() + ' ' + MESES[d.getMonth()].toUpperCase() + ' ' + d.getFullYear();
  }

  function ordenar(a, b) {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
    return (a.hora || '99') < (b.hora || '99') ? -1 : 1;
  }

  function faltaTabla(e) { return e && (e.code === '42P01' || e.code === 'PGRST205' || /agenda_/.test(e.message || '') && /exist|schema cache/i.test(e.message || '')); }

  function cargar(forzar) {
    var A = window.MCAuth;
    if (!A || !A.usuario()) { lista = []; return Promise.resolve([]); }
    if (lista && !forzar) return Promise.resolve(lista);
    if (pedido && !forzar) return pedido;
    pedido = Promise.all([A.listo, A.perfil().catch(function () { return null; })]).then(function (r) {
      var c = r[0], p = r[1] || {};
      return Promise.all([
        c.from('agenda_general').select('*').order('fecha'),
        c.from('agenda_alumno').select('*').order('fecha')
      ]).then(function (rr) {
        var g = rr[0], m = rr[1];
        if (faltaTabla(g.error) || faltaTabla(m.error)) {
          // Todavía no se corrió supabase/21-agenda.sql: muestra la fecha de examen del perfil
          sinTabla = true;
          return p.fecha_examen ? [{ id: 'perfil', origen: 'mio', tipo: 'examen', titulo: 'Examen de admisión', fecha: p.fecha_examen, aviso: 7, fija: true }] : [];
        }
        if (g.error) throw g.error;
        if (m.error) throw m.error;
        var todo = [];
        (g.data || []).forEach(function (e) {
          if (e.para !== 'todos' && p.modalidad && e.para !== p.modalidad) return;
          todo.push(Object.assign({}, e, { origen: 'mc', aviso: AVISO_GENERAL }));
        });
        (m.data || []).forEach(function (e) { todo.push(Object.assign({}, e, { origen: 'mio' })); });
        return todo.sort(ordenar);
      });
    }).then(function (t) { lista = t; pedido = null; return t; }, function (e) { pedido = null; throw e; });
    return pedido;
  }

  function avisar() { oyentes.forEach(function (fn) { try { fn(lista || []); } catch (e) {} }); }
  function alCambiar(fn) { oyentes.push(fn); }

  function proximas(l, n) {
    var t = (l || lista || []).filter(function (e) { return dias(e.fecha) >= 0; });
    return n ? t.slice(0, n) : t;
  }

  // La fecha que el búho debe recordar hoy (la más cercana dentro de su aviso)
  function recordatorio(l) {
    var t = proximas(l);
    for (var i = 0; i < t.length; i++) {
      if (dias(t[i].fecha) <= (t[i].aviso == null ? AVISO_GENERAL : t[i].aviso)) return t[i];
    }
    return null;
  }

  function guardar(ev) {
    if (sinTabla) return Promise.reject(new Error('sin-tabla'));
    var fila = { tipo: ev.tipo, titulo: ev.titulo, fecha: ev.fecha, hora: ev.hora || null, nota: ev.nota || null, aviso: ev.aviso };
    return window.MCAuth.listo.then(function (c) {
      var q = ev.id ? c.from('agenda_alumno').update(fila).eq('id', ev.id) : c.from('agenda_alumno').insert(fila);
      return q.select().single();
    }).then(function (r) {
      if (r.error) throw r.error;
      return cargar(true).then(function () { avisar(); return r.data; });
    });
  }

  function borrar(id) {
    return window.MCAuth.listo.then(function (c) {
      return c.from('agenda_alumno').delete().eq('id', id);
    }).then(function (r) {
      if (r.error) throw r.error;
      return cargar(true).then(avisar);
    });
  }

  function google(ev) {
    var a = aFecha(ev.fecha), b = new Date(a); b.setDate(b.getDate() + 1);
    var f = function (d) { return iso(d).replace(/-/g, ''); };
    var fechas = f(a) + '/' + f(b);
    if (ev.hora) {
      var hh = Math.min(+ev.hora.slice(0, 2) + 1, 23), mm = ev.hora.slice(3);
      fechas = f(a) + 'T' + ev.hora.replace(':', '') + '00/' + f(a) + 'T' + dosDig(hh) + mm + '00';
    }
    var det = (ev.nota ? ev.nota + '\n\n' : '') + 'Desde mi agenda de Modo Cachimbo';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ev.titulo) +
      '&dates=' + fechas + '&details=' + encodeURIComponent(det) + '&ctz=America/Lima';
  }

  // "08:00" → "8:00 a. m."
  function hora12(h) {
    if (!h) return '';
    var x = +h.slice(0, 2), m = h.slice(3, 5);
    return (x % 12 || 12) + ':' + m + (x < 12 ? ' a. m.' : ' p. m.');
  }

  // "Mañana", "Hoy", "En 5 días"
  function cuando(s) {
    var d = dias(s);
    if (d === 0) return 'Hoy';
    if (d === 1) return 'Mañana';
    if (d < 0) return 'Pasó';
    return 'En ' + d + ' días';
  }

  if (window.MCAuth) window.MCAuth.alCambiar(function () { lista = null; });

  window.MCAgenda = {
    TIPOS: TIPOS, AVISOS: AVISOS, ICO: ICO, MESES: MESES,
    cargar: cargar, proximas: proximas, recordatorio: recordatorio,
    guardar: guardar, borrar: borrar, google: google, alCambiar: alCambiar,
    hoy: hoy, dias: dias, iso: iso, aFecha: aFecha, fechaCorta: fechaCorta, hoyBurbuja: hoyBurbuja, cuando: cuando, hora12: hora12,
    sinTabla: function () { return sinTabla; }
  };
})();

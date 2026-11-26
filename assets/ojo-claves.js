/* ============================================================
   Modo Cachimbo · Ojo de claves (Modo estudio)
   En tema.html (libros, seminarios, banqueo, prospecto, banqueo-ord)
   pone un botón con un ojo junto a Flashcards / Practicar:
   - Ojo abierto: se ven las claves marcadas en verde (como siempre).
   - Ojo tachado: las claves se esconden para que el alumno se ponga
     a prueba. Al tocar una alternativa de una pregunta se muestra la
     clave de ESA pregunta (y se puede volver a esconder tocando otra vez).
   Recuerda la elección en localStorage 'mc_ojo_claves' (la misma del
   ojo de Ejercicios MC en tema-ord.html).
   ============================================================ */
(function () {
  var KEY = 'mc_ojo_claves';
  var OJO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OJO_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

  function ver() { try { return localStorage.getItem(KEY) !== 'no'; } catch (e) { return true; } }
  function guardar(v) { try { localStorage.setItem(KEY, v ? 'si' : 'no'); } catch (e) {} }

  var st = document.createElement('style');
  st.textContent =
    '.quiz-cta .cta-btns .mc-ojo-btn{width:48px;height:48px;flex:none;padding:0;margin:0 0 5px;display:grid;place-items:center;cursor:pointer;' +
      'background:#1F1936;color:#C6E000;border:2px solid #3a4a00;border-radius:14px;box-shadow:0 5px 0 #3a4a00;-webkit-tap-highlight-color:transparent}' +
    '.quiz-cta .cta-btns .mc-ojo-btn svg{width:24px;height:24px}' +
    '.quiz-cta .cta-btns .mc-ojo-btn.off{color:#8F86B0;border-color:#322B52;box-shadow:0 5px 0 #322B52}' +
    '.quiz-cta .cta-btns .mc-ojo-btn:active{transform:translateY(5px);box-shadow:0 0 0 transparent}' +
    /* Clave escondida: la fila se ve como cualquier otra, sin el check */
    '.opt-row.mc-clave>svg{display:none}' +
    'body.mc-sin-claves .qcard .opts .opt-row{cursor:pointer}' +
    /* Pregunta abierta / especial: la respuesta se tapa */
    '.opt-row.mc-clave.mc-clave-abierta{position:relative;overflow:hidden}' +
    '.opt-row.mc-clave.mc-clave-abierta>*{filter:blur(7px);opacity:.55;user-select:none}' +
    '.opt-row.mc-clave.mc-clave-abierta::after{content:"Toca para ver la respuesta";position:absolute;inset:0;display:grid;place-items:center;font:900 13px Nunito,sans-serif;color:#C6E000;letter-spacing:.02em}' +
    '.mc-ojo-aviso{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);opacity:0;z-index:60;pointer-events:none;' +
      'background:#1D1834;color:#EEEAF7;border:2px solid #2C2549;border-bottom-width:4px;border-radius:14px;padding:10px 16px;font:800 13.5px Nunito,sans-serif;transition:.25s;max-width:calc(100vw - 32px);text-align:center}' +
    '.mc-ojo-aviso.si{opacity:1;transform:translateX(-50%) translateY(0)}';
  document.head.appendChild(st);

  // Esconde o muestra la clave de una tarjeta
  function tapar(card, esconder) {
    var filas = card.querySelectorAll(esconder ? '.opt-row.correct' : '.opt-row.mc-clave');
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i];
      if (esconder) {
        f.classList.remove('correct'); f.classList.add('mc-clave');
        if (!f.querySelector('.opt-text')) f.classList.add('mc-clave-abierta');
      } else {
        f.classList.remove('mc-clave', 'mc-clave-abierta'); f.classList.add('correct');
      }
    }
  }
  function aplicar() {
    var v = ver();
    document.body.classList.toggle('mc-sin-claves', !v);
    var cards = document.querySelectorAll('#qlist .qcard');
    for (var i = 0; i < cards.length; i++) { cards[i].classList.remove('mc-ver'); tapar(cards[i], !v); }
    var b = document.querySelector('.mc-ojo-btn');
    if (b) {
      b.classList.toggle('off', !v);
      b.innerHTML = v ? OJO : OJO_NO;
      var t = v ? 'Ocultar claves' : 'Mostrar claves';
      b.setAttribute('aria-label', t); b.title = t;
      b.setAttribute('aria-pressed', v ? 'false' : 'true');
    }
  }

  var tAviso;
  function aviso(txt) {
    var a = document.querySelector('.mc-ojo-aviso');
    if (!a) { a = document.createElement('div'); a.className = 'mc-ojo-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
    a.textContent = txt; a.classList.add('si');
    clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove('si'); }, 2200);
  }

  function poner() {
    if (document.querySelector('.mc-ojo-btn')) return aplicar();
    var caja = document.querySelector('.quiz-cta .cta-btns');
    if (!caja) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mc-ojo-btn';
    caja.appendChild(b);
    b.addEventListener('click', function () {
      var v = !ver(); guardar(v); aplicar();
      aviso(v ? 'Claves visibles' : 'Claves ocultas · toca una alternativa para ver la clave');
    });
    aplicar();
  }

  // Con las claves ocultas: tocar una alternativa muestra (o vuelve a esconder) la clave de esa pregunta
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('mc-sin-claves')) return;
    var fila = e.target.closest && e.target.closest('#qlist .qcard .opt-row');
    if (!fila || e.target.closest('a,button,input,textarea,select')) return;
    var card = fila.closest('.qcard');
    var abrir = !card.classList.contains('mc-ver');
    card.classList.toggle('mc-ver', abrir);
    tapar(card, !abrir);
  });

  document.addEventListener('mc:tema-listo', poner);
  if (window.MC_TEMA) poner();
})();

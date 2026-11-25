/* Práctica a lo ancho: en tablet y PC la tarjeta del quiz usa casi toda la pantalla.
   - Celular (< 640 px): igual que antes.
   - Tablet vertical (640–899): la tarjeta llena el ancho, letra un poco más grande.
   - Tablet horizontal / PC (>= 900 y pantalla echada): tarjeta ancha con la pregunta a la
     izquierda y las alternativas a la derecha, para que todo entre sin bajar.
   - Pantallas anchas pero no echadas (>= 900): tarjeta de 880–980 px; si todas las alternativas
     son cortas, van en 2 columnas.
   Se carga en el <head> (después del <style> de la página) para que no se vea un salto. */
(function () {
  var css = '' +
    '@media (min-width:640px){' +
      'html body{padding:20px 16px!important}' +
      'html body .card{max-width:calc(100vw - 32px)!important}' +
      'html body .question p{font-size:18px!important}' +
      'html body .option span.text{font-size:16.5px!important}' +
    '}' +
    '@media (min-width:900px){' +
      'html body{padding:28px 24px!important}' +
      'html body .card{max-width:880px!important}' +
      'html body .question p{font-size:20px!important}' +
      'html body .option span.text{font-size:17.5px!important}' +
      'html body .options.op-2{display:grid!important;grid-template-columns:1fr 1fr;align-items:start}' +
      'html body .options.op-2 .option{height:100%;box-sizing:border-box}' +
    '}' +
    /* Pantalla echada (tablet horizontal, PC): pregunta a la izquierda, alternativas a la derecha */
    '@media (min-width:900px) and (min-aspect-ratio:4/3){' +
      'html body .card{max-width:min(1240px,calc(100vw - 48px))!important}' +
      'html body .qa-split{display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);column-gap:26px;align-items:start;padding:0 28px}' +
      'html body .qa-split>*{grid-column:1/-1;margin-left:0!important;margin-right:0!important}' +
      'html body .qa-split>.badge{grid-column:1;grid-row:1;justify-self:start}' +
      'html body .qa-split>.question{grid-column:1;grid-row:2/5;margin-bottom:8px!important}' +
      'html body .qa-split>.q-graphic{grid-column:1;grid-row:5}' +
      'html body .qa-split>.options{grid-column:2;grid-row:1/3;padding:14px 0 0!important}' +
      'html body .qa-split>.feedback{grid-column:2;grid-row:3}' +
      'html body .qa-split>.navrow{grid-column:2;grid-row:4;padding-left:0!important;padding-right:0!important}' +
      'html body .qa-split>.options.mcq-cortas{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
      'html body .qa-split>.options.op-2{grid-template-columns:1fr}' +
      'html body .qa-split .option{padding:12px 16px!important}' +
      'html body .qa-split .option span.text{font-size:16.5px!important}' +
      'html body .qa-split .question{padding:18px 22px!important}' +
      'html body .qa-split .question p{font-size:19px!important}' +
      'html body .card .header{padding:18px 28px 10px!important}' +
      'html body .card .title{font-size:24px!important}' +
      'html body .card .topbar{margin-top:8px}' +
      'html body .card .progress-track{margin-top:10px}' +
      'html body .card .footer{padding:12px 28px 14px!important}' +
    '}' +
    '@media (min-width:1280px){' +
      'html body .card{max-width:980px!important}' +
      'html body .question p{font-size:21px!important}' +
      'html body .option span.text{font-size:18px!important}' +
    '}';
  var st = document.createElement('style');
  st.id = 'quiz-ancho';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var CORTA = 34;
  function revisar(box) {
    var ops = box.querySelectorAll('.option');
    var ok = ops.length >= 2;
    for (var i = 0; ok && i < ops.length; i++) {
      var t = ops[i].querySelector('.text') || ops[i];
      if (t.querySelector('img, table, svg, .katex-display, .mcq-base-ancha')) ok = false;
      else if ((t.textContent || '').replace(/\s+/g, ' ').trim().length > CORTA) ok = false;
    }
    box.classList.toggle('op-2', ok && !box.classList.contains('mcq-cortas'));
    var padre = box.parentElement;
    if (padre && padre.querySelector(':scope > .question')) padre.classList.add('qa-split');
  }
  function vigilar(box) {
    if (box._qa) return;
    box._qa = true;
    revisar(box);
    new MutationObserver(function () { revisar(box); }).observe(box, { childList: true, subtree: true, characterData: true });
  }
  // La pregunta se vuelve a pintar (innerHTML) al empezar: se buscan las cajas nuevas
  function buscar() {
    var cajas = document.querySelectorAll('.card .options');
    for (var i = 0; i < cajas.length; i++) vigilar(cajas[i]);
  }
  var pend = false;
  function iniciar() {
    buscar();
    new MutationObserver(function () {
      if (pend) return; pend = true;
      (window.requestAnimationFrame || setTimeout)(function () { pend = false; buscar(); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

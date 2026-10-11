/* =========================================================
   Panel · Botones de formato: Negrita, Cursiva, Subrayado
   - Aparecen encima de los cuadros de texto de preguntas
     (Subir tema, Editar pregunta y Flashcards).
   - Solo escriben las marcas por ti: **negrita**, *cursiva*, <u>subrayado</u>.
     Escribirlas a mano sigue funcionando igual.
   - Si lo seleccionado ya tenía la marca, se la quitan.
   - En Editar pregunta también sirven para las alternativas:
     actúan sobre el último campo donde escribiste.
   - Atajos: Ctrl/Cmd + B, I, U.
   ========================================================= */
(function () {
  const CAMPOS = '#subTexto, #edText, #tjTexto';
  const EDITABLES = CAMPOS + ', .opt-in';
  const MARCAS = { b: ['**', '**'], i: ['*', '*'], u: ['<u>', '</u>'] };
  let ultimo = null;

  const css = document.createElement('style');
  css.textContent =
    '.fmt-barra{display:flex;align-items:center;gap:6px;margin:0 0 8px;flex-wrap:wrap}' +
    '.fmt-barra button{min-width:38px;height:36px;padding:0 10px;border-radius:10px;background:#141414;color:var(--text);border:2px solid #2a2a2a;border-bottom-width:4px;cursor:pointer;font:900 15px Nunito,Inter,sans-serif;line-height:1}' +
    '.fmt-barra button:hover{border-color:#3a4a00;color:var(--accent)}' +
    '.fmt-barra button:active{transform:translateY(2px);border-bottom-width:2px}' +
    '.fmt-barra [data-f=i]{font-style:italic;font-weight:800}.fmt-barra [data-f=u]{text-decoration:underline;text-underline-offset:3px}' +
    '.fmt-barra span{color:var(--text-faint);font-size:12px;margin-left:4px}';
  document.head.appendChild(css);

  // ¿Este "*" es en realidad parte de un "**" (negrita)?
  const dobleAntes = (v, p) => v[p - 1] === '*' && v[p - 2] !== '*';
  const dobleDespues = (v, p) => v[p] === '*' && v[p + 1] !== '*';

  // Pone o quita la marca alrededor de lo seleccionado
  function aplicar(el, tipo) {
    if (!el || el.disabled || el.readOnly) return;
    const [ini, fin] = MARCAS[tipo];
    let a = el.selectionStart, z = el.selectionEnd;
    const v = el.value;
    // Sin selección: la palabra donde está el cursor
    if (a === z) {
      while (a > 0 && /[^\s*<>]/.test(v[a - 1])) a--;
      while (z < v.length && /[^\s*<>]/.test(v[z])) z++;
    }
    const sel = v.slice(a, z);
    let nuevo, selA, selZ;
    let fuera = v.slice(a - ini.length, a) === ini && v.slice(z, z + fin.length) === fin;
    let dentro = sel.length >= ini.length + fin.length && sel.startsWith(ini) && sel.endsWith(fin);
    if (tipo === 'i') {
      // Que la cursiva no se coma el borde de una negrita
      if (fuera && dobleAntes(v, a - 1) && dobleDespues(v, z + 1)) fuera = false;
      if (dentro && sel.startsWith('**') && !sel.startsWith('***')) dentro = false;
    }
    if (fuera) {
      nuevo = v.slice(0, a - ini.length) + sel + v.slice(z + fin.length);
      selA = a - ini.length; selZ = selA + sel.length;
    } else if (dentro) {
      const t = sel.slice(ini.length, sel.length - fin.length);
      nuevo = v.slice(0, a) + t + v.slice(z);
      selA = a; selZ = a + t.length;
    } else {
      nuevo = v.slice(0, a) + ini + sel + fin + v.slice(z);
      selA = a + ini.length; selZ = selA + sel.length;
    }
    el.focus();
    // execCommand conserva el "deshacer" (Ctrl+Z); si no se puede, se cambia el valor directo
    el.setSelectionRange(0, v.length);
    let ok = false;
    try { ok = document.execCommand('insertText', false, nuevo); } catch (e) {}
    if (!ok || el.value !== nuevo) el.value = nuevo;
    el.setSelectionRange(selA, selZ);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function barra(campo) {
    if (campo.dataset.fmtBarra) return;
    campo.dataset.fmtBarra = '1';
    const b = document.createElement('div');
    b.className = 'fmt-barra';
    b.innerHTML = '<button type="button" data-f="b" title="Negrita (Ctrl+B)">B</button>' +
      '<button type="button" data-f="i" title="Cursiva (Ctrl+I)">I</button>' +
      '<button type="button" data-f="u" title="Subrayado (Ctrl+U)">U</button>' +
      '<span>Selecciona el texto y toca un botón</span>';
    // Que el botón no le quite la selección al cuadro
    b.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    b.addEventListener('click', e => {
      const btn = e.target.closest('[data-f]'); if (!btn) return;
      const caja = campo.closest('.mcard, .ov, form') || document;
      const destino = ultimo && ultimo.isConnected && (ultimo === campo || caja.contains(ultimo)) ? ultimo : campo;
      aplicar(destino, btn.dataset.f);
    });
    campo.parentNode.insertBefore(b, campo);
  }

  function revisar() { document.querySelectorAll(CAMPOS).forEach(barra); }
  new MutationObserver(revisar).observe(document.body, { childList: true, subtree: true });
  revisar();

  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches(EDITABLES)) ultimo = e.target; });
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const k = e.key.toLowerCase();
    if (!MARCAS[k] || !e.target.matches || !e.target.matches(EDITABLES)) return;
    e.preventDefault();
    aplicar(e.target, k);
  });
})();

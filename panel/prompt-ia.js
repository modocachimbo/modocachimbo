/* =========================================================
   Panel · "Copiar prompt para IA"
   Un botón en Subir tema, Subir examen, Vocabulario y Flashcards
   que copia un prompt listo para pegar en Gemini / ChatGPT:
   le explica a la IA el formato exacto que acepta el panel,
   para que devuelva las preguntas listas para pegar y Revisar.
   El formato sale de parsearTexto (subir.js), parsearExamen
   (examen-panel.js), vocabulario-panel.js y tarjetas-panel.js:
   si cambia algo allá, actualízalo aquí.
   ========================================================= */
(function estilosPromptIA() {
  const st = document.createElement('style');
  st.textContent = `
  .btn-ia { border-color: rgba(206,130,255,.55) !important; color: #CE82FF !important; }
  .btn-ia:hover { border-color: #CE82FF !important; background: rgba(206,130,255,.08) !important; }
  .btn-ia svg { width: 15px; height: 15px; }
  .btn-ia.ok { border-color: #58CC02 !important; color: #58CC02 !important; }`;
  document.head.appendChild(st);
})();

const ICONO_IA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z"/></svg>';

function nombresCursosIA() {
  const l = (typeof CURSOS !== 'undefined' ? CURSOS : []).map(c => String(c[1]).replace(/\s*\(oculto\)$/, ''));
  return l.length ? l.join(', ') : 'Álgebra, Aritmética, Biología, Física, Geografía, Lenguaje, Literatura, Química, Razonamiento Verbal…';
}

// Reglas comunes de salida (lo más importante: un solo bloque de código, así no se pierden ** ni $)
const IA_SALIDA = `REGLAS DE SALIDA (muy importantes)
- Devuelve TODO el resultado dentro de UN SOLO bloque de código Markdown (\`\`\`markdown … \`\`\`), sin explicaciones antes ni después. Así me sale el botón de copiar y lo copio tal cual, con sus asteriscos, signos $ y ✅.
- NUNCA agregues citas ni referencias a la fuente: nada de [cite: 1], [cite_start], [1], [fuente], notas al pie ni enlaces. Solo el texto de las preguntas.
- No cambies el contenido: copia enunciados y alternativas palabra por palabra. Solo arregla errores evidentes de escaneo o de copiado (letras raras, palabras cortadas, saltos de línea en medio de una oración).
- No resumas ni te saltes preguntas. Si son muchas y no entran en una respuesta, para en una pregunta completa y dime "continúo", y sigue cuando te escriba "sigue".`;

const IA_PREGUNTAS = `CÓMO VA CADA PREGUNTA
PREGUNTA 1:
Enunciado de la pregunta (puede ocupar varias líneas)
A) Alternativa
B) Alternativa correcta ✅
C) Alternativa
D) Alternativa
E) Alternativa

- Cada pregunta empieza con "PREGUNTA N:" en su propia línea y el enunciado va debajo.
- Una alternativa por línea, con la letra mayúscula y paréntesis: A) B) C) D) E) (máximo hasta F).
- La correcta lleva ✅ al final de su línea. NO inventes la respuesta: si el material trae la clave (marcada, subrayada, en negrita, en una tabla de claves al final o como "Rpta: C"), ponle ✅. Si no la trae, deja la pregunta sin ✅ y yo la marco después.
- En vez de la ✅ también vale una línea "CLAVE: C" al final de la pregunta (úsala si la clave viene en una tabla aparte).
- Deja una línea en blanco entre pregunta y pregunta.
- Listas DENTRO del enunciado (proposiciones, premisas, columnas para relacionar) van con punto, nunca con paréntesis: "I. …", "II. …", "a. …", "b. …". Los paréntesis A) B) son solo para las alternativas.
- Varias alternativas cortas en una sola línea también valen: "A) VVF   B) FVV   C) VVV".

LECTURAS COMPARTIDAS (comprensión de lectura, Razonamiento Verbal)
TEXTO 01:
Primer párrafo de la lectura…

Segundo párrafo…
PREGUNTA 1:
¿Cuál es el tema central del texto?
A) …
PREGUNTA 2:
…
FIN TEXTO

- La lectura va UNA sola vez, después de "TEXTO N:", y vale para todas las preguntas de abajo hasta "FIN TEXTO" (o hasta el siguiente TEXTO). Deja una línea en blanco entre párrafos.
- Dentro de la lectura no pongas [IMAGEN]; si hay una figura, ponla en la pregunta.

ETIQUETA (opcional)
ETIQUETA: Sinónimos
- Si el material está dividido en tipos (Sinónimos, Antónimos, Analogías, Término excluido, Oraciones incompletas…), escribe "ETIQUETA: …" en su propia línea antes de la primera pregunta de ese tipo. Vale hasta la siguiente ETIQUETA. Si no hay tipos, no la pongas.

ANALOGÍAS
PREGUNTA 4:
<u>CORDERO</u> : OVEJA ::
A) potro : yegua
B) ternero : vaca ✅
C) pollo : gallo
- El par va con espacio, dos puntos y espacio ( : ). Las alternativas también.

FORMATO DEL TEXTO
- *cursiva* para nombres científicos, títulos de obras y palabras en otro idioma.
- **negrita** para la palabra clave del enunciado (NO, EXCEPTO, INCORRECTO) o lo que el original tenga en negrita.
- <u>subrayado</u> para la palabra subrayada en el original (sinónimos, analogías, término excluido).
- H<sub>2</sub>O y x<sup>2</sup> para subíndices y superíndices sueltos.
- Fórmulas y símbolos matemáticos en LaTeX entre $…$: $x^2$, $\\frac{a}{b}$, $\\sqrt{16}$, $H_2SO_4$, $\\Delta H$, $10^{-3}$, $\\overline{ab}$. Usa \\frac (no \\dfrac). Nunca uses $$…$$ ni \\( \\).

IMÁGENES, TABLAS Y COLUMNAS
- [IMAGEN] en su propia línea, dentro del enunciado, donde va un gráfico, figura, mapa o dibujo (yo pego la imagen después). Si las alternativas son imágenes, pon [IMAGEN] en el enunciado y deja las alternativas como A) Figura 1, B) Figura 2…
- [IMAGEN DERECHA] en lugar de [IMAGEN] si la figura va al lado de las alternativas (máximo una por pregunta).
- Tablas en formato Markdown:
| Meses | fi | Fi |
|---|---|---|
| Enero | 4 | 4 |
- Dos columnas sin bordes (por ejemplo, para relacionar): "I. CaO || p) cal viva" (las columnas separadas con ||).`;

const IA_SIN_ALTERNATIVAS = `PREGUNTAS SIN ALTERNATIVAS (úsalas SOLO si la pregunta original no tiene alternativas)
- Respuesta escrita: debajo del enunciado "RESPUESTA: Karl Ritter | Ritter" (con | separas otras formas que también valen).
- Respuesta numérica: "RESPUESTA: 2,5" (para un margen: "RESPUESTA: 9,8 ± 0,1").
- Completar espacios: cada espacio va entre [[ ]] con su respuesta: "La capital del Perú es [[Lima]]." (sin línea RESPUESTA).
- Verdadero o falso: cada afirmación en su línea terminada en (V) o (F): "I. La mitosis da 2 células. (V)".
- Relacionar: una pareja por línea con -> en medio: "Vallejo -> Trilce" (hasta 8 parejas).
- Ordenar: escribe "ORDEN:" y debajo los pasos en el orden correcto, uno por línea (hasta 8).`;

const IA_PROMPTS = {
  tema: () => `Eres mi asistente para dar formato a preguntas que voy a subir a mi plataforma de estudio "Modo Cachimbo". Te pasaré preguntas (texto copiado, PDF o fotos). Formatéalas EXACTAMENTE con el formato de abajo, porque la plataforma las lee línea por línea.

${IA_SALIDA}

ENCABEZADO (al inicio, una sola vez)
CURSO: Química
CICLO: 2027-I
TEMA: 03 - Estequiometría

- CURSO: uno de estos nombres: ${nombresCursosIA()}.
- CICLO: como 2027-I, 2027-II o 2027-III.
- TEMA: número y nombre del tema.
- Si no sabes alguno de los tres, no escribas esa línea (yo lo elijo en la plataforma).

${IA_PREGUNTAS}

${IA_SIN_ALTERNATIVAS}

Responde solo "Listo, pásame las preguntas." y espera mis preguntas.`,

  examen: () => `Eres mi asistente para dar formato a exámenes de admisión que voy a subir a mi plataforma de estudio "Modo Cachimbo". Te pasaré un examen completo (texto copiado, PDF o fotos). Formatéalo EXACTAMENTE con el formato de abajo, porque la plataforma lo lee línea por línea.

${IA_SALIDA}

ENCABEZADO DEL EXAMEN (al inicio, una sola vez)
EXAMEN: Ordinario
CICLO: 2027-I

- EXAMEN: Ordinario, CPU, Examen de control I o Examen de control II.
- CICLO: como 2027-I, 2027-II o 2027-III.
- Si no sabes alguno, no escribas esa línea (yo lo elijo en la plataforma).

CURSOS DENTRO DEL EXAMEN
CURSO: Lenguaje
TEMA: Lenguaje audiovisual

PREGUNTA 1:
…

CURSO: Literatura

PREGUNTA 6:
…

- Antes de las preguntas de cada curso escribe "CURSO: …" en su propia línea. Vale para todas las preguntas de abajo hasta el siguiente CURSO. Toda pregunta necesita un CURSO arriba.
- Usa uno de estos nombres de curso: ${nombresCursosIA()}. Si el examen dice "Razonamiento Matemático" o un curso que no está en la lista, escríbelo tal como viene.
- TEMA: es opcional: el tema de las preguntas de abajo, sin número. Si no lo sabes, no lo pongas.
- Numera las preguntas con el NÚMERO REAL del examen (PREGUNTA 41:, PREGUNTA 42:…), no empieces de 1 en cada curso.
- En un examen TODAS las preguntas llevan alternativas.

${IA_PREGUNTAS}

Responde solo "Listo, pásame el examen." y espera el examen.`,

  vocabulario: () => `Eres mi asistente para dar formato a palabras de vocabulario (sinónimos y antónimos) que voy a subir a mi plataforma de estudio "Modo Cachimbo". Te pasaré una lista (texto copiado, PDF, fotos o tabla). Formatéala EXACTAMENTE así:

${IA_SALIDA}

FORMATO
EFÍMERO
  Sin: pasajero, fugaz, breve
  Ant: duradero, perenne
  Def: Que dura poco tiempo.
  Ej: Fue una alegría efímera.
  Tipo: adj.

LOCUAZ
  Sin: hablador, parlanchín

DIURNO
  Ant: nocturno

- La PALABRA va sola en su línea, en MAYÚSCULAS. Debajo, con dos espacios al inicio, sus datos. Una línea en blanco entre palabra y palabra.
- Sin: sinónimos separados por comas. Ant: antónimos separados por comas. Si no tiene antónimos, no escribas la línea Ant; si no tiene sinónimos, no escribas Sin. Necesita al menos una de las dos.
- Opcionales (solo si vienen en el material): Def: definición · Ej: oración de ejemplo que use la palabra (hasta 5 líneas Ej) · Tipo: adj., sust., verbo o adv. · Nivel: 1, 2 o 3 · Examen: dónde salió · Par: palabra con la que se confunde · Raíz: de dónde viene · Tip: truco para recordarla.
- No inventes sinónimos ni antónimos que no estén en el material.

Responde solo "Listo, pásame las palabras." y espera la lista.`,

  tarjetas: () => `Eres mi asistente para dar formato a flashcards que voy a subir a mi plataforma de estudio "Modo Cachimbo". Te pasaré apuntes, preguntas o una lista (texto, PDF o fotos). Formatéalas EXACTAMENTE así:

${IA_SALIDA}

FORMATO
Mitocondria || Organelo que produce la energía (ATP) de la célula
¿Qué organelo sintetiza proteínas? || El ribosoma

- Una tarjeta por línea: el frente, luego || y luego el reverso. Sin numerar y sin líneas en blanco.
- Frente y reverso cortos (el reverso, una o dos oraciones como máximo). No uses saltos de línea dentro de una tarjeta.
- Puedes usar *cursiva*, **negrita** y fórmulas en LaTeX entre $…$ (por ejemplo $H_2O$).
- Si te paso preguntas con alternativas, el frente es la pregunta y el reverso la respuesta correcta.

Responde solo "Listo, pásame el material." y espera el material.`
};

function copiarPromptIA(tipo, boton) {
  const texto = IA_PROMPTS[tipo]();
  const ok = () => {
    toast('Prompt copiado. Pégalo en Gemini y luego pásale tus preguntas.');
    if (boton) {
      const antes = boton.innerHTML;
      boton.classList.add('ok'); boton.innerHTML = '✓ Prompt copiado';
      setTimeout(() => { boton.classList.remove('ok'); boton.innerHTML = antes; }, 2200);
    }
  };
  const viejo = () => {
    const ta = document.createElement('textarea'); ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy') ? ok() : toast('No se pudo copiar', true); } catch (e) { toast('No se pudo copiar', true); }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok).catch(viejo);
  else viejo();
}

// Crea el botón. tipo: 'tema' | 'examen' | 'vocabulario' | 'tarjetas' | () => tipo (si cambia, como en Subir)
function botonPromptIA(tipo) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn-ghost btn-ia';
  b.title = 'Copia instrucciones con el formato exacto para pegarlas en Gemini o ChatGPT';
  const tipoActual = () => typeof tipo === 'function' ? tipo() : tipo;
  b.innerHTML = ICONO_IA + ' Copiar prompt para IA';
  b.addEventListener('click', () => copiarPromptIA(tipoActual(), b));
  return b;
}

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
  .btn-ia.ok { border-color: #58CC02 !important; color: #58CC02 !important; }
  .ia-img { position: relative; display: inline-block; }
  .ia-img-menu { position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; min-width: 270px;
    background: #1b1530; border: 1px solid rgba(206,130,255,.45); border-radius: 12px; padding: 6px;
    box-shadow: 0 10px 30px rgba(0,0,0,.45); display: flex; flex-direction: column; gap: 4px; }
  .ia-img-menu.der { left: auto; right: 0; }
  .ia-img-menu[hidden] { display: none; }
  .ia-img-menu button { text-align: left; background: none; border: 0; border-radius: 8px; padding: 9px 10px;
    color: #eee; cursor: pointer; font: inherit; line-height: 1.3; }
  .ia-img-menu button:hover { background: rgba(206,130,255,.12); }
  .ia-img-menu b { display: block; color: #CE82FF; font-size: .92em; }
  .ia-img-menu small { display: block; opacity: .7; font-size: .8em; margin-top: 2px; }`;
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
- Dos columnas sin bordes (por ejemplo, para relacionar): "I. CaO || p) cal viva" (las columnas separadas con ||).

GRÁFICOS DE ESTADÍSTICA (NO uses [IMAGEN] para estos: escríbelos con este formato, dentro del enunciado)
- Histograma:
[GRÁFICO: histograma]
eje x: I_i
eje y: f_i
x: 20, 40, 60, 80, 100
alturas: 40, k=20, 3k=60, k=20
sombrear: 2, 3
[/GRÁFICO]
  En x van los límites de clase (uno más que las alturas) o las letras del eje (a, b, c…). Las alturas en el orden de las barras. Si una altura es una letra o expresión y hay números en el mismo gráfico, escribe etiqueta=altura aproximada según el dibujo (3k=60). Si todas son letras (a, 5a, 7a) se escriben tal cual. "sombrear" dice qué barras están sombreadas (1 = la primera). Si encima hay un polígono, agrega "polígono: sí".
- Polígono de frecuencias solo: igual, con [GRÁFICO: polígono].
- Ojiva o línea: [GRÁFICO: línea] con "x: …" y "y: …". Varias líneas: una línea por serie "Lima: 20, 35, 30".
- Barras: [GRÁFICO: barras] y una línea por barra "Septiembre: 70". Horizontales: [GRÁFICO: barras horizontales]. Dos o más barras por categoría: [GRÁFICO: barras agrupadas] con "series: Hombres, Mujeres" y "Lunes: 12, 15". Una sobre otra: [GRÁFICO: barras apiladas].
- Circular: [GRÁFICO: circular] (o [GRÁFICO: circular 3d] si el original es en 3D) y una línea por sector "A: 168°", "Vóley: 25%" o "Lima: 12". Para un sector sin dato escribe "G: resto". Si el sector muestra una expresión: "Fútbol: 2x=30%" (el valor aproximado según el dibujo). Sector separado del resto: "destacar: Publicidad". Dona: [GRÁFICO: dona].
- Diagrama de caja: [GRÁFICO: caja] con "mín:", "Q1:", "mediana:", "Q3:", "máx:".
- Dispersión: [GRÁFICO: dispersión] con "puntos: (1; 6), (2; 8)".
- Pictograma: [GRÁFICO: pictograma] con "cada: 10" y una línea por fila "Lunes: 40".
- Tallo y hojas: [GRÁFICO: tallo y hojas] y una línea por tallo "1 | 2 4 7".
- Opcionales: "eje x: …" y "eje y: …" con el nombre de cada eje (f_i pone la i abajo). Listas separadas por coma y espacio; decimales con coma pegada (0,25).
- [GRÁFICO DERECHA: …] en lugar de [GRÁFICO: …] si el gráfico va al lado de las alternativas.
- Mapas, figuras geométricas, dibujos y fotos siguen con [IMAGEN].`;

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

// Prompts para reilustrar la imagen de una pregunta (Gemini / ChatGPT con imágenes)
const IA_IMG_BASE = `Reilustra esta imagen de una pregunta de examen de admisión para usarla en mi plataforma de estudio.

QUÉ NO PUEDE CAMBIAR (muy importante)
- No cambies el contenido: mismos números, letras, palabras, símbolos, fórmulas, medidas, ángulos, flechas y etiquetas, en el mismo lugar.
- No agregues ni quites nada: ni datos, ni líneas, ni elementos, ni la respuesta. No resuelvas el ejercicio.
- Respeta las proporciones y la posición de cada elemento (si un lado es más largo o un punto está más arriba, que siga igual).
- Si alguna letra o número no se lee bien, déjalo lo más parecido al original; no lo inventes.

QUÉ SÍ DEBES HACER
- Fondo blanco liso y limpio: quita sombras, manchas, dobleces, textura de papel, marcas de lapicero y lo que se vea del otro lado de la hoja.
- Si la imagen está chueca, inclinada o en perspectiva (foto tomada de lado), enderézala para que quede recta y de frente.
- Recorta los bordes sobrantes: que quede solo el gráfico, con un margen blanco pequeño alrededor.
- Líneas nítidas y parejas, texto claro y legible, en buena resolución.`;

const IA_IMG = {
  fiel: () => `${IA_IMG_BASE}

ESTILO: FIEL AL ORIGINAL
- Mantén los mismos colores del original. Si es en blanco y negro, déjala en blanco y negro (líneas negras sobre fondo blanco).
- Solo limpia y endereza: que se vea como el mismo gráfico, pero escaneado perfecto.

Devuélveme solo la imagen final, sin texto adicional.`,

  color: () => `${IA_IMG_BASE}

ESTILO: MEJORADO CON COLOR
- Dale color para que se entienda mejor, según lo que muestre la imagen:
  · Geometría: contorno en negro o azul oscuro; regiones o áreas sombreadas con colores suaves (pastel); ángulos marcados con un arco de color.
  · Gráficos de barras, de líneas o circulares: un color distinto y suave para cada serie o sector.
  · Mapas: regiones en colores suaves distintos, sin tapar los nombres.
  · Esquemas de Biología, Química o Física: colores naturales y suaves (por ejemplo, vectores o flechas en un color fuerte que resalte).
- Colores planos y suaves, estilo libro escolar moderno. Nada de degradados fuertes, sombras, 3D ni brillos.
- El texto y los números siempre en negro o gris muy oscuro, bien legibles sobre el fondo blanco.
- El color solo ayuda a leer: no debe cambiar ni insinuar la respuesta, ni resaltar una alternativa más que otra.

Devuélveme solo la imagen final, sin texto adicional.`
};

function copiarPromptIA(tipo, boton, textoListo, aviso) {
  const texto = textoListo || IA_PROMPTS[tipo]();
  const ok = () => {
    toast(aviso || 'Prompt copiado. Pégalo en Gemini y luego pásale tus preguntas.');
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

// Botón "Prompt para imagen" con dos opciones: fiel al original o mejorado con color
function botonPromptImagen() {
  const caja = document.createElement('span'); caja.className = 'ia-img';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn-ghost btn-ia';
  b.title = 'Copia un prompt para que Gemini o ChatGPT reilustre la imagen de una pregunta (fondo blanco, derecha y nítida)';
  b.innerHTML = ICONO_IA + ' Prompt para imagen ▾';
  const menu = document.createElement('div'); menu.className = 'ia-img-menu'; menu.hidden = true;
  menu.innerHTML = `<button type="button" data-v="fiel"><b>Fiel al original</b><small>Igual que la imagen, solo limpia: fondo blanco y enderezada</small></button>
    <button type="button" data-v="color"><b>Mejorada con color</b><small>Mismo contenido, con colores suaves en gráficos y líneas</small></button>`;
  b.addEventListener('click', e => {
    e.stopPropagation(); menu.hidden = !menu.hidden;
    if (menu.hidden) return;
    // Si no entra a la derecha, se abre hacia la izquierda (alineado al borde derecho del botón)
    menu.classList.remove('der');
    if (menu.getBoundingClientRect().right > document.documentElement.clientWidth - 8) menu.classList.add('der');
  });
  menu.addEventListener('click', e => {
    const op = e.target.closest('[data-v]'); if (!op) return;
    menu.hidden = true;
    copiarPromptIA(null, b, IA_IMG[op.dataset.v](), 'Prompt copiado. Pégalo en Gemini junto con la imagen.');
  });
  document.addEventListener('click', e => { if (!caja.contains(e.target)) menu.hidden = true; });
  caja.append(b, menu);
  return caja;
}

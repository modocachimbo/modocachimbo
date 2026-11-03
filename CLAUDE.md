# Modo Cachimbo — guía para Claude Code

App educativa (PWA) para preparar la admisión UNJFSC (Perú): libros, seminarios, banqueo,
repaso, fijas, simulacros, duelos y exámenes pasados. Con gamificación (XP, rachas,
corazones, rangos, tops) y un búho como mascota. Marca: «Modo Cachimbo · @ProfeRojitas».
Idioma de todo: español (código, comentarios, commits, textos de interfaz).

## Stack y despliegue
- Sitio **100 % estático**: HTML + CSS + JavaScript plano. Sin npm, sin build, sin framework.
- Se publica como **GitHub Pages** desde la rama `main` (lo dice `sw.js`). Cada push a `main` sale en vivo.
  → Prueba siempre antes de subir. Para ver en local: `python -m http.server 8000` en la raíz.
- Backend: **Supabase** (login con Google o enlace al correo, perfiles, progreso, rankings, duelos).
- **Google Apps Script** (`REPORTES_URL` en `assets/mc-config.js`): recibe reportes y las acciones
  del panel. **Su código NO está en este repo** (no hay .gs). Si hay que cambiarlo, se edita en Google.
- Libros PDF: Google Drive (`biblioteca.html`).

## Estructura
- Raíz: `index.html` (inicio + bienvenida sin sesión), `simulacro.html`, `duelo.html`, `perfil.html`,
  `biblioteca.html`, `coleccion.html`, `tarjetas.html`, `vocabulario.html`, `falladas.html`,
  `repaso-mixto.html`, `offline.html`, `sw.js`, `manifest.webmanifest`.
- Una carpeta por curso (`fisica/`, `algebra/`, `quimica/`, …) con: `index.html`, `fijas.html`,
  `repaso.html` y tres secciones `libros/`, `seminarios/`, `banqueo/`; cada sección tiene
  `index/quiz/tema/temario.html` y `data/<ciclo>.json` (ej. `data/2027-I.json`, más `manifest.json`).
- `examenes/` (ordinario, cpu, control-cpu) con sus `data/`.
- `assets/`: un archivo JS por función (`auth.js`, `progreso.js`, `racha.js`, `rango.js`, `ranking.js`,
  `corazones.js`, `buho.js`, `pregunta.js`, …), `cursos.json` (catálogo de cursos y áreas),
  `mc-config.js` (config pública), `img/<curso>/<ciclo>/` (imágenes de preguntas en .webp),
  `buho/`, `rangos/`, `icons/`.
- `panel/`: panel de administración (contenido, alumnos, códigos, ayudantes, ciclos, reportes…).
- `supabase/`: scripts SQL numerados `01…48` (falta el 26 en la numeración).

## Datos de preguntas
`<curso>/<sección>/data/<ciclo>.json` es una lista de temas:
`[{ "num": "01", "name": "Vectores", "questions": [{ "text", "topic", "options": [...], "correct": <índice>, "graphic": "" }] }]`
(verificado en física/libros; otras secciones pueden traer campos extra, p. ej. preguntas de
respuesta abierta en seminarios/banqueo). Las ecuaciones van entre `$…$` (KaTeX).
**Cuidado:** son archivos grandes (miles de líneas). Edita con cambios puntuales, nunca los reescribas enteros.
El formato de carga masiva y sus reglas están documentados en el comentario de `panel/subir.js`.

## Reglas de trabajo
1. **Haz `git pull` antes de empezar y antes de cada push.** El panel hace commits automáticos a `main`
   («Panel: corrige…», «Panel: publica…»), así que el remoto cambia sin avisar.
2. **No edites a mano** los JSON de preguntas ni `assets/img/` si el cambio se puede hacer desde el panel;
   así no chocan con sus commits.
3. **Cambios en `sw.js`:** sube `VERSION` (hoy `mc-v3`) para que los celulares limpien la caché vieja.
   El service worker es «primero internet, si no hay, lo guardado».
4. **Rutas relativas:** las páginas de cursos están a distintas profundidades (`../../assets/…`).
   Respétalo al copiar o crear páginas.
5. **Cada página privada** carga `assets/guardia.js` como PRIMER script del `<head>` (redirige a la
   bienvenida si no hay sesión) y luego `assets/app.js`.
6. **Estilo:** modo oscuro por defecto, claro en `assets/claro.css`. Paleta: lima `#C6E000`,
   fondo `#0B0818`. Fuentes: Nunito, Barlow Condensed, Sora, Inter. Mantén el estilo «juego».
7. **Accesibilidad móvil primero:** la mayoría de alumnos entra desde celular (hay tabbar inferior).
8. Mensajes de commit en español, cortos: «Inicio: arregla barra del rango».

## Supabase
- Los `.sql` son **idempotentes** (`create … if not exists`, `drop policy if exists`) y se pegan
  a mano en Supabase → SQL Editor → Run. Claude Code no los ejecuta: déjalos listos y avisa
  qué número toca (el siguiente es `49-…`) y que hay que correrlos.
- Activa **RLS** en toda tabla nueva y escribe políticas explícitas (cada alumno solo ve lo suyo).
  Las funciones con privilegios usan `security definer`: revísalas con cuidado.
- En el navegador solo va la clave **publishable**. La `service_role` / `secret` **nunca** va en el repo.

## Seguridad (revisar siempre)
- No subas contraseñas del panel, tokens de GitHub ni claves secretas. `mc-config.js` es público.
- La clave de Google Drive (`DRIVE_KEY`) está en el repo: debe estar **restringida** en Google Cloud
  a la API de Drive y al dominio de la web. Verifícalo en Google Cloud (no se puede ver desde el código).
- El panel manda una contraseña al Apps Script: no la registres en consola ni en commits.

## Cómo agregar un curso o ciclo nuevo (resumen a confirmar)
1. Agregar la entrada en `assets/cursos.json` (id, nombre, área, orden, icono, prefijo, repaso/fijas).
2. Duplicar la carpeta de un curso parecido y ajustar `data-area`, títulos y rutas.
3. Cargar preguntas desde el panel (formato de `panel/subir.js`) o generar el JSON equivalente.
4. Subir `VERSION` de `sw.js` si cambian páginas cacheadas.

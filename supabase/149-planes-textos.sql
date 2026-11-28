-- 149 · Textos de los planes (precios.html) al día:
--   Flashcards ya no salen en Bronce (gratis) y el Búho tutor es solo de Leyenda.
--   Laboratorio gratis en Bronce y Descargas PDF como paquete aparte en los 3.
-- Cambia solo las listas Sí/No de las 3 tarjetas y vuelve la tabla «Qué incluye cada plan»
-- al ejemplo nuevo (después se edita en Panel → Planes y precios). Precios y lo demás no se tocan.
update public.ajustes a set valor = (a.valor - 'detalle') || jsonb_build_object('planes', (
  select coalesce(jsonb_agg(
    case p->>'id'
      when 'gratis' then p || jsonb_build_object(
        'si', jsonb_build_array('Leer los Libros y practicar ciclos pasados', 'Exámenes pasados y Temas fijos', 'Ranking, racha, amigos y clanes', 'Laboratorio completo y test vocacional'),
        'no', jsonb_build_array('Material del ciclo actual', 'Flashcards y Búho tutor', 'Simulacro y duelos', 'Descargas PDF (paquete aparte)'))
      when 'area' then p || jsonb_build_object(
        'si', jsonb_build_array('Todo lo gratis', 'Material nuevo de los cursos del área', 'Repaso, Fijas y Flashcards del área'),
        'no', jsonb_build_array('Búho tutor', 'Simulacro y duelos', 'Descargas PDF (paquete aparte)'))
      when 'total' then p || jsonb_build_object(
        'si', jsonb_build_array('Las 4 áreas con todo el material nuevo', 'Repaso, Fijas, Flashcards y Banqueo', 'Búho tutor: resolución paso a paso (beta)', 'Simulacro de 80 preguntas con puntaje por bloque', 'Duelos con amigos', 'Seminarios, Vocabulario y Biblioteca', 'Descargas sin internet'),
        'no', jsonb_build_array('Descargas PDF (paquete aparte)'))
      else p end order by o), '[]'::jsonb)
  from jsonb_array_elements(a.valor->'planes') with ordinality as t(p, o)))
where a.clave = 'planes' and jsonb_typeof(a.valor->'planes') = 'array';

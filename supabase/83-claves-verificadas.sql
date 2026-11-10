-- =========================================================
-- Modo Cachimbo · Claves verificadas en los exámenes
-- (Panel → Verificar claves · sello "Clave verificada" en Ordinario, CPU y Control)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 14-equipo.sql y 53-descargas-pdf.sql.
--
--   · claves_verificadas: una fila por pregunta de examen cuya clave
--     confirmó un profesor. Se guarda la LETRA que se verificó: si después
--     alguien cambia la clave en "Editar preguntas", la web ve que ya no
--     coincide y deja de mostrar el sello (hasta que se vuelva a verificar).
--     n = lugar de la pregunta en el examen (1, 2, 3…), igual que los reportes.
--   · El alumno solo recibe { n, letra }: quién la confirmó y la nota
--     son solo para el equipo.
--   · Permiso nuevo para ayudantes: "verificar" (Panel → Equipo).
-- =========================================================

-- ---------- Permiso nuevo ----------
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda','tematicas',
               'recursos','biblioteca','regalos','resenas','descargas','verificar'];
$$;

-- ---------- Tabla ----------
create table if not exists public.claves_verificadas (
  tipo       text not null check (tipo in ('ordinario', 'cpu', 'control-cpu')),
  examen     text not null check (examen ~ '^\d{4}-(I|II|III)(-[12])?$'),
  n          integer not null check (n between 1 and 300),
  num        text not null default '' check (char_length(num) <= 10),
  letra      text not null check (letra ~ '^[A-F]$'),
  quien      text not null default '' check (char_length(quien) <= 120),   -- qué profesor la confirmó (solo equipo)
  nota       text not null default '' check (char_length(nota) <= 500),    -- solo equipo
  por_email  text not null default '',
  por_nombre text not null default '',
  fecha      timestamptz not null default now(),
  primary key (tipo, examen, n)
);
alter table public.claves_verificadas enable row level security;   -- sin políticas: solo las funciones
revoke all on public.claves_verificadas from anon, authenticated;

-- ---------- Para la web: qué preguntas de este examen tienen la clave verificada ----------
create or replace function public.claves_verificadas(p_tipo text, p_examen text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('n', c.n, 'letra', c.letra) order by c.n), '[]'::jsonb)
  from public.claves_verificadas c where c.tipo = p_tipo and c.examen = p_examen;
$$;
revoke all on function public.claves_verificadas(text, text) from public;
grant execute on function public.claves_verificadas(text, text) to anon, authenticated;

-- ---------- Panel ----------
-- Todo lo de un examen (con quién la confirmó, la nota y quién la marcó)
-- y, para los botones de arriba, cuántas hay verificadas en cada examen.
create or replace function public.claves_verificadas_admin(p_tipo text default null, p_examen text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('verificar') then raise exception 'No autorizado'; end if;
  return jsonb_build_object(
    'lista', coalesce((select jsonb_agg(jsonb_build_object('n', c.n, 'num', c.num, 'letra', c.letra, 'quien', c.quien, 'nota', c.nota,
                                                          'por', coalesce(nullif(c.por_nombre, ''), split_part(c.por_email, '@', 1)), 'fecha', c.fecha) order by c.n)
                       from public.claves_verificadas c where c.tipo = p_tipo and c.examen = p_examen), '[]'::jsonb),
    'cuentas', coalesce((select jsonb_object_agg(k, v) from (
                           select c.tipo || '|' || c.examen as k, count(*) as v from public.claves_verificadas c group by 1) x), '{}'::jsonb));
end $$;
revoke all on function public.claves_verificadas_admin(text, text) from public, anon;
grant execute on function public.claves_verificadas_admin(text, text) to authenticated;

-- Marcar (o volver a marcar) una clave como verificada
create or replace function public.verificar_clave(p_tipo text, p_examen text, p_n integer, p_num text, p_letra text,
                                                  p_quien text default '', p_nota text default '')
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare m text := lower(auth.jwt() ->> 'email');
begin
  if not public.puede('verificar') then raise exception 'No autorizado'; end if;
  insert into public.claves_verificadas (tipo, examen, n, num, letra, quien, nota, por_email, por_nombre, fecha)
  values (p_tipo, p_examen, p_n, left(coalesce(p_num, ''), 10), upper(p_letra), left(coalesce(p_quien, ''), 120), left(coalesce(p_nota, ''), 500),
          coalesce(m, ''), coalesce((select e.nombre from public.equipo e where e.email = m), ''), now())
  on conflict (tipo, examen, n) do update set
    num = excluded.num, letra = excluded.letra, quien = excluded.quien, nota = excluded.nota,
    por_email = excluded.por_email, por_nombre = excluded.por_nombre, fecha = now();
  perform public.anotar('Verificar claves', 'Verificó la clave ' || upper(p_letra) || ' de la pregunta ' || coalesce(nullif(p_num, ''), p_n::text) || ' (' || p_tipo || ' ' || p_examen || ')',
                        jsonb_build_object('tipo', p_tipo, 'examen', p_examen, 'n', p_n, 'letra', upper(p_letra), 'quien', p_quien));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.verificar_clave(text, text, integer, text, text, text, text) from public, anon;
grant execute on function public.verificar_clave(text, text, integer, text, text, text, text) to authenticated;

-- Quitar el sello
create or replace function public.quitar_verificacion(p_tipo text, p_examen text, p_n integer)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare r public.claves_verificadas;
begin
  if not public.puede('verificar') then raise exception 'No autorizado'; end if;
  delete from public.claves_verificadas c where c.tipo = p_tipo and c.examen = p_examen and c.n = p_n returning * into r;
  if r.n is not null then
    perform public.anotar('Verificar claves', 'Quitó el sello de la pregunta ' || coalesce(nullif(r.num, ''), r.n::text) || ' (' || p_tipo || ' ' || p_examen || ')',
                          jsonb_build_object('tipo', p_tipo, 'examen', p_examen, 'n', p_n, 'letra', r.letra));
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.quitar_verificacion(text, text, integer) from public, anon;
grant execute on function public.quitar_verificacion(text, text, integer) to authenticated;

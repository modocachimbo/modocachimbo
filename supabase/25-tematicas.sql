-- =========================================================
-- Modo Cachimbo · Temáticas por fechas (Halloween, Navidad…)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
--
-- El panel elige la temática, desde qué día y hasta qué día.
-- Fuera de esas fechas la web vuelve sola al diseño de siempre.
-- =========================================================

create table if not exists public.tematica (
  id         int primary key default 1 check (id = 1),   -- una sola fila
  tema       text not null default 'ninguna',
  inicio     date,
  fin        date,
  mensaje    text,
  sonidos    boolean not null default true,
  cambiado   timestamptz not null default now(),
  cambiado_por text
);
insert into public.tematica (id) values (1) on conflict (id) do nothing;

alter table public.tematica enable row level security;
-- Nadie lee ni escribe directo: solo con las funciones de abajo
revoke all on public.tematica from anon, authenticated;

-- La temática que se ve HOY (hora de Lima). Sin temática activa devuelve null.
-- La llaman todas las páginas, con o sin sesión.
create or replace function public.tema_activo()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('tema', t.tema, 'inicio', t.inicio, 'fin', t.fin, 'mensaje', t.mensaje, 'sonidos', t.sonidos)
    from public.tematica t
   where t.id = 1 and t.tema <> 'ninguna'
     and (t.inicio is null or t.inicio <= (now() at time zone 'America/Lima')::date)
     and (t.fin is null or t.fin >= (now() at time zone 'America/Lima')::date);
$$;
revoke all on function public.tema_activo() from public;
grant execute on function public.tema_activo() to anon, authenticated;

-- Permiso "Temáticas" para ayudantes
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda','tematicas'];
$$;

-- Panel: ver la configuración completa (aunque esté programada o ya terminó)
create or replace function public.tema_config()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('tematicas') then raise exception 'no autorizado'; end if;
  return (select to_jsonb(t) from public.tematica t where t.id = 1);
end $$;
revoke all on function public.tema_config() from public, anon;
grant execute on function public.tema_config() to authenticated;

-- Panel: guardar. p = { tema, inicio, fin, mensaje, sonidos }. tema 'ninguna' = diseño de siempre.
create or replace function public.guardar_tema(p jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_tema text := coalesce(nullif(trim(p ->> 'tema'), ''), 'ninguna');
begin
  if not public.puede('tematicas') then raise exception 'no autorizado'; end if;
  if v_tema not in ('ninguna', 'halloween') then raise exception 'temática desconocida'; end if;
  if nullif(p ->> 'inicio', '') is not null and nullif(p ->> 'fin', '') is not null
     and (p ->> 'fin')::date < (p ->> 'inicio')::date then
    raise exception 'la fecha final es antes que la inicial';
  end if;
  update public.tematica set
    tema = v_tema,
    inicio = nullif(p ->> 'inicio', '')::date,
    fin = nullif(p ->> 'fin', '')::date,
    mensaje = nullif(left(trim(coalesce(p ->> 'mensaje', '')), 140), ''),
    sonidos = coalesce((p ->> 'sonidos')::boolean, true),
    cambiado = now(),
    cambiado_por = lower(auth.jwt() ->> 'email')
  where id = 1;
end $$;
revoke all on function public.guardar_tema(jsonb) from public, anon;
grant execute on function public.guardar_tema(jsonb) to authenticated;

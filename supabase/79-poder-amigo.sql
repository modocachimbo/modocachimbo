-- =========================================================
-- Modo Cachimbo · Estadísticas de un amigo (la estrella de 5 puntas)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 71 (amigos).
--
--   · poder_amigo(codigo): los números de la estrella «Tu poder»
--     tuyos y del amigo, para compararlos (amigos.html?id=…).
--   · Solo entrega números (días, promedios, cursos), nunca las
--     preguntas ni las prácticas. Solo si ya son amigos.
-- =========================================================

-- Los números de un alumno (uso interno). Son los mismos que usa
-- «Tu poder» en perfil.html: la web los pasa a puntos de 0 a 100.
create or replace function public.poder_datos(u uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy date := (now() at time zone 'America/Lima')::date;
  r jsonb := public.calc_racha(u);
  fuerte record; sim record;
begin
  select p.carpeta, round(avg(p.mejor)) as prom, count(*) as n into fuerte
    from public.progreso p
   where p.usuario = u and p.tipo not in ('simulacro', 'examen') and p.carpeta is not null
   group by p.carpeta order by avg(p.mejor) desc, count(*) desc limit 1;
  select i.puntaje, i.maximo into sim
    from public.simulacro_intentos i where i.usuario = u
   order by i.puntaje desc limit 1;
  return jsonb_build_object(
    'dia', extract(day from hoy)::integer,
    'dias_mes', (select count(*) from public.actividad a where a.usuario = u and a.preguntas > 0 and a.fecha >= date_trunc('month', hoy)::date and a.fecha <= hoy),
    'semana', coalesce((select sum(a.preguntas) from public.actividad a where a.usuario = u and a.fecha >= public.cz_lunes() and a.fecha <= hoy), 0),
    'meta', public.meta_hoy(u),
    'precision', coalesce((select round(avg(p.mejor)) from public.progreso p where p.usuario = u and p.tipo not in ('simulacro', 'examen')), 0),
    'simulacro', coalesce((select max(p.mejor) from public.progreso p where p.usuario = u and p.tipo in ('simulacro', 'examen')), 0),
    'cursos', (select count(distinct p.carpeta) from public.progreso p where p.usuario = u and p.tipo not in ('simulacro', 'examen') and p.carpeta is not null),
    'practicas', (select count(*) from public.progreso p where p.usuario = u and p.tipo not in ('simulacro', 'examen')),
    'mejor_racha', greatest(coalesce((r ->> 'mejor')::integer, 0), coalesce((r ->> 'actual')::integer, 0)),
    'curso_fuerte', fuerte.carpeta, 'curso_fuerte_prom', fuerte.prom,
    'mejor_sim', sim.puntaje, 'mejor_sim_max', sim.maximo);
end $$;
revoke all on function public.poder_datos(uuid) from public, anon, authenticated;

-- Tú y tu amigo, en una sola consulta
create or replace function public.poder_amigo(p_codigo integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); u uuid;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  u := public.usuario_de_codigo(p_codigo);
  if u is null or not (u = uid or public.son_amigos(uid, u)) then return null; end if;
  return jsonb_build_object('yo', public.poder_datos(uid), 'el', public.poder_datos(u));
end $$;
revoke all on function public.poder_amigo(integer) from public, anon;
grant execute on function public.poder_amigo(integer) to authenticated;

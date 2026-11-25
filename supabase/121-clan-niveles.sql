-- =========================================================
-- Modo Cachimbo · 121: nivel del clan por puntos acumulados (1 a 5).
-- Puntos del clan = todo el XP que sumaron sus miembros, semana a semana, desde que existe.
-- Nivel 1: 0 · Nivel 2: 50 000 · Nivel 3: 200 000 · Nivel 4: 500 000 · Nivel 5 (máximo): 1 000 000.
-- Ningún clan baja de nivel: se usa el mayor entre el nivel nuevo y el que ya tenía (tope 5).
-- Correr después de 120.
-- =========================================================

create or replace function public.clan_niveles() returns integer[] language sql immutable as $$ select array[0, 50000, 200000, 500000, 1000000] $$;

create or replace function public.clan_logros(c bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with cerradas as (
    select s.clan, s.semana, s.xp, s.meta, rank() over (partition by s.semana order by s.xp desc) as puesto
    from public.clan_semanas s where s.semana < public.cz_lunes() and s.xp > 0
  ), pts as (
    select coalesce((select sum(s.xp) from public.clan_semanas s where s.clan = c and s.semana < public.cz_lunes()), 0)::bigint
           + public.clan_xp_semana(c) as p
  ), viejo as (
    select least(5, 1 + (select count(*) from cerradas k where k.clan = c and k.xp >= k.meta))::integer as n
  ), nuevo as (
    select (select count(*) from unnest(public.clan_niveles()) u where u <= pts.p)::integer as n from pts
  )
  select jsonb_build_object(
    'nivel', greatest(viejo.n, nuevo.n),
    'puntos', pts.p,
    'niveles', to_jsonb(public.clan_niveles()),
    'copas', (select count(*) from cerradas k where k.clan = c and k.puesto <= 3),
    'victorias', public.clan_victorias(c),
    'id_publico', public.clan_id_publico(c)
  ) || coalesce((select jsonb_build_object('aprobacion', k.aprobacion, 'min_nivel', k.min_nivel, 'min_rango', k.min_rango,
       'eslogan', k.eslogan, 'etiquetas', to_jsonb(k.etiquetas)) from public.clanes k where k.id = c), '{}'::jsonb)
  from pts, viejo, nuevo;
$$;
revoke all on function public.clan_logros(bigint) from public, anon, authenticated;

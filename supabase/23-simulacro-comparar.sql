-- =========================================================
-- Modo Cachimbo · Simulacro: tu meta y cómo vas frente a tu carrera
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 01-perfiles.sql y 09-simulacros.sql.
--
--   · perfiles.meta_simulacro: el puntaje que el alumno quiere sacar.
--     Se edita en Mi perfil o desde el resultado del simulacro.
--   · comparar_simulacro(bloque): el último simulacro (90 días) de cada
--     alumno del bloque. Si tu carrera tiene 5 alumnos o más, compara
--     solo con ellos. Devuelve promedios, nunca datos de otro alumno.
-- =========================================================

alter table public.perfiles add column if not exists meta_simulacro integer;
alter table public.perfiles drop constraint if exists perfiles_meta_simulacro_check;
alter table public.perfiles add constraint perfiles_meta_simulacro_check
  check (meta_simulacro is null or meta_simulacro between 1 and 5000);

-- % de aciertos de un área ({c,i,b,p}) y % del tiempo que sobró
create or replace function public.sim_pct(a jsonb)
returns numeric language sql immutable set search_path = '' as $$
  select case when coalesce((a ->> 'c')::numeric, 0) + coalesce((a ->> 'i')::numeric, 0) + coalesce((a ->> 'b')::numeric, 0) = 0 then 0
    else round(100 * coalesce((a ->> 'c')::numeric, 0)
      / (coalesce((a ->> 'c')::numeric, 0) + coalesce((a ->> 'i')::numeric, 0) + coalesce((a ->> 'b')::numeric, 0))) end
$$;

create or replace function public.comparar_simulacro(p_bloque text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  mi_carrera text;
  r jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select nullif(trim(carrera), '') into mi_carrera from public.perfiles where id = uid;

  with base as (
    select distinct on (i.usuario) i.usuario, nullif(trim(p.carrera), '') as carrera, i.puntaje,
           public.sim_pct(i.areas -> 'com') as com, public.sim_pct(i.areas -> 'mat') as mat,
           public.sim_pct(i.areas -> 'cta') as cta, public.sim_pct(i.areas -> 'ccss') as ccss,
           greatest(0, least(100, round(100 * (1 - i.segundos / greatest(s.minutos * 60.0, 1))))) as rap
    from public.simulacro_intentos i
    join public.simulacros s on s.id = i.simulacro
    left join public.perfiles p on p.id = i.usuario
    where i.bloque = p_bloque and i.creado > now() - interval '90 days' and i.areas is not null
    order by i.usuario, i.creado desc
  ), g as (
    select case when mi_carrera is not null and count(*) filter (where carrera = mi_carrera) >= 5
                then 'carrera' else 'bloque' end as grupo
    from base
  ), t as (
    select b.*, rank() over (order by b.puntaje desc) as puesto,
           percent_rank() over (order by b.puntaje) as pr
    from base b, g
    where g.grupo = 'bloque' or b.carrera = mi_carrera
  )
  select jsonb_build_object(
    'grupo', g.grupo,
    'nombre', case when g.grupo = 'carrera' then mi_carrera else 'Bloque ' || p_bloque end,
    'n', (select count(*) from t),
    'puesto', (select puesto from t where usuario = uid),
    'yo', (select jsonb_build_object('com', com, 'mat', mat, 'cta', cta, 'ccss', ccss, 'rap', rap, 'puntaje', puntaje) from t where usuario = uid),
    'prom', (select jsonb_build_object('com', round(avg(com)), 'mat', round(avg(mat)), 'cta', round(avg(cta)),
                                       'ccss', round(avg(ccss)), 'rap', round(avg(rap)), 'puntaje', round(avg(puntaje), 1)) from t),
    'top', (select jsonb_build_object('com', round(avg(com)), 'mat', round(avg(mat)), 'cta', round(avg(cta)),
                                      'ccss', round(avg(ccss)), 'rap', round(avg(rap)), 'puntaje', round(avg(puntaje), 1)) from t where pr >= 0.9))
  into r from g;
  -- Con menos de 5 alumnos un promedio deja adivinar a los demás: solo el conteo
  if coalesce((r ->> 'n')::integer, 0) < 5 then
    return jsonb_build_object('n', coalesce((r ->> 'n')::integer, 0), 'nombre', r -> 'nombre');
  end if;
  return r;
end $$;
revoke all on function public.comparar_simulacro(text) from public, anon;
grant execute on function public.comparar_simulacro(text) to authenticated;

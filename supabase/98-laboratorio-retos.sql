-- =========================================================
-- Modo Cachimbo · Energía de los retos del Laboratorio
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 97-laboratorio-rayos.sql.
--
--   · Cada pregunta acertada en el Modo Reto de un simulador da +2
--     de energía. Como máximo 10 al día (5 aciertos).
--   · Entre un acierto y otro deben pasar al menos 4 segundos.
-- =========================================================

create or replace function public.lab_reto(p_sim text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  hoy text := to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD');
  n integer; ultimo timestamptz; r jsonb;
begin
  if uid is null then raise exception 'Inicia sesión'; end if;
  if not exists (select 1 from public.lab_sims where sim = p_sim) then
    return jsonb_build_object('error', 'Ese simulador no existe');
  end if;
  perform pg_advisory_xact_lock(hashtext('lab_rayos:' || uid::text));
  select count(*), max(creado) into n, ultimo from public.lab_rayos
   where usuario = uid and clave like 'reto:' || hoy || ':%';
  if n >= 5 then
    r := public.lab_estado('{}'::jsonb);
    return r || jsonb_build_object('ganado', 0, 'tope', true);
  end if;
  if ultimo is not null and now() - ultimo < interval '4 seconds' then
    r := public.lab_estado('{}'::jsonb);
    return r || jsonb_build_object('ganado', 0);
  end if;
  insert into public.lab_rayos (usuario, clave, cantidad)
  values (uid, 'reto:' || hoy || ':' || (n + 1), 2) on conflict do nothing;
  r := public.lab_estado('{}'::jsonb);
  return r || jsonb_build_object('ganado', 2, 'tope', n + 1 >= 5);
end;
$$;
revoke all on function public.lab_reto(text) from public, anon;
grant execute on function public.lab_reto(text) to authenticated;

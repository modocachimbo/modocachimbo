-- =========================================================
-- 20 · Misiones nuevas y 5 canjes al día
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Va después de 16-corazones.sql.
--
-- Misiones del día (3 por alumno, cambian a medianoche):
--   · Fija: Explora, 10 preguntas en Práctica de un curso que no
--     practicó en los últimos 7 días
--   · Fija: terminar un duelo con un amigo
--   · 1 al azar: 10 palabras en Vocabulario, 10 flashcards,
--     acertar 5 seguidas en Práctica, o 10 buenas en Repaso
--     (esta última solo si tiene algún Repaso abierto; si se queda
--     sin corazones, vuelve a empezar de 0)
--   Cada una da +1 corazón y +20 XP. El simulacro sigue igual.
-- Canje: 150 XP = 1 corazón, ahora hasta 5 al día.
-- Las misiones nuevas salen desde el día siguiente; los canjes,
-- de inmediato.
-- =========================================================
create or replace function public.cz_generar(uid uuid, p_cursos text[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy text := public.cz_hoy()::text;
  c   text;
  r   jsonb := '[]'::jsonb;
  t   text;
  pool text[];
begin
  select x into c from unnest(coalesce(p_cursos, '{}')) x
  where x ~ '^[a-z0-9-]{1,40}$'
    and not exists (select 1 from public.progreso g where g.usuario = uid and g.carpeta = x
                      and g.tipo = 'libro' and g.actualizado > now() - interval '7 days')
  order by md5(uid::text || hoy || x) limit 1;
  if c is null then  -- ya practicó todos esta semana: cualquiera
    select x into c from unnest(coalesce(p_cursos, '{}')) x where x ~ '^[a-z0-9-]{1,40}$' order by md5(uid::text || hoy || x) limit 1;
  end if;
  r := r || jsonb_build_object('id', 'explora', 'tipo', 'explora', 'curso', c, 'meta', 10, 'hecho', 0, 'estado', 'pend');
  -- Fija: terminar un duelo con un amigo
  r := r || jsonb_build_object('id', 'duelo', 'tipo', 'duelo', 'curso', null, 'meta', 1, 'hecho', 0, 'estado', 'pend');
  -- 1 al azar. Repaso solo entra si el alumno tiene algún Repaso abierto.
  pool := array['vocabulario', 'tarjetas', 'seguidas'];
  if coalesce(current_setting('mc.repaso', true), '') = 'true' then pool := pool || 'repaso'::text; end if;
  select x into t from unnest(pool) x order by md5(uid::text || hoy || 'm' || x) limit 1;
  r := r || jsonb_build_object('id', t, 'tipo', t, 'curso', null,
    'meta', case t when 'seguidas' then 5 else 10 end, 'hecho', 0, 'estado', 'pend');
  return r;
end $$;

-- Pone al día al alumno: cambio de día, recarga cada 3 h, misiones
-- hechas y premios por cobrar. Devuelve el estado (uso interno).
create or replace function public.cz_estado(uid uuid, p_cursos text[] default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  hoy    date := public.cz_hoy();
  desde  timestamptz := (public.cz_hoy())::timestamp at time zone 'America/Lima';
  r      public.corazones;
  k      integer;
  m      jsonb;
  ms     jsonb := '[]'::jsonb;
  nuevas text[] := '{}';
  xps    integer;
begin
  insert into public.corazones (usuario, dia, misiones) values (uid, hoy, public.cz_generar(uid, p_cursos))
  on conflict (usuario) do nothing;
  select * into r from public.corazones where usuario = uid for update;

  if r.dia <> hoy then
    r.dia := hoy; r.quedan := 5; r.recarga := now(); r.simulacro := 'pend'; r.canjes := 0; r.xp_hoy := 0;
    r.misiones := public.cz_generar(uid, p_cursos);
  elsif p_cursos is not null and array_length(p_cursos, 1) > 0
        and exists (select 1 from jsonb_array_elements(r.misiones) e where e ->> 'tipo' = 'explora' and e ->> 'curso' is null) then
    -- Se armó sin la lista de cursos: se completa la misión de explorar
    select jsonb_agg(case when e ->> 'tipo' = 'explora'
                          then jsonb_set(e, '{curso}', to_jsonb((public.cz_generar(uid, p_cursos) -> 0) ->> 'curso')) else e end)
      into r.misiones from jsonb_array_elements(r.misiones) e;
  end if;

  -- Un corazón cada 3 horas mientras falten
  if r.quedan < 5 then
    k := floor(extract(epoch from now() - r.recarga) / 10800)::int;
    if k > 0 then
      r.quedan := least(5, r.quedan + k);
      r.recarga := case when r.quedan >= 5 then now() else r.recarga + k * interval '3 hours' end;
    end if;
  end if;

  -- Misiones que se revisan en el servidor (duelo terminado hoy)
  for m in select value from jsonb_array_elements(r.misiones) loop
    if m ->> 'tipo' = 'duelo' and m ->> 'estado' = 'pend'
       and exists (select 1 from public.duelo_jugadas j where j.usuario = uid and j.terminado >= desde) then
      m := m || jsonb_build_object('hecho', 1, 'estado', 'lista');
      r.xp_saldo := r.xp_saldo + 20;
      insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), 20)
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + 20;
    end if;
    -- Premio listo y le faltan corazones: se cobra solo
    if m ->> 'estado' = 'lista' and r.quedan < 5 then
      r.quedan := r.quedan + 1;
      m := m || jsonb_build_object('estado', 'cobrada');
      nuevas := nuevas || (m ->> 'tipo');
    end if;
    ms := ms || m;
  end loop;
  r.misiones := ms;

  -- Primer simulacro del día: devuelve los 5
  if r.simulacro = 'pend' and exists (select 1 from public.simulacro_intentos s where s.usuario = uid and s.creado >= desde) then
    r.simulacro := 'lista';
  end if;
  if r.simulacro = 'lista' and r.quedan < 5 then
    r.quedan := 5; r.recarga := now(); r.simulacro := 'cobrada'; nuevas := nuevas || 'simulacro'::text;
  end if;

  update public.corazones set dia = r.dia, quedan = r.quedan, recarga = r.recarga, misiones = r.misiones, simulacro = r.simulacro,
    canjes = r.canjes, xp_hoy = r.xp_hoy, xp_saldo = r.xp_saldo, actualizado = now() where usuario = uid;
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();

  return jsonb_build_object(
    'quedan', r.quedan, 'max', 5,
    'proximo', case when r.quedan < 5 then greatest(0, ceil(10800 - extract(epoch from now() - r.recarga)))::int end,
    'misiones', r.misiones, 'simulacro', r.simulacro, 'nuevas', to_jsonb(nuevas),
    'xp_semana', xps, 'xp_saldo', r.xp_saldo, 'canjes', r.canjes, 'canjes_max', 5, 'precio', 150
  );
end $$;
revoke all on function public.cz_estado(uuid, text[]) from public, anon, authenticated;
revoke all on function public.cz_generar(uuid, text[]) from public, anon, authenticated;

-- Lo que pide la web: estado del día
drop function if exists public.mis_corazones(text[]);
create or replace function public.mis_corazones(p_cursos text[] default null, p_repaso boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  perform set_config('mc.repaso', coalesce(p_repaso, false)::text, true);
  return public.cz_estado(auth.uid(), (select array_agg(x) from unnest(p_cursos) with ordinality u(x, i) where i <= 80));
end $$;
revoke all on function public.mis_corazones(text[], boolean) from public, anon;
grant execute on function public.mis_corazones(text[], boolean) to authenticated;

-- Un error en Repaso, Fijas, Seminarios o Banqueo
create or replace function public.perder_corazon()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.cz_estado(uid);
  update public.corazones set recarga = case when quedan = 5 then now() else recarga end,
    quedan = greatest(quedan - 1, 0), actualizado = now() where usuario = uid;
  -- Se quedó sin corazones: la misión de Repaso vuelve a empezar
  update public.corazones set misiones = (
      select jsonb_agg(case when e ->> 'tipo' = 'repaso' and e ->> 'estado' = 'pend' then e || '{"hecho":0}'::jsonb else e end)
      from jsonb_array_elements(misiones) e)
    where usuario = uid and quedan = 0 and jsonb_array_length(misiones) > 0;
  return public.cz_estado(uid);
end $$;
revoke all on function public.perder_corazon() from public, anon;
grant execute on function public.perder_corazon() to authenticated;

-- Respuestas: suma XP y avanza las misiones.
-- p = { fuente, curso, ok, mal, seguidas }
create or replace function public.sumar_xp(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid    uuid := auth.uid();
  fuente text := coalesce(p ->> 'fuente', '');
  curso  text := coalesce(p ->> 'curso', '');
  ok     integer := least(greatest(coalesce((p ->> 'ok')::int, 0), 0), 50);
  mal    integer := least(greatest(coalesce((p ->> 'mal')::int, 0), 0), 50);
  seg    integer := least(greatest(coalesce((p ->> 'seguidas')::int, 0), 0), 100);
  xp     integer;
  r      public.corazones;
  m      jsonb;
  ms     jsonb := '[]'::jsonb;
  n      integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if fuente not in ('libro', 'repaso', 'fijas', 'seminarios', 'banqueo', 'examen', 'falladas', 'vocabulario', 'tarjetas', 'duelo', 'simulacro') then
    raise exception 'fuente inválida';
  end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;

  -- XP del envío, con tope de 4000 al día
  xp := least(10 * ok + 2 * mal, greatest(4000 - r.xp_hoy, 0));

  -- Avance de misiones
  for m in select value from jsonb_array_elements(r.misiones) loop
    if m ->> 'estado' = 'pend' then
      n := (m ->> 'hecho')::int;
      if m ->> 'tipo' = 'explora' and fuente = 'libro' and (m ->> 'curso' is null or m ->> 'curso' = curso) then n := n + ok + mal;
      elsif m ->> 'tipo' = 'vocabulario' and fuente = 'vocabulario' then n := n + ok + mal;
      elsif m ->> 'tipo' = 'tarjetas' and fuente = 'tarjetas' then n := n + ok + mal;
      elsif m ->> 'tipo' = 'repaso' and fuente = 'repaso' then n := n + ok;
      elsif m ->> 'tipo' = 'seguidas' and fuente = 'libro' then n := greatest(n, seg);
      end if;
      n := least(n, (m ->> 'meta')::int);
      m := m || jsonb_build_object('hecho', n);
      if n >= (m ->> 'meta')::int then
        m := m || jsonb_build_object('estado', 'lista');
        xp := xp + 20;
      end if;
    end if;
    ms := ms || m;
  end loop;

  update public.corazones set misiones = ms, xp_hoy = xp_hoy + xp, xp_saldo = xp_saldo + xp, actualizado = now() where usuario = uid;
  if xp > 0 then
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;

-- Canje: 150 XP = 1 corazón, máximo 5 al día
create or replace function public.canjear_xp()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  e := public.cz_estado(uid);
  if (e ->> 'quedan')::int >= 5 then return e || '{"error":"Ya tienes tus 5 corazones."}'::jsonb; end if;
  if (e ->> 'canjes')::int >= 5 then return e || '{"error":"Ya usaste tus 5 canjes de hoy."}'::jsonb; end if;
  if (e ->> 'xp_saldo')::int < 150 then return e || '{"error":"Te falta XP para canjear."}'::jsonb; end if;
  update public.corazones set quedan = quedan + 1, canjes = canjes + 1, xp_saldo = xp_saldo - 150,
    actualizado = now() where usuario = uid;
  return public.cz_estado(uid) || '{"ok":true}'::jsonb;
end $$;
revoke all on function public.canjear_xp() from public, anon;
grant execute on function public.canjear_xp() to authenticated;

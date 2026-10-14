-- =========================================================
-- Modo Cachimbo · Corazones, misiones del día y XP
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes 01-perfiles, 04-progreso,
-- 09-simulacros y 10-duelos.
--
-- Corazones (solo en Repaso, Fijas, Seminarios y Banqueo):
--   · Máximo 5. Cada error resta 1. A medianoche vuelven a 5.
--   · Si le faltan, recupera 1 cada 3 horas.
--   · Misiones del día (3 por alumno, cambian a medianoche):
--       - Explora: 10 preguntas en Práctica de un curso que no
--         practicó en los últimos 7 días
--       - 2 al azar: 10 palabras en Vocabulario, terminar un duelo,
--         10 flashcards, acertar 5 seguidas en Práctica
--     Cada una da +1 corazón y +20 XP. El primer simulacro del día
--     devuelve los 5. Si la hace con los 5 corazones llenos, el
--     premio espera y se cobra solo cuando le falten.
--   · Canje: 150 XP = 1 corazón, máximo 2 al día.
-- XP: +10 por correcta y +2 por incorrecta en cualquier parte.
-- El ranking semanal (lunes a domingo, hora de Perú) suma todo el
-- XP ganado; canjear no lo baja.
-- =========================================================

create table if not exists public.corazones (
  usuario     uuid primary key references auth.users (id) on delete cascade,
  dia         date not null,
  quedan      integer not null default 5 check (quedan between 0 and 5),
  recarga     timestamptz not null default now(),   -- desde cuándo corre el próximo corazón
  misiones    jsonb not null default '[]'::jsonb,   -- [{id, tipo, curso, meta, hecho, estado: pend|lista|cobrada}]
  simulacro   text not null default 'pend' check (simulacro in ('pend', 'lista', 'cobrada')),
  canjes      integer not null default 0,
  xp_hoy      integer not null default 0,
  xp_saldo    integer not null default 0 check (xp_saldo >= 0),   -- XP que aún se puede canjear
  actualizado timestamptz not null default now()
);
alter table public.corazones enable row level security;
drop policy if exists "corazones propios: ver" on public.corazones;
create policy "corazones propios: ver" on public.corazones
  for select to authenticated using ((select auth.uid()) = usuario);

create table if not exists public.xp_semana (
  usuario uuid not null references auth.users (id) on delete cascade,
  semana  date not null,                 -- lunes de la semana
  xp      integer not null default 0,
  primary key (usuario, semana)
);
create index if not exists xp_semana_top on public.xp_semana (semana, xp desc);
alter table public.xp_semana enable row level security;
drop policy if exists "xp propio: ver" on public.xp_semana;
create policy "xp propio: ver" on public.xp_semana
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo en estas tablas: solo con las funciones de abajo

-- Fecha y lunes de hoy en Perú (uso interno)
create or replace function public.cz_hoy() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Lima')::date;
$$;
create or replace function public.cz_lunes() returns date language sql stable set search_path = '' as $$
  select date_trunc('week', now() at time zone 'America/Lima')::date;
$$;

-- Arma las 3 misiones del día. p_cursos = cursos del sitio (assets/cursos.json)
create or replace function public.cz_generar(uid uuid, p_cursos text[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  hoy text := public.cz_hoy()::text;
  c   text;
  r   jsonb := '[]'::jsonb;
  t   text;
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
  for t in select x from unnest(array['vocabulario', 'duelo', 'tarjetas', 'seguidas']) x order by md5(uid::text || hoy || 'm' || x) limit 2 loop
    r := r || jsonb_build_object('id', t, 'tipo', t, 'curso', null,
      'meta', case t when 'duelo' then 1 when 'seguidas' then 5 else 10 end, 'hecho', 0, 'estado', 'pend');
  end loop;
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
    'xp_semana', xps, 'xp_saldo', r.xp_saldo, 'canjes', r.canjes, 'canjes_max', 2, 'precio', 150
  );
end $$;
revoke all on function public.cz_estado(uuid, text[]) from public, anon, authenticated;
revoke all on function public.cz_generar(uuid, text[]) from public, anon, authenticated;

-- Lo que pide la web: estado del día
create or replace function public.mis_corazones(p_cursos text[] default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  return public.cz_estado(auth.uid(), (select array_agg(x) from unnest(p_cursos) with ordinality u(x, i) where i <= 80));
end $$;
revoke all on function public.mis_corazones(text[]) from public, anon;
grant execute on function public.mis_corazones(text[]) to authenticated;

-- Un error en Repaso, Fijas, Seminarios o Banqueo
create or replace function public.perder_corazon()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  perform public.cz_estado(uid);
  update public.corazones set recarga = case when quedan = 5 then now() else recarga end,
    quedan = greatest(quedan - 1, 0), actualizado = now() where usuario = uid;
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

-- Canje: 150 XP = 1 corazón, máximo 2 al día
create or replace function public.canjear_xp()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  e := public.cz_estado(uid);
  if (e ->> 'quedan')::int >= 5 then return e || '{"error":"Ya tienes tus 5 corazones."}'::jsonb; end if;
  if (e ->> 'canjes')::int >= 2 then return e || '{"error":"Ya usaste tus 2 canjes de hoy."}'::jsonb; end if;
  if (e ->> 'xp_saldo')::int < 150 then return e || '{"error":"Te falta XP para canjear."}'::jsonb; end if;
  update public.corazones set quedan = quedan + 1, canjes = canjes + 1, xp_saldo = xp_saldo - 150,
    actualizado = now() where usuario = uid;
  return public.cz_estado(uid) || '{"ok":true}'::jsonb;
end $$;
revoke all on function public.canjear_xp() from public, anon;
grant execute on function public.canjear_xp() to authenticated;

-- Top 10 de la semana por XP, más el puesto del alumno
create or replace function public.ranking_xp()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); lunes date := public.cz_lunes(); top jsonb; yo jsonb; total integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select count(*) into total from public.xp_semana where semana = lunes and xp > 0;
  select coalesce(jsonb_agg(t order by t.puesto), '[]'::jsonb) into top from (
    select row_number() over (order by x.xp desc, x.usuario) as puesto, public.duelo_apodo(x.usuario) as apodo, x.xp, x.usuario = uid as yo
    from public.xp_semana x where x.semana = lunes and x.xp > 0 order by x.xp desc, x.usuario limit 10
  ) t;
  select jsonb_build_object('puesto', 1 + (select count(*) from public.xp_semana o where o.semana = lunes and (o.xp > x.xp or (o.xp = x.xp and o.usuario < x.usuario))), 'xp', x.xp)
    into yo from public.xp_semana x where x.usuario = uid and x.semana = lunes and x.xp > 0;
  return jsonb_build_object('top', top, 'yo', yo, 'total', total);
end $$;
revoke all on function public.ranking_xp() from public, anon;
grant execute on function public.ranking_xp() to authenticated;

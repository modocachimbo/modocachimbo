-- =========================================================
-- Modo Cachimbo · XP según el modo y el rango (desde el 2 nov 2026)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 39-xp-sin-tope.sql y 43-ayudantes-regalos.sql.
--
--   · XP por respuesta según el modo (correcta / incorrecta):
--       Repaso, Fijas, Seminarios, Banqueo (quitan corazón)  30 / 2
--       Simulacro                                            30 / 2
--       Duelo                                                16 / 1
--       Práctica (libros), Exámenes, Falladas                14 / 1
--       Tarjetas, Vocabulario                                 8 / 1
--   · La correcta se multiplica según el rango de la semana
--     (estilo Free Fire: más arriba, menos XP por respuesta):
--       sin rango, Bronce, Plata ×1 · Esmeralda ×0.9 · Zafiro ×0.85
--       Amatista ×0.8 · Mítico ×0.7 · Leyenda ×0.6
--     La incorrecta no se multiplica.
--   · Premios fijos (no se multiplican): misión del día +40,
--     duelo 1.º / 2.º / 3.º = +80 / +40 / +20.
--   · Canje: 400 XP = 1 corazón (máximo 5 al día, como antes).
--   · Tarjetas + Vocabulario: hasta 1600 XP al día entre las dos.
--   · Freno contra scripts: 200 XP por minuto, reserva de 4000.
--
-- OJO: los XP mínimos de cada rango están copiados de assets/rango.js
-- (tabla «min»). Si cambian allí, hay que cambiarlos también aquí, en
-- public.xp_mult.
-- =========================================================

-- La reserva nueva es de 4000: los que tenían la reserva llena (2000) la
-- tienen llena otra vez con el tope nuevo.
alter table public.corazones alter column xp_cubo set default 4000;
update public.corazones set xp_cubo = 4000 where xp_cubo >= 2000;

-- Multiplicador de la correcta según el XP de la semana, en porcentaje.
-- Rangos (assets/rango.js · min): Esmeralda 2300 · Zafiro 4700 ·
-- Amatista 9000 · Mítico 16000 · Leyenda 50000.
create or replace function public.xp_mult(p_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_xp, 0) >= 50000 then 60   -- Leyenda
    when coalesce(p_xp, 0) >= 16000 then 70   -- Mítico
    when coalesce(p_xp, 0) >= 9000  then 80   -- Amatista
    when coalesce(p_xp, 0) >= 4700  then 85   -- Zafiro
    when coalesce(p_xp, 0) >= 2300  then 90   -- Esmeralda
    else 100                                  -- sin rango, Bronce, Plata
  end
$$;
revoke all on function public.xp_mult(integer) from public, anon;
grant execute on function public.xp_mult(integer) to authenticated;

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
  b_ok   integer;
  b_mal  integer;
  xps    integer;
  r      public.corazones;
  m      jsonb;
  ms     jsonb := '[]'::jsonb;
  n      integer;
  auto   boolean := fuente in ('tarjetas', 'vocabulario');
  hoy    date := public.cz_hoy();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if fuente not in ('libro', 'repaso', 'fijas', 'seminarios', 'banqueo', 'examen', 'falladas', 'vocabulario', 'tarjetas', 'duelo', 'simulacro') then
    raise exception 'fuente inválida';
  end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;

  -- XP base del modo
  case
    when fuente in ('repaso', 'fijas', 'seminarios', 'banqueo', 'simulacro') then b_ok := 30; b_mal := 2;
    when fuente = 'duelo' then b_ok := 16; b_mal := 1;
    when fuente in ('tarjetas', 'vocabulario') then b_ok := 8; b_mal := 1;
    else b_ok := 14; b_mal := 1;   -- libro, examen, falladas
  end case;

  -- La correcta se multiplica según el rango que tiene ahora (XP de la semana)
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  xp := ok * round(b_ok * public.xp_mult(xps) / 100.0)::int + mal * b_mal;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 1600 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(1600 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 200 XP por minuto (hasta 4000). Ninguna
  -- persona responde más rápido que eso por mucho rato; un script sí.
  r.xp_cubo := least(4000, r.xp_cubo + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 200);
  xp := least(xp, floor(r.xp_cubo)::int);
  r.xp_cubo := r.xp_cubo - xp;

  if auto then r.xp_auto_hoy := r.xp_auto_hoy + xp; end if;

  -- Avance de misiones (+40 cada una, sin multiplicador)
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
        xp := xp + 40;
      end if;
    end if;
    ms := ms || m;
  end loop;

  update public.corazones set misiones = ms, xp_cubo = r.xp_cubo, xp_cubo_t = now(), xp_auto_dia = r.xp_auto_dia, xp_auto_hoy = r.xp_auto_hoy,
    xp_hoy = xp_hoy + xp, xp_saldo = xp_saldo + xp, actualizado = now() where usuario = uid;
  if xp > 0 then
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;

-- ---------- XP por puesto en duelo (+80 / +40 / +20), sin multiplicador ----------
create or replace function public.premio_duelo(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  yo public.duelo_jugadas;
  r record;
  pos integer;
  xp integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into yo from public.duelo_jugadas j where j.duelo = d.id and j.usuario = uid for update;
  if yo.duelo is null then raise exception 'No jugaste este duelo.'; end if;
  if yo.xp_premio is not null then return jsonb_build_object('xp', yo.xp_premio, 'ya', true); end if;
  select * into r from public.duelo_resultado(d);
  if not r.listo then return jsonb_build_object('xp', 0, 'listo', false); end if;
  select t.puesto into pos from public.duelo_tabla(d) t where t.usuario = uid;
  xp := case when r.jugadores < 2 or yo.actual = 0 then 0 when pos = 1 then 80 when pos = 2 then 40 when pos = 3 then 20 else 0 end;
  if xp > 0 then perform public.cz_estado(uid); end if;
  if xp > 0 then
    update public.corazones c set xp_hoy = c.xp_hoy + xp, xp_saldo = c.xp_saldo + xp, actualizado = now() where c.usuario = uid;
    insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), xp)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
  end if;
  update public.duelo_jugadas j set xp_premio = xp where j.duelo = d.id and j.usuario = uid;
  return jsonb_build_object('xp', xp, 'puesto', pos);
end $$;
revoke all on function public.premio_duelo(text) from public, anon;
grant execute on function public.premio_duelo(text) to authenticated;

-- ---------- Canje: 400 XP = 1 corazón, máximo 5 al día ----------
create or replace function public.canjear_xp()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e jsonb;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  e := public.cz_estado(uid);
  if (e ->> 'quedan')::int >= 5 then return e || '{"error":"Ya tienes tus 5 corazones."}'::jsonb; end if;
  if (e ->> 'canjes')::int >= 5 then return e || '{"error":"Ya usaste tus 5 canjes de hoy."}'::jsonb; end if;
  if (e ->> 'xp_saldo')::int < 400 then return e || '{"error":"Te falta XP para canjear."}'::jsonb; end if;
  update public.corazones set quedan = quedan + 1, canjes = canjes + 1, xp_saldo = xp_saldo - 400,
    actualizado = now() where usuario = uid;
  return public.cz_estado(uid) || '{"ok":true}'::jsonb;
end $$;
revoke all on function public.canjear_xp() from public, anon;
grant execute on function public.canjear_xp() to authenticated;

-- ---------- Estado del día (igual que en 43-ayudantes-regalos.sql) ----------
-- Cambios: la misión de duelo da +40, el canje cuesta 400 y se devuelve
-- xp_mult (el multiplicador de la correcta en %, para la web).
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
  inf    boolean;
begin
  insert into public.corazones (usuario, dia, misiones) values (uid, hoy, public.cz_generar(uid, p_cursos))
  on conflict (usuario) do nothing;
  select * into r from public.corazones where usuario = uid for update;

  if r.dia <> hoy then
    r.dia := hoy; r.quedan := 5; r.recarga := now(); r.simulacro := 'pend'; r.canjes := 0; r.xp_hoy := 0;
    r.misiones := public.cz_generar(uid, p_cursos);
  elsif p_cursos is not null and array_length(p_cursos, 1) > 0
        and exists (select 1 from jsonb_array_elements(r.misiones) e where e ->> 'tipo' = 'explora' and e ->> 'curso' is null) then
    select jsonb_agg(case when e ->> 'tipo' = 'explora'
                          then jsonb_set(e, '{curso}', to_jsonb((public.cz_generar(uid, p_cursos) -> 0) ->> 'curso')) else e end)
      into r.misiones from jsonb_array_elements(r.misiones) e;
  end if;

  if r.quedan < 5 then
    k := floor(extract(epoch from now() - r.recarga) / 10800)::int;
    if k > 0 then
      r.quedan := least(5, r.quedan + k);
      r.recarga := case when r.quedan >= 5 then now() else r.recarga + k * interval '3 hours' end;
    end if;
  end if;

  for m in select value from jsonb_array_elements(r.misiones) loop
    if m ->> 'tipo' = 'duelo' and m ->> 'estado' = 'pend'
       and exists (select 1 from public.duelo_jugadas j where j.usuario = uid and j.terminado >= desde) then
      m := m || jsonb_build_object('hecho', 1, 'estado', 'lista');
      r.xp_saldo := r.xp_saldo + 40;
      insert into public.xp_semana (usuario, semana, xp) values (uid, public.cz_lunes(), 40)
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + 40;
    end if;
    if m ->> 'estado' = 'lista' and r.quedan < 5 then
      r.quedan := r.quedan + 1;
      m := m || jsonb_build_object('estado', 'cobrada');
      nuevas := nuevas || (m ->> 'tipo');
    end if;
    ms := ms || m;
  end loop;
  r.misiones := ms;

  if r.simulacro = 'pend' and exists (select 1 from public.simulacro_intentos s where s.usuario = uid and s.creado >= desde) then
    r.simulacro := 'lista';
  end if;
  if r.simulacro = 'lista' and r.quedan < 5 then
    r.quedan := 5; r.recarga := now(); r.simulacro := 'cobrada'; nuevas := nuevas || 'simulacro'::text;
  end if;

  update public.corazones set dia = r.dia, quedan = r.quedan, recarga = r.recarga, misiones = r.misiones, simulacro = r.simulacro,
    canjes = r.canjes, xp_hoy = r.xp_hoy, xp_saldo = r.xp_saldo, actualizado = now() where usuario = uid;
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  inf := r.infinito_hasta is not null and r.infinito_hasta > now();

  return jsonb_build_object(
    'quedan', case when inf then greatest(5, r.quedan + r.extra) else r.quedan + r.extra end, 'max', 5,
    'extra', r.extra, 'infinito', inf, 'infinito_hasta', case when inf then r.infinito_hasta end,
    'proximo', case when r.quedan < 5 then greatest(0, ceil(10800 - extract(epoch from now() - r.recarga)))::int end,
    'misiones', r.misiones, 'simulacro', r.simulacro, 'nuevas', to_jsonb(nuevas),
    'xp_semana', xps, 'xp_mult', public.xp_mult(xps),
    'xp_saldo', r.xp_saldo, 'canjes', r.canjes, 'canjes_max', 5, 'precio', 400
  );
end $$;
revoke all on function public.cz_estado(uuid, text[]) from public, anon, authenticated;

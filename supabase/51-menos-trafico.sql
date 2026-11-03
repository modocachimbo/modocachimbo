-- =========================================================
-- Modo Cachimbo · Menos tráfico y freno contra trampas
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 50-revisar-trampas-xp.sql (córrelo antes).
--
--   · vocabulario_version(): un texto corto que cambia cuando cambias
--     el Vocabulario. La web guarda las palabras en el teléfono y solo
--     las vuelve a bajar si cambió (antes bajaba las ~5 000 en cada visita).
--   · sumar_xp:
--       freno de 120 XP por minuto con reserva de 3000 (antes 200 y 4000)
--       tope de 10 000 XP al día por respuestas (las misiones aparte)
-- =========================================================

alter table public.corazones alter column xp_cubo set default 3000;
update public.corazones set xp_cubo = 3000 where xp_cubo > 3000;

-- Versión del Vocabulario: cambia si cambia cualquier palabra
create or replace function public.vocabulario_version()
returns text language sql stable security definer set search_path = '' as $$
  select count(*)::text || '-' || coalesce(md5(string_agg(v::text, '|' order by v.orden)), '0')
  from public.vocabulario v
$$;
revoke all on function public.vocabulario_version() from public;
grant execute on function public.vocabulario_version() to anon, authenticated;

-- Respuestas: igual que en 50-revisar-trampas-xp.sql, con freno de 120 XP/min
-- (reserva de 3000) y tope de 10 000 XP al día.
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

  -- Tope del día: 10 000 XP por respuestas (el estudiante más exigente
  -- hace unos 7 500; un script ya no puede pasar de aquí).
  xp := least(xp, greatest(10000 - r.xp_hoy, 0));

  -- Ritmo: la reserva se llena 120 XP por minuto (hasta 3000, lo que da un
  -- simulacro entero). Nadie acierta más de 4 por minuto por horas; un script sí.
  r.xp_cubo := least(3000, r.xp_cubo + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 120);
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
  -- Registro del envío (para Panel → Top XP → Revisar trampas)
  if ok + mal > 0 then
    insert into public.xp_envios (usuario, fuente, ok, mal, xp) values (uid, fuente, ok, mal, xp);
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;


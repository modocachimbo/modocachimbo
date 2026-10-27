-- =========================================================
-- Modo Cachimbo · XP sin tope diario
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 20-misiones-canjes.sql y 22-duelos-v2.sql.
--
--   · Se quita el tope de 4000 XP al día (respuestas y premio de duelo).
--   · Tarjetas y Vocabulario dan como máximo 800 XP al día entre las
--     dos, porque ahí el alumno marca él mismo si se la sabe.
--   · Freno contra scripts: el XP por respuestas entra a 100 XP por
--     minuto como máximo, con una reserva de 2000 (un simulacro entero
--     entra de golpe).
-- =========================================================

alter table public.corazones add column if not exists xp_cubo numeric not null default 2000;
alter table public.corazones add column if not exists xp_cubo_t timestamptz not null default now();
alter table public.corazones add column if not exists xp_auto_dia date;
alter table public.corazones add column if not exists xp_auto_hoy integer not null default 0;

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
  auto   boolean := fuente in ('tarjetas', 'vocabulario');
  hoy    date := public.cz_hoy();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if fuente not in ('libro', 'repaso', 'fijas', 'seminarios', 'banqueo', 'examen', 'falladas', 'vocabulario', 'tarjetas', 'duelo', 'simulacro') then
    raise exception 'fuente inválida';
  end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;

  -- XP del envío, sin tope diario.
  xp := 10 * ok + 2 * mal;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 800 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(800 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 100 XP por minuto (hasta 2000). Ninguna
  -- persona responde más rápido que eso por mucho rato; un script sí.
  r.xp_cubo := least(2000, r.xp_cubo + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 100);
  xp := least(xp, floor(r.xp_cubo)::int);
  r.xp_cubo := r.xp_cubo - xp;

  if auto then r.xp_auto_hoy := r.xp_auto_hoy + xp; end if;

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

-- ---------- XP por puesto en duelo (+40 / +20 / +10), sin tope ----------
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
  xp := case when r.jugadores < 2 or yo.actual = 0 then 0 when pos = 1 then 40 when pos = 2 then 20 when pos = 3 then 10 else 0 end;
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

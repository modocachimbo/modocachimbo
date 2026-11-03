-- =========================================================
-- Modo Cachimbo · Revisar trampas de XP (Panel → Top de la semana)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 49-xp-por-modo-y-rango.sql.
--
--   · xp_envios: cada vez que la web manda respuestas a sumar_xp se
--     guarda quién, cuándo, de qué modo, cuántas y cuánto XP dio. Se
--     borra solo lo de hace más de 8 semanas.
--   · xp_revision(p_dia): los 50 con más XP de la semana con lo que de
--     verdad hicieron y señales de alerta (solo con permiso Top XP).
--   · xp_ajustar(...): deja el XP de la semana de un alumno en el valor
--     que digas (0 = se lo quitas todo) y lo anota en xp_ajustes.
--
-- Las señales son para revisar, no son prueba: míralas junto con el
-- historial del alumno antes de quitarle XP.
-- =========================================================

create table if not exists public.xp_envios (
  id      bigserial primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  creado  timestamptz not null default now(),
  fuente  text not null,
  ok      integer not null default 0,
  mal     integer not null default 0,
  xp      integer not null default 0
);
create index if not exists xp_envios_usuario on public.xp_envios (usuario, creado);
create index if not exists xp_envios_creado on public.xp_envios (creado);
alter table public.xp_envios enable row level security;   -- sin políticas: solo las funciones

create table if not exists public.xp_ajustes (
  id      bigserial primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  semana  date not null,
  antes   integer not null,
  despues integer not null,
  motivo  text,
  por     text,
  creado  timestamptz not null default now()
);
alter table public.xp_ajustes enable row level security;  -- sin políticas: solo las funciones

-- Respuestas: igual que en 49-xp-por-modo-y-rango.sql, y además registra cada envío.
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
  -- Registro del envío (para Panel → Top XP → Revisar trampas)
  if ok + mal > 0 then
    insert into public.xp_envios (usuario, fuente, ok, mal, xp) values (uid, fuente, ok, mal, xp);
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;

-- ---------- Panel: los 50 con más XP de la semana, con señales ----------
-- preguntas: lo que quedó registrado en la web (último intento de cada tema
-- en Práctica, Repaso, Fijas y Exámenes, más los simulacros). Seminarios,
-- Banqueo, Duelo, Vocabulario y Tarjetas no quedan ahí, por eso es una
-- cuenta menor que la real.
create or replace function public.xp_revision(p_dia date default null)
returns table (
  puesto integer, usuario uuid, nombre text, apodo text, email text, xp integer,
  regalado integer, premios integer, preguntas integer, xp_por_pregunta integer,
  envios integer, respuestas integer, aciertos integer, horas integer, max_hora integer,
  ajustado boolean, senales text[], desde date
)
language plpgsql stable security definer set search_path = '' as $$
declare
  lunes date;
  ini timestamptz;
  fin timestamptz;
begin
  if not public.puede('topxp') then raise exception 'no autorizado'; end if;
  lunes := (date_trunc('week', coalesce(p_dia, (now() at time zone 'America/Lima')::date)::timestamp))::date;
  ini := lunes::timestamp at time zone 'America/Lima';
  fin := ini + interval '7 days';
  return query
    with top as (
      select x.usuario as u, x.xp as xp_sem, (row_number() over (order by x.xp desc, x.usuario))::integer as pos
      from public.xp_semana x where x.semana = lunes and x.xp > 0
      order by x.xp desc limit 50
    ), env as (
      select e.usuario as u, count(*)::integer as n, sum(e.ok + e.mal)::integer as resp, sum(e.ok)::integer as oks,
             count(distinct date_trunc('hour', e.creado))::integer as hrs
      from public.xp_envios e where e.creado >= ini and e.creado < fin and e.usuario in (select t.u from top t)
      group by e.usuario
    ), hora as (
      select h.u, max(h.s)::integer as mx from (
        select e.usuario as u, sum(e.xp) as s from public.xp_envios e
        where e.creado >= ini and e.creado < fin and e.usuario in (select t.u from top t)
        group by e.usuario, date_trunc('hour', e.creado)) h
      group by h.u
    ), base as (
      select t.pos, t.u, t.xp_sem,
        coalesce((select sum(g.cantidad) from public.regalos g where g.usuario = t.u and g.tipo = 'xp' and g.creado >= ini and g.creado < fin), 0)::integer as reg,
        coalesce((select sum(j.xp_premio) from public.duelo_jugadas j where j.usuario = t.u and j.terminado >= ini and j.terminado < fin), 0)::integer as prem,
        (coalesce((select sum(p.total) from public.progreso p where p.usuario = t.u and p.actualizado >= ini and p.actualizado < fin), 0)
         + coalesce((select sum(s.correctas + s.incorrectas) from public.simulacro_intentos s where s.usuario = t.u and s.creado >= ini and s.creado < fin), 0))::integer as preg,
        coalesce(v.n, 0) as n, coalesce(v.resp, 0) as resp, coalesce(v.oks, 0) as oks, coalesce(v.hrs, 0) as hrs, coalesce(h.mx, 0) as mx,
        exists (select 1 from public.xp_ajustes a where a.usuario = t.u and a.semana = lunes) as aj
      from top t left join env v on v.u = t.u left join hora h on h.u = t.u
    )
    select b.pos, b.u, p.nombre, p.apodo, au.email::text, b.xp_sem, b.reg, b.prem, b.preg,
      (case when b.preg > 0 then (b.xp_sem - b.reg - b.prem) / b.preg end)::integer,
      b.n, b.resp, (case when b.resp > 0 then round(100.0 * b.oks / b.resp) end)::integer, b.hrs, b.mx, b.aj,
      array_remove(array[
        case when b.xp_sem - b.reg - b.prem > 5000 and (b.preg = 0 or (b.xp_sem - b.reg - b.prem) / b.preg > 60)
             then 'Mucho XP para las preguntas que respondió' end,
        case when b.mx > 6000 then 'Más de 6' || chr(160) || '000 XP en una sola hora' end,
        case when b.resp >= 300 and b.oks = b.resp then 'Acertó el 100' || chr(160) || '% de ' || replace(to_char(b.resp, 'FM999G999G999'), ',', chr(160)) || ' respuestas' end,
        case when b.hrs > 16 * 7 or (b.hrs > 0 and b.hrs >= 16 * (extract(day from (least(now(), fin) - ini)) + 1)) then 'Activo casi todas las horas del día' end
      ], null),
      lunes
    from base b
    join auth.users au on au.id = b.u
    left join public.perfiles p on p.id = b.u
    order by b.pos;
end $$;
revoke all on function public.xp_revision(date) from public, anon;
grant execute on function public.xp_revision(date) to authenticated;

-- ---------- Panel: dejar el XP de la semana de un alumno en p_xp ----------
-- Solo puede bajar (para subir están los Regalos). También baja el saldo
-- canjeable en lo que se quitó, sin dejarlo negativo.
create or replace function public.xp_ajustar(p_usuario uuid, p_dia date, p_xp integer, p_motivo text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  lunes date;
  antes integer;
  nuevo integer;
begin
  if not public.puede('topxp') then raise exception 'no autorizado'; end if;
  lunes := (date_trunc('week', coalesce(p_dia, (now() at time zone 'America/Lima')::date)::timestamp))::date;
  select x.xp into antes from public.xp_semana x where x.usuario = p_usuario and x.semana = lunes for update;
  if antes is null then raise exception 'Ese alumno no tiene XP esa semana.'; end if;
  nuevo := least(greatest(coalesce(p_xp, 0), 0), antes);
  update public.xp_semana set xp = nuevo where usuario = p_usuario and semana = lunes;
  update public.corazones set xp_saldo = greatest(xp_saldo - (antes - nuevo), 0) where usuario = p_usuario;
  insert into public.xp_ajustes (usuario, semana, antes, despues, motivo, por)
  values (p_usuario, lunes, antes, nuevo, left(p_motivo, 300), (select lower(a.email) from auth.users a where a.id = auth.uid()));
  return jsonb_build_object('antes', antes, 'despues', nuevo);
end $$;
revoke all on function public.xp_ajustar(uuid, date, integer, text) from public, anon;
grant execute on function public.xp_ajustar(uuid, date, integer, text) to authenticated;

-- Limpieza: el registro de envíos solo se guarda 8 semanas
delete from public.xp_envios where creado < now() - interval '56 days';

-- =========================================================
-- Modo Cachimbo · XP como antes: 15 / 10 por correcta, sin tope diario
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 52-tope-20000.sql.
--
--   · XP por respuesta (correcta / incorrecta):
--       Repaso, Fijas, Seminarios, Banqueo (gastan corazón)   15 / 2
--       Práctica, Exámenes, Falladas, Simulacro, Duelo,
--       Vocabulario y Flashcards                             10 / 2
--   · Sin multiplicador de rango: la correcta vale lo mismo en todos los
--     rangos (xp_mult ahora siempre da 100). Los XP mínimos de cada rango
--     NO cambian (Leyenda sigue desde 50 000).
--   · Sin tope diario (antes 20 000).
--   · Se quedan: freno de 120 XP por minuto con reserva de 3000 (contra
--     scripts) y Vocabulario + Flashcards hasta 1000 XP al día entre las dos.
--   · Misiones (+40), premio de duelo (80/40/20) y canje (400 XP) igual.
-- =========================================================

-- Sin multiplicador: la correcta vale lo mismo en cualquier rango
create or replace function public.xp_mult(p_xp integer)
returns integer language sql immutable set search_path = '' as $$
  select 100
$$;
revoke all on function public.xp_mult(integer) from public, anon;
grant execute on function public.xp_mult(integer) to authenticated;

-- Respuestas: igual que en 52-tope-20000.sql, con los puntos nuevos y sin tope diario.
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

  -- 15 donde se gasta corazón, 10 en lo demás; la incorrecta da 2
  b_ok := case when fuente in ('repaso', 'fijas', 'seminarios', 'banqueo') then 15 else 10 end;
  xp := ok * b_ok + mal * 2;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 1000 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(1000 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 120 XP por minuto (hasta 3000, lo que da un
  -- simulacro entero). Nadie acierta 8 por minuto por horas; un script sí.
  r.xp_cubo := least(3000, r.xp_cubo + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 120);
  xp := least(xp, floor(r.xp_cubo)::int);
  r.xp_cubo := r.xp_cubo - xp;

  if auto then r.xp_auto_hoy := r.xp_auto_hoy + xp; end if;

  -- Avance de misiones (+40 cada una)
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

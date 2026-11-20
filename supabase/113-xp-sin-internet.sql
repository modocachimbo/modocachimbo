-- =========================================================
-- Modo Cachimbo · XP jugados sin internet llegan completos.
-- Antes: al volver la señal, el celular mandaba todo lo guardado de golpe y
-- el anti-trampas (reserva de 3000 que se llena 120 por minuto) recortaba
-- lo que pasaba de esa reserva.
-- Ahora: los paquetes que vienen de la cola sin internet (p.pend = true)
-- usan una reserva de hasta 20000, que se llena igual a 120 por minuto
-- desde la última vez que sumó XP. Todo lo demás de sumar_xp queda igual
-- (copia de 81-xp-error-0-multiplicadores.sql).
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- =========================================================

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

  -- 15 donde se gasta corazón, 10 en lo demás; la incorrecta ya no da XP
  -- (marcar al azar no suma nada)
  b_ok := case when fuente in ('repaso', 'fijas', 'seminarios', 'banqueo') then 15 else 10 end;
  -- La correcta se multiplica según el rango que tiene ahora (XP de la semana)
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  xp := ok * round(b_ok * public.xp_mult(xps) / 100.0)::int;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 1000 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(1000 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 120 XP por minuto (hasta 3000, lo que da un
  -- simulacro entero). Nadie acierta 8 por minuto por horas; un script sí.
  -- XP jugados SIN INTERNET (p.pend = true, los manda la cola del celular al
  -- volver la señal): la reserva puede juntar hasta 20000 con el tiempo que de
  -- verdad pasó desde la última vez, así no se recortan al subir todo junto.
  -- El ritmo sigue siendo 120 por minuto: un script no gana más rápido.
  r.xp_cubo := least(case when coalesce((p ->> 'pend')::boolean, false) then 20000 else 3000 end,
                     greatest(r.xp_cubo, 0) + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 120);
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

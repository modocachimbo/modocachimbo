-- =========================================================
-- Modo Cachimbo · XP: ritmo de 350 XP por minuto para todos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 139-xp-sin-internet.sql (correr después del 139).
--
--   · La reserva contra trampas se llena a 350 XP por minuto (antes 120).
--     Todo lo demás de sumar_xp queda igual que en el 139.
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
  v_clave text := left(coalesce(p ->> 'clave', ''), 40);
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if fuente not in ('libro', 'repaso', 'fijas', 'seminarios', 'banqueo', 'examen', 'falladas', 'vocabulario', 'tarjetas', 'duelo', 'simulacro') then
    raise exception 'fuente inválida';
  end if;
  perform public.cz_estado(uid);
  select * into r from public.corazones where usuario = uid for update;
  -- Tanda que el teléfono ya había mandado (llegó, pero la respuesta se perdió por la señal):
  -- no se suma dos veces
  if v_clave <> '' and exists (select 1 from public.xp_envios e where e.usuario = uid and e.clave = v_clave) then
    return public.cz_estado(uid) || jsonb_build_object('ganado', 0, 'repetido', true, 'clave_ok', true);
  end if;

  -- 15 donde se gasta corazón, 10 en lo demás; la incorrecta ya no da XP
  -- (marcar al azar no suma nada)
  b_ok := case when fuente in ('repaso', 'fijas', 'seminarios', 'banqueo') then 15 else 10 end;
  -- La correcta se multiplica según el rango que tiene ahora (XP de la semana)
  select coalesce(x.xp, 0) into xps from (select 1) d left join public.xp_semana x on x.usuario = uid and x.semana = public.cz_lunes();
  xp := ok * round(b_ok * public.xp_mult(xps) / 100.0)::int;
  -- Mismo tema repetido 3 veces o más hoy: la mitad de XP (lo avisa la página)
  if coalesce((p ->> 'repite')::boolean, false) then xp := xp / 2; end if;

  -- Tarjetas y Vocabulario: el alumno marca él mismo «me la sé», así que
  -- dan como máximo 1000 XP al día entre las dos.
  if r.xp_auto_dia is distinct from hoy then r.xp_auto_dia := hoy; r.xp_auto_hoy := 0; end if;
  if auto then
    xp := least(xp, greatest(1000 - r.xp_auto_hoy, 0));
  end if;

  -- Ritmo: la reserva se llena 350 XP por minuto (antes 120; hasta 3000, lo que
  -- da un simulacro entero). Un alumno rápido ya no se recorta; un script sí.
  -- XP jugados SIN INTERNET (p.pend = true, los manda la cola del celular al
  -- volver la señal): la reserva puede juntar hasta 20000 con el tiempo que de
  -- verdad pasó desde la última vez, así no se recortan al subir todo junto.
  r.xp_cubo := least(case when coalesce((p ->> 'pend')::boolean, false) then 20000 else 3000 end,
                     greatest(r.xp_cubo, 0) + extract(epoch from (now() - r.xp_cubo_t)) / 60 * 350);
  xp := least(xp, floor(r.xp_cubo)::int);
  r.xp_cubo := r.xp_cubo - xp;

  if auto then r.xp_auto_hoy := r.xp_auto_hoy + xp; end if;
  -- Tienda: tarjeta Doble XP activa (1 día)
  if r.doble_xp_hasta is not null and r.doble_xp_hasta > now() then xp := xp * 2; end if;

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
    insert into public.xp_envios (usuario, fuente, ok, mal, xp, clave) values (uid, fuente, ok, mal, xp, nullif(v_clave, ''));
  end if;
  return public.cz_estado(uid) || jsonb_build_object('ganado', xp, 'clave_ok', true);
end $$;
revoke all on function public.sumar_xp(jsonb) from public, anon;
grant execute on function public.sumar_xp(jsonb) to authenticated;

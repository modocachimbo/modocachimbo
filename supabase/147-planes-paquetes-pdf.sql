-- =========================================================
-- Modo Cachimbo · Planes 2: Descargas PDF en 3 paquetes, Leyenda con
-- Descargas sin internet y Laboratorio gratis
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 146-yape-planes.sql y 76-limite-descarga-por-id.sql.
--
--   · Descargas PDF se vende en paquetes de 30 días: 3 PDF al día
--     S/ 4.90, 7 al día S/ 6.90 y 12 al día S/ 9.90 (se cambian en Panel →
--     Planes y precios). El límite va en accesos_id.limite_dia.
--   · Plan Leyenda (Total) abre también Descargas sin internet. Las
--     Descargas PDF NO van en ningún plan: se compran aparte.
--   · Laboratorio y Sin internet ya no se venden como extra.
--   · Laboratorio: todos los simuladores gratis.
-- =========================================================

alter table public.yape_recargas add column if not exists limite integer;   -- PDF al día (paquete de Descargas)

-- ---------- Precio (lo cobra el servidor) ----------
create or replace function public.yape_plan_precio(p_plan text, p_periodo text, p_area text)
returns table (monto numeric, producto text, dias integer, detalle text, antes numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb := coalesce((select a.valor from public.ajustes a where a.clave = 'planes'), '{}'::jsonb);
  pl jsonb; x text; m numeric; pv jsonb := coalesce(v -> 'preventa', '{}'::jsonb); de jsonb := coalesce(v -> 'descuento', '{}'::jsonb);
  areas text[] := array['matematica', 'ciencia-tecnologia', 'comunicacion', 'ciencias-sociales'];
  nom text[] := array['Matemática', 'Ciencia y Tecnología', 'Comunicación', 'Ciencias Sociales'];
  k integer; nombre text; extra boolean := p_plan = 'descarga'; pct numeric; paq jsonb; n integer;
begin
  if not (p_plan in ('area', 'total') or extra) then return; end if;
  if (p_plan in ('area', 'total') and p_periodo not in ('mes', 'ciclo')) or (extra and coalesce(p_periodo, '') !~ '^p\d{1,3}$') then return; end if;
  select e into pl from jsonb_array_elements(case when jsonb_typeof(v -> case when extra then 'extras' else 'planes' end) = 'array'
                                                  then v -> case when extra then 'extras' else 'planes' end else '[]'::jsonb end) e
   where e ->> 'id' = p_plan limit 1;
  if extra and coalesce(pl ->> 'activa', 'true') = 'false' then return; end if;
  if extra then
    -- Descargas PDF: paquetes de N PDF al día por 30 días (periodo 'p3', 'p7', 'p12'…)
    n := substring(p_periodo from 2)::integer;
    paq := case when jsonb_typeof(pl -> 'paquetes') = 'array' then pl -> 'paquetes'
                else '[{"n":3,"precio":4.90},{"n":7,"precio":6.90},{"n":12,"precio":9.90}]'::jsonb end;
    select (e ->> 'precio')::numeric into m from jsonb_array_elements(paq) e
     where (e ->> 'n') ~ '^\d+$' and (e ->> 'n')::integer = n and coalesce(e ->> 'precio', '') ~ '^\d+(\.\d+)?$' limit 1;
  else
    x := pl ->> p_periodo;
    if x ~ '^\d+(\.\d+)?$' then m := x::numeric;
    else m := case p_plan || ':' || p_periodo
      when 'area:mes' then 12.90 when 'area:ciclo' then 34.90 when 'total:mes' then 19.90 else 49.90 end;
    end if;
  end if;
  if m is null or m <= 0 then return; end if;
  antes := null;
  if p_plan = 'total' and p_periodo = 'ciclo' and coalesce(pv ->> 'activa', 'true') = 'true' and coalesce(pv ->> 'precio', '39.90') ~ '^\d+(\.\d+)?$' then
    -- Preventa: Total por ciclo
    if (coalesce(pv ->> 'precio', '39.90'))::numeric > 0 then
      if m > (coalesce(pv ->> 'precio', '39.90'))::numeric then antes := m; end if;
      m := (coalesce(pv ->> 'precio', '39.90'))::numeric;
    end if;
  elsif coalesce(de ->> 'activa', 'false') = 'true' and coalesce(de ->> 'pct', '') ~ '^\d+(\.\d+)?$' then
    pct := (de ->> 'pct')::numeric;
    if pct > 0 and pct < 91 then antes := m; m := round(m * (100 - pct) / 100, 2); end if;
  end if;
  dias := case p_periodo when 'ciclo' then 90 else 30 end;
  if p_plan = 'area' then
    k := array_position(areas, p_area);
    if k is null then return; end if;
    producto := 'area-' || p_area; nombre := 'Plan Amatista · ' || nom[k];
  else
    -- Leyenda (Total) trae también las Descargas sin internet
    producto := case p_plan when 'total' then 'TODO-VIP,offline-VIP' else 'descarga-VIP' end;
    nombre := case p_plan when 'total' then 'Plan Leyenda' else 'Descargas PDF' end;
  end if;
  detalle := nombre || ' · ' || case when extra then n || ' al día, 30 días' when p_periodo = 'mes' then '1 mes' else '3 meses' end;
  monto := round(m, 2);
  return next;
end $$;
revoke all on function public.yape_plan_precio(text, text, text) from public, anon;
grant execute on function public.yape_plan_precio(text, text, text) to authenticated;

-- ---------- Dar lo comprado (con PDF al día) ----------
create or replace function public.yape_acreditar(p_id bigint, p_como text, p_aviso bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; hoy date := (now() at time zone 'America/Lima')::date; base date; acc bigint; v_vence text;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  if r.id is null or r.estado in ('aprobada') then return false; end if;
  if r.plan is null then
    perform public.diamantes_dar(r.usuario, r.diamantes, 'Recarga Yape S/ ' || public.yape_sol(r.monto));
  else
    -- Si ya tenía ese plan, se suma desde que le vence
    select greatest(hoy, coalesce(max(a.vence)::date, hoy)) into base from public.accesos_id a
     where a.usuario = r.usuario and a.producto = r.producto and a.quitado is null and a.vence is not null
       and a.id is distinct from r.prueba and a.vence >= to_char(hoy, 'YYYY-MM-DD');
    v_vence := to_char(coalesce(base, hoy) + r.dias, 'YYYY-MM-DD');
    if r.prueba is not null then
      update public.accesos_id set vence = v_vence, nota = left('Yape S/ ' || public.yape_sol(r.monto) || ' · ' || r.detalle, 120), visto = false, limite_dia = r.limite
       where id = r.prueba and quitado is null returning id into acc;
    end if;
    if acc is null then
      insert into public.accesos_id (usuario, producto, vence, nota, limite_dia)
      values (r.usuario, r.producto, v_vence, left('Yape S/ ' || public.yape_sol(r.monto) || ' · ' || r.detalle, 120), r.limite)
      returning id into acc;
    end if;
  end if;
  update public.yape_recargas set estado = 'aprobada', como = p_como, aviso = coalesce(p_aviso, aviso), resuelto = now(), acceso = coalesce(acc, acceso) where id = p_id;
  if p_aviso is not null then update public.yape_avisos set recarga = p_id where id = p_aviso; end if;
  return true;
end $$;
revoke all on function public.yape_acreditar(bigint, text, bigint) from public, anon, authenticated;

-- ---------- Pedir un plan o paquete con captura ----------
create or replace function public.yape_pedir_plan(p_plan text, p_periodo text, p_area text, p_codigo text, p_captura text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  aj public.yape_ajustes; pp record; nuevo bigint; mot text; prueba boolean := false; pid bigint;
  cod text := regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g');
  hoy numeric; manana text := to_char((now() at time zone 'America/Lima')::date + 1, 'YYYY-MM-DD');
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  select * into pp from public.yape_plan_precio(p_plan, p_periodo, p_area);
  if pp.monto is null then raise exception 'yape_plan'; end if;
  if cod !~ '^\d{3}$' then raise exception 'yape_codigo'; end if;
  if coalesce(p_captura, '') !~ ('^' || uid::text || '/') then raise exception 'yape_captura'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.estado in ('esperando', 'revision')) >= 3 then raise exception 'yape_muchas'; end if;
  if (select count(*) from public.yape_recargas r where r.usuario = uid and r.creado > now() - interval '1 day') >= 10 then raise exception 'yape_dia'; end if;
  insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura, plan, periodo, producto, dias, detalle, limite)
  values (uid, -1, pp.monto, 0, cod, left(p_captura, 200), p_plan, p_periodo, pp.producto, pp.dias, pp.detalle,
          case when p_plan = 'descarga' then substring(p_periodo from 2)::integer end) returning id into nuevo;

  -- 1) ¿Ya llegó el aviso de Yape (MacroDroid)? → activado y verificado
  if public.yape_cruzar(nuevo) then perform public.yape_notificar(nuevo); return public.yape_ver(nuevo); end if;

  -- 2) ¿Se ve raro?
  hoy := (select coalesce(sum(r.monto), 0) from public.yape_recargas r
          where r.usuario = uid and r.id <> nuevo and r.estado = 'aprobada' and r.creado > now() - interval '1 day');
  if exists (select 1 from public.yape_recargas r where r.id <> nuevo and r.codigo = cod and r.monto = pp.monto and r.creado > now() - interval '3 days') then mot := 'Ese código ya se usó con el mismo monto';
  elsif exists (select 1 from public.yape_recargas r where r.usuario = uid and r.estado = 'rechazada' and r.creado > now() - interval '30 days') then mot := 'Tiene una recarga rechazada';
  elsif not aj.auto then mot := 'Aprobación automática apagada'; prueba := true;
  elsif pp.monto > aj.tope then mot := 'Monto alto (más de S/ ' || public.yape_sol(aj.tope) || ')'; prueba := true;
  elsif hoy + pp.monto > aj.tope_dia then mot := 'Pasó su límite del día (S/ ' || public.yape_sol(aj.tope_dia) || ')'; prueba := true;
  end if;

  if mot is null then
    perform public.yape_acreditar(nuevo, 'confianza', null);
  else
    -- Prueba hasta mañana, una vez cada 30 días
    if prueba and exists (select 1 from public.yape_recargas r where r.usuario = uid and r.id <> nuevo and r.prueba is not null and r.creado > now() - interval '30 days') then
      prueba := false; mot := mot || ' · ya usó una prueba este mes';
    end if;
    if prueba then
      insert into public.accesos_id (usuario, producto, vence, nota, limite_dia)
      values (uid, pp.producto, manana, left('Prueba Yape (en revisión) · ' || pp.detalle, 120),
              case when p_plan = 'descarga' then substring(p_periodo from 2)::integer end) returning id into pid;
    end if;
    update public.yape_recargas set estado = 'revision', motivo = mot, prueba = pid where id = nuevo;
  end if;
  perform public.yape_notificar(nuevo);
  return public.yape_ver(nuevo);
end $$;
revoke all on function public.yape_pedir_plan(text, text, text, text, text) from public, anon;
grant execute on function public.yape_pedir_plan(text, text, text, text, text) to authenticated;

-- ---------- Laboratorio: todos los simuladores gratis ----------
update public.lab_sims set gratis = true;

select sim, gratis from public.lab_sims order by sim;

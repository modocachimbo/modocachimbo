-- =========================================================
-- Modo Cachimbo · Plan Amatista abre también la Biblioteca
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 147-planes-paquetes-pdf.sql.
--
--   · Amatista (un área) ahora da 'area-<área>,biblioteca-VIP'.
--     Leyenda ya la tenía (TODO-VIP abre la Biblioteca).
--   · Los que ya compraron Amatista por Yape reciben la Biblioteca
--     hasta la misma fecha de su plan.
--   · Textos de precios.html: Amatista dice «Biblioteca» y la tabla
--     «Qué incluye cada plan» marca Biblioteca en Amatista.
-- =========================================================

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
  if p_plan in ('area', 'total') and coalesce(pv ->> 'activa', 'true') = 'true' and coalesce(pv ->> 'pct', '20') ~ '^\d+(\.\d+)?$'
     and (coalesce(pv ->> 'pct', '20'))::numeric between 1 and 90 then
    -- Preventa: % de descuento en Amatista y Leyenda, mensual o 3 meses. Se redondea hacia abajo a .90 (49.90 → 39.90 con 20 %)
    antes := m;
    m := floor(m * (100 - (coalesce(pv ->> 'pct', '20'))::numeric) / 100 - 0.9 + 0.000001) + 0.9;
    if m <= 0 then m := antes; antes := null; end if;
  elsif coalesce(de ->> 'activa', 'false') = 'true' and coalesce(de ->> 'pct', '') ~ '^\d+(\.\d+)?$' then
    pct := (de ->> 'pct')::numeric;
    if pct > 0 and pct < 91 then antes := m; m := round(m * (100 - pct) / 100, 2); end if;
  end if;
  dias := case p_periodo when 'ciclo' then 90 else 30 end;
  if p_plan = 'area' then
    k := array_position(areas, p_area);
    if k is null then return; end if;
    producto := 'area-' || p_area || ',biblioteca-VIP'; nombre := 'Plan Amatista · ' || nom[k];
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

-- ---------- Los que ya compraron Amatista ----------
update public.accesos_id a set producto = a.producto || ',biblioteca-VIP'
 where a.producto ~ '^area-[a-z-]+$' and a.quitado is null
   and (a.nota like 'Yape %' or a.nota like 'Prueba Yape%');
update public.yape_recargas r set producto = r.producto || ',biblioteca-VIP'
 where r.producto ~ '^area-[a-z-]+$';

-- ---------- Textos de los planes ----------
-- Tarjeta Amatista: agrega «Biblioteca» a lo que incluye (si aún no está)
update public.ajustes a set valor = a.valor || jsonb_build_object('planes', (
  select coalesce(jsonb_agg(
    case when p->>'id' = 'area' and jsonb_typeof(p->'si') = 'array'
              and not exists (select 1 from jsonb_array_elements_text(p->'si') s where s ilike '%biblioteca%')
         then jsonb_set(p, '{si}', (p->'si') || '["Biblioteca"]'::jsonb)
         else p end order by o), '[]'::jsonb)
  from jsonb_array_elements(a.valor->'planes') with ordinality as t(p, o)))
where a.clave = 'planes' and jsonb_typeof(a.valor->'planes') = 'array';

-- Tabla «Qué incluye cada plan»: la fila de Biblioteca queda Sí en Amatista y Leyenda
update public.ajustes a set valor = jsonb_set(a.valor, '{detalle,grupos}', (
  select coalesce(jsonb_agg(
    case when jsonb_typeof(g->'filas') = 'array' then jsonb_set(g, '{filas}', (
      select coalesce(jsonb_agg(
        case when jsonb_typeof(f) = 'array' and (f->>0) ilike '%biblioteca%'
             then jsonb_set(jsonb_set(f, '{2}', 'true'::jsonb), '{3}', 'true'::jsonb)
             else f end order by fo), '[]'::jsonb)
      from jsonb_array_elements(g->'filas') with ordinality as tf(f, fo)))
    else g end order by go), '[]'::jsonb)
  from jsonb_array_elements(a.valor->'detalle'->'grupos') with ordinality as tg(g, go)))
where a.clave = 'planes' and jsonb_typeof(a.valor->'detalle'->'grupos') = 'array';

-- =========================================================
-- Modo Cachimbo · Vidas ilimitadas de regalo al comprar un plan
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 147-planes-paquetes-pdf.sql.
--
--   · Cuando se aprueba la compra de un plan (Amatista o Leyenda),
--     el alumno recibe corazones infinitos por N semanas.
--   · N se cambia en Panel → Planes y precios → «Vidas ilimitadas
--     de regalo» de cada plan (campo 'vidas' en ajustes 'planes').
--     0 = sin regalo. Si nunca se guardó: Leyenda 2, Amatista 0.
--   · Si ya tenía corazones infinitos, las semanas se suman.
-- =========================================================

alter table public.yape_recargas add column if not exists vidas integer;

create or replace function public.plan_vidas_semanas(p_plan text)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select case when (e ->> 'vidas') ~ '^\d{1,2}$' then least((e ->> 'vidas')::integer, 52) end
       from public.ajustes a, jsonb_array_elements(case when jsonb_typeof(a.valor -> 'planes') = 'array' then a.valor -> 'planes' else '[]'::jsonb end) e
      where a.clave = 'planes' and e ->> 'id' = p_plan limit 1),
    case p_plan when 'total' then 2 else 0 end);
$$;
revoke all on function public.plan_vidas_semanas(text) from public, anon, authenticated;

create or replace function public.yape_acreditar(p_id bigint, p_como text, p_aviso bigint)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare r public.yape_recargas; hoy date := (now() at time zone 'America/Lima')::date; base date; acc bigint; v_vence text; sem integer;
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
    -- Regalo: vidas ilimitadas por N semanas (Panel → Planes y precios)
    sem := case when r.plan in ('area', 'total') then public.plan_vidas_semanas(r.plan) else 0 end;
    if sem > 0 then
      perform public.cz_estado(r.usuario);
      update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + sem * interval '7 days', actualizado = now()
       where usuario = r.usuario;
      r.vidas := sem;
    end if;
  end if;
  update public.yape_recargas set estado = 'aprobada', como = p_como, aviso = coalesce(p_aviso, aviso), resuelto = now(),
         acceso = coalesce(acc, acceso), vidas = coalesce(r.vidas, vidas) where id = p_id;
  if p_aviso is not null then update public.yape_avisos set recarga = p_id where id = p_aviso; end if;
  return true;
end $$;
revoke all on function public.yape_acreditar(bigint, text, bigint) from public, anon, authenticated;

-- Para que precios.html y la ventana de Yape muestren el regalo aunque nunca se haya guardado
update public.ajustes a set valor = a.valor || jsonb_build_object('planes', (
  select jsonb_agg(case when p ? 'vidas' or p ->> 'id' not in ('area', 'total') then p
                        else p || jsonb_build_object('vidas', case p ->> 'id' when 'total' then 2 else 0 end) end order by o)
  from jsonb_array_elements(a.valor -> 'planes') with ordinality as t(p, o)))
where a.clave = 'planes' and jsonb_typeof(a.valor -> 'planes') = 'array';

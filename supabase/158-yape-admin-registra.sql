-- =========================================================
-- Modo Cachimbo · El admin registra una compra Yape a mano
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 155-yape-lectura-ia.sql (y 156 si quieres el regalo de vidas).
--
--   Panel → Recargas Yape → «Registrar compra»: pones el ID del
--   alumno, qué compró y (opcional) la captura y el código. Se
--   activa al instante como «por ti», igual que si la hubieras
--   aprobado. Sirve cuando el alumno te manda la captura por
--   WhatsApp o no pudo comprar desde la web.
-- =========================================================

-- ¿Quién es ese ID? (para confirmar antes de registrar)
create or replace function public.yape_admin_alumno(p_jid integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = p_jid;
  if u is null then return null; end if;
  return jsonb_build_object('usuario', u,
    'apodo', (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = u),
    'email', (select x.email from auth.users x where x.id = u));
end $$;
revoke all on function public.yape_admin_alumno(integer) from public, anon;
grant execute on function public.yape_admin_alumno(integer) to authenticated;

-- p: {jid, tipo: 'plan'|'diamantes', plan, periodo, area, paquete, monto?, codigo?, captura?, nota?}
create or replace function public.yape_admin_registrar(p jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  u uuid; pp record; m numeric; d integer; nuevo bigint; mi numeric;
  cod text := regexp_replace(coalesce(p ->> 'codigo', ''), '\D', '', 'g');
  cap text := nullif(trim(coalesce(p ->> 'captura', '')), '');
  nota text := left(nullif(trim(coalesce(p ->> 'nota', '')), ''), 200);
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if coalesce(p ->> 'jid', '') !~ '^\d{5}$' then raise exception 'yape_id'; end if;
  select j.usuario into u from public.jugador_id j where j.codigo = (p ->> 'jid')::integer;
  if u is null then raise exception 'yape_id'; end if;
  if cod <> '' and cod !~ '^\d{3}$' then raise exception 'yape_codigo'; end if;
  if cap is not null and cap !~ ('^' || auth.uid()::text || '/') then raise exception 'yape_captura'; end if;
  begin mi := nullif(replace(coalesce(p ->> 'monto', ''), ',', '.'), '')::numeric; exception when others then raise exception 'yape_monto'; end;
  if mi is not null and (mi <= 0 or mi > 1000) then raise exception 'yape_monto'; end if;

  if p ->> 'tipo' = 'diamantes' then
    select x.monto, x.diamantes into m, d from public.yape_paquete((p ->> 'paquete')::integer) x;
    if m is null then raise exception 'yape_paquete'; end if;
    insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura, nota)
    values (u, (p ->> 'paquete')::integer, coalesce(mi, m), d, cod, cap, coalesce(nota, 'Registrada por el admin')) returning id into nuevo;
  else
    select * into pp from public.yape_plan_precio(p ->> 'plan', p ->> 'periodo', p ->> 'area');
    if pp.monto is null then raise exception 'yape_plan'; end if;
    insert into public.yape_recargas (usuario, paquete, monto, diamantes, codigo, captura, plan, periodo, producto, dias, detalle, limite, nota)
    values (u, -1, coalesce(mi, pp.monto), 0, cod, cap, p ->> 'plan', p ->> 'periodo', pp.producto, pp.dias, pp.detalle,
            case when p ->> 'plan' = 'descarga' then substring(p ->> 'periodo' from 2)::integer end,
            coalesce(nota, 'Registrada por el admin')) returning id into nuevo;
  end if;
  perform public.yape_acreditar(nuevo, 'admin', null);
  update public.yape_recargas set avisado = true where id = nuevo;   -- no hace falta avisarte a ti mismo
  return jsonb_build_object('id', nuevo);
end $$;
revoke all on function public.yape_admin_registrar(jsonb) from public, anon;
grant execute on function public.yape_admin_registrar(jsonb) to authenticated;

-- =========================================================
-- Modo Cachimbo · La IA también busca señales de captura editada
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 155-yape-lectura-ia.sql y la función leer-yape nueva.
--
--   · Si Gemini ve letras o cifras distintas al resto, borrones,
--     recuadros tapando algo, etc., la compra va a revisión con el
--     motivo «IA: Posible captura editada (…)». No aprueba ni rechaza
--     sola: tú decides.
-- =========================================================

create or replace function public.yape_lectura(p_id bigint, p_usuario uuid, p_datos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.yape_recargas; aj public.yape_ajustes; malo text[] := '{}';
  m numeric; c text; f date; dd text; dn text; op text; otro bigint; dia date;
begin
  select * into r from public.yape_recargas x where x.id = p_id for update;
  -- p_usuario null = un administrador la vuelve a leer desde el panel (solo anota, no decide si ya estaba decidida)
  if r.id is null or (p_usuario is not null and r.usuario is distinct from p_usuario) then raise exception 'yape_no_es_tuya'; end if;
  select * into aj from public.yape_ajustes where id = 1;
  p_datos := coalesce(p_datos, '{}'::jsonb);
  op := nullif(regexp_replace(coalesce(p_datos ->> 'operacion', ''), '\D', '', 'g'), '');
  update public.yape_recargas set lectura = p_datos || jsonb_build_object('leido', now()), operacion = coalesce(op, operacion) where id = r.id;

  if p_datos ? 'error' then
    malo := malo || ('No se pudo leer la captura (' || left(p_datos ->> 'error', 60) || ')');
  else
    begin m := replace(nullif(p_datos ->> 'monto', ''), ',', '.')::numeric; exception when others then m := null; end;
    c := nullif(regexp_replace(coalesce(p_datos ->> 'codigo', ''), '\D', '', 'g'), '');
    begin f := (p_datos ->> 'fecha')::date; exception when others then f := null; end;
    dd := nullif(regexp_replace(coalesce(p_datos ->> 'destino_digitos', ''), '\D', '', 'g'), '');
    dn := nullif(trim(coalesce(p_datos ->> 'destinatario', '')), '');
    dia := (r.creado at time zone 'America/Lima')::date;
    if coalesce((p_datos ->> 'es_yape')::boolean, true) = false then malo := malo || 'No parece una captura de Yape'::text; end if;
    -- Señales de edición (letras distintas, cifras desalineadas, borrones…). No es infalible: solo la manda a revisión
    if lower(coalesce(p_datos ->> 'editada', 'false')) = 'true' then
      malo := malo || ('Posible captura editada' || coalesce(' (' || left(nullif(trim(p_datos ->> 'senales'), ''), 80) || ')', ''));
    end if;
    if m is null then malo := malo || 'No se leyó el monto'::text;
    elsif abs(m - r.monto) > 0.001 then malo := malo || ('La captura dice S/ ' || public.yape_sol(m) || ', pidió S/ ' || public.yape_sol(r.monto)); end if;
    if c is null then malo := malo || 'No se leyó el código de seguridad'::text;
    elsif c <> r.codigo then malo := malo || ('Código en la captura: ' || c || ' (escribió ' || r.codigo || ')'); end if;
    if dd is not null and right(dd, 3) <> aj.destino then malo := malo || ('Yapeó a otro número (***' || right(dd, 3) || ')');
    elsif dd is null and dn is not null and dn not ilike (aj.destino_nombre || '%') then malo := malo || ('Yapeó a otra persona (' || left(dn, 30) || ')'); end if;
    if f is not null and (f > dia + 1 or f < dia - 2) then malo := malo || ('Captura de otra fecha (' || to_char(f, 'DD/MM/YYYY') || ')'); end if;
    if op is not null then
      select x.id into otro from public.yape_recargas x where x.id <> r.id and x.operacion = op and x.estado <> 'rechazada' limit 1;
      if otro is not null then malo := malo || ('Esa captura ya se usó en la compra #' || otro); end if;
    end if;
  end if;

  if r.ia_pend and r.estado = 'esperando' then
    update public.yape_recargas set ia_pend = false where id = r.id;
    if cardinality(malo) = 0 then
      perform public.yape_acreditar(r.id, 'ia', null);
    else
      update public.yape_recargas set estado = 'revision', motivo = 'IA: ' || array_to_string(malo, ' · ') where id = r.id;
    end if;
    perform public.yape_notificar(r.id);
  elsif cardinality(malo) > 0 and r.estado in ('esperando', 'revision') then
    update public.yape_recargas set motivo = left(coalesce(nullif(regexp_replace(coalesce(motivo, ''), '( · )?IA: .*$', ''), '') || ' · ', '') || 'IA: ' || array_to_string(malo, ' · '), 300) where id = r.id;
  end if;
  return jsonb_build_object('ok', true, 'problemas', to_jsonb(malo));
end $$;
revoke all on function public.yape_lectura(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.yape_lectura(bigint, uuid, jsonb) to service_role;

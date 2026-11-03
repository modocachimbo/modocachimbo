-- =========================================================
-- Modo Cachimbo · Las Descargas PDF se venden aparte
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 53-descargas-pdf.sql.
--
--   · Antes, el Acceso total (TODO-VIP) también abría las descargas.
--     Ahora solo las abre el paquete descarga-VIP. Un código puede
--     llevar los dos: "TODO-VIP,descarga-VIP".
--   · Siguen pudiendo descargar el equipo (admin o permiso "descargas")
--     y todos cuando el panel tiene "Abierto para todos".
-- =========================================================

-- ¿Tiene este alumno el paquete de descargas en su cuenta?
create or replace function public.descarga_con_codigo(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.codigos_cuenta c
    where c.usuario = uid and c.quitado is null
      and c.producto ~ '(^|,)descarga-VIP(,|$)'
      and (c.vence is null or c.vence = '' or c.vence >= to_char((now() at time zone 'America/Lima')::date, 'YYYY-MM-DD')))
$$;
revoke all on function public.descarga_con_codigo(uuid) from public, anon, authenticated;

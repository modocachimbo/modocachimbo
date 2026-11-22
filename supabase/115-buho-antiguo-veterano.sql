-- =========================================================
-- Modo Cachimbo · El Búho Antiguo pasa a ser de veteranos.
-- Antes venía gratis con toda cuenta. Ahora:
--   1) Se le da para siempre a todas las cuentas que ya existen.
--   2) Las cuentas nuevas ya no lo reciben (regla "evento", cinta Veterano).
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Necesita 31-coleccion.sql y 35-buho-antiguo.sql. Se puede correr más
-- de una vez (no duplica nada).
-- =========================================================

-- 1) A todos los que ya tienen cuenta: suyo para siempre
insert into public.coleccion_mia (usuario, item, origen, mensaje)
select u.id, 'buho-antiguo', 'evento', 'Veterano de Modo Cachimbo'
from auth.users u
where u.created_at < now()
on conflict (usuario, item) do nothing;

-- 2) Desde ahora no viene con la cuenta
update public.coleccion_item
set regla = '{"tipo":"evento","evento":"los primeros días de Modo Cachimbo","cinta":"Veterano"}'::jsonb
where id = 'buho-antiguo';

-- Revisión: cuántos veteranos lo tienen
select count(*) as veteranos_con_buho_antiguo from public.coleccion_mia where item = 'buho-antiguo';

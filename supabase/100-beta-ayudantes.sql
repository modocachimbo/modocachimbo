-- =========================================================
-- Modo Cachimbo · Los ayudantes también ven la beta
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 80-arcade-beta.sql y 14-equipo.sql.
--
--   · Mientras el Arcade y el Laboratorio estén en beta, los ven:
--     tú (admin), el grupo influencer y ahora también los
--     ayudantes ACTIVOS del panel (Equipo).
--   · Si desactivas a un ayudante, deja de verlo.
-- =========================================================

create or replace function public.arcade_acceso()
returns boolean language sql stable security definer set search_path = '' as $$
  select case coalesce((select a.valor #>> '{}' from public.ajustes a where a.clave = 'arcade'), 'beta')
    when 'todos' then true
    when 'apagado' then false
    else public.es_admin()
      or exists (select 1 from public.grupo_miembro g where g.usuario = auth.uid() and g.grupo = 'influencer')
      or exists (select 1 from public.equipo e where e.email = lower(auth.jwt() ->> 'email') and e.activo)
  end;
$$;
revoke all on function public.arcade_acceso() from public, anon;
grant execute on function public.arcade_acceso() to authenticated;

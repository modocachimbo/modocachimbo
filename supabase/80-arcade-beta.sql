-- =========================================================
-- Modo Cachimbo · Arcade en beta
-- Mientras está en prueba, el Arcade (arcade.html y sus botones en el inicio)
-- solo lo ven los administradores y los influencers (grupo_miembro,
-- supabase/64-influencers.sql). Para abrirlo a todos más adelante:
--   update public.ajustes set valor = '"todos"' where clave = 'arcade';
-- (con 'beta' vuelve a ser solo admin + influencers; con 'apagado', nadie)
-- =========================================================
insert into public.ajustes (clave, valor) values ('arcade', '"beta"'::jsonb)
on conflict (clave) do nothing;

create or replace function public.arcade_acceso()
returns boolean language sql stable security definer set search_path = '' as $$
  select case coalesce((select a.valor #>> '{}' from public.ajustes a where a.clave = 'arcade'), 'beta')
    when 'todos' then true
    when 'apagado' then false
    else public.es_admin()
      or exists (select 1 from public.grupo_miembro g where g.usuario = auth.uid() and g.grupo = 'influencer')
  end;
$$;
revoke all on function public.arcade_acceso() from public, anon;
grant execute on function public.arcade_acceso() to authenticated;

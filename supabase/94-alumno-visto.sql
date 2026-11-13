-- =========================================================
-- Modo Cachimbo · «Activo hoy» del Grupo VIP (Panel → Regalos)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 93-grupo-vip.sql.
--
--   · alumno_visto: la última vez que el alumno abrió la web
--     (assets/auth.js llama a marcar_visto() al entrar, como mucho
--     una vez cada 10 minutos). Antes solo se veía el último inicio de
--     sesión con Google, que no cambia si la sesión ya estaba abierta.
--   · grupo_regalo_ver ahora usa lo más reciente entre: abrió la web,
--     inició sesión o practicó.
-- =========================================================

create table if not exists public.alumno_visto (
  usuario uuid primary key references auth.users (id) on delete cascade,
  visto   timestamptz not null default now()
);
alter table public.alumno_visto enable row level security;
-- Nadie lee ni escribe la tabla directo: solo con las funciones de abajo

create or replace function public.marcar_visto()
returns void language plpgsql volatile security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then return; end if;
  insert into public.alumno_visto (usuario, visto) values (u, now())
  on conflict (usuario) do update set visto = now()
   where public.alumno_visto.visto < now() - interval '5 minutes';
end $$;
revoke all on function public.marcar_visto() from public, anon;
grant execute on function public.marcar_visto() to authenticated;

create or replace function public.grupo_regalo_ver(p_grupo text default 'vip')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'miembros', coalesce((select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'apodo', public.duelo_apodo(g.usuario),
        'email', (select lower(a.email) from auth.users a where a.id = g.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'),
        -- Última vez que se le vio: abrió la web, entró con Google o practicó (lo más reciente)
        'visto', greatest((select v.visto from public.alumno_visto v where v.usuario = g.usuario),
                          (select a.last_sign_in_at from auth.users a where a.id = g.usuario),
                          (select (max(x.fecha) + time '12:00') at time zone 'America/Lima' from public.actividad x where x.usuario = g.usuario and x.preguntas > 0)))
        order by g.agregado, j.codigo)
      from public.regalo_grupo g join public.jugador_id j on j.usuario = g.usuario
     where g.grupo = p_grupo), '[]'::jsonb),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'cantidad', e.cantidad, 'item', e.item, 'nota', e.nota,
        'recibieron', e.recibieron, 'saltados', e.saltados, 'de', coalesce(e.de_nombre, e.de_email), 'creado', e.creado) order by e.id desc)
      from (select * from public.regalo_grupo_envio x where x.grupo = p_grupo order by x.id desc limit 10) e), '[]'::jsonb));
end $$;
revoke all on function public.grupo_regalo_ver(text) from public, anon;
grant execute on function public.grupo_regalo_ver(text) to authenticated;

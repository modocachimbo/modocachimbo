-- =========================================================
-- Modo Cachimbo · Partida guardada en la cuenta
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
--
--   · Repaso, Fijas y Repaso mixto guardan la partida a medias en la
--     cuenta (además del teléfono), así el alumno sigue donde quedó en
--     cualquier dispositivo.
--   · Una fila por alumno y por página (ej. «/fisica/repaso.html?2027-I»);
--     se reemplaza cada vez. La página la manda al salir o al terminar,
--     no en cada respuesta (pocos pedidos).
--   · Dura 3 días, igual que la del teléfono. Al guardar se borran las
--     vencidas de ese alumno.
--   · Cada alumno solo ve y cambia las suyas.
--   · Funciones: partida_guardar, partida_leer, partida_mias, partida_borrar.
-- =========================================================

create table if not exists public.partidas (
  usuario    uuid not null references auth.users (id) on delete cascade,
  pagina     text not null check (length(pagina) between 1 and 200),
  datos      jsonb not null,
  actualizado timestamptz not null default now(),
  primary key (usuario, pagina)
);
alter table public.partidas enable row level security;
-- Sin políticas: solo se entra por las funciones de abajo.

-- Guardar (reemplaza la de esa página). datos = lo mismo que guarda el teléfono
-- (assets/partida.js): { t, q: [[clave, orden], ...], e: { current, score, lives, answers } }
create or replace function public.partida_guardar(p_pagina text, p_datos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if p_pagina is null or length(p_pagina) not between 1 and 200 then raise exception 'pagina_invalida'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then raise exception 'datos_invalidos'; end if;
  if length(p_datos::text) > 60000 then raise exception 'partida_muy_grande'; end if;
  delete from public.partidas where usuario = uid and actualizado < now() - interval '3 days';
  insert into public.partidas (usuario, pagina, datos, actualizado) values (uid, p_pagina, p_datos, now())
  on conflict (usuario, pagina) do update set datos = excluded.datos, actualizado = now();
  return jsonb_build_object('ok', true);
end $$;

-- Leer la de esa página (null si no hay o venció)
create or replace function public.partida_leer(p_pagina text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select p.datos || jsonb_build_object('guardada', p.actualizado)
  from public.partidas p
  where p.usuario = auth.uid() and p.pagina = p_pagina and p.actualizado > now() - interval '3 days'
$$;

-- Todas las del alumno (al abrir una práctica el teléfono se pone al día con la nube)
create or replace function public.partida_mias()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('pagina', p.pagina, 'datos', p.datos)), '[]'::jsonb)
  from public.partidas p
  where p.usuario = auth.uid() and p.actualizado > now() - interval '3 days'
$$;

-- Borrar (terminó la partida o empezó de nuevo)
create or replace function public.partida_borrar(p_pagina text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.partidas where usuario = auth.uid() and pagina = p_pagina;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.partida_guardar(text, jsonb) from public, anon;
revoke all on function public.partida_leer(text) from public, anon;
revoke all on function public.partida_borrar(text) from public, anon;
revoke all on function public.partida_mias() from public, anon;
grant execute on function public.partida_mias() to authenticated;
grant execute on function public.partida_guardar(text, jsonb) to authenticated;
grant execute on function public.partida_leer(text) to authenticated;
grant execute on function public.partida_borrar(text) to authenticated;

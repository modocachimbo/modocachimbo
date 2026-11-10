-- =========================================================
-- Modo Cachimbo · Avance del ciclo (panel → pestaña "Avance del ciclo")
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Se puede volver a correr sin problema.
--
--   · avance_marcas: quién está subiendo (o reservó con "Lo hago yo") cada
--     curso + sección + ciclo + semana. "Subiendo" vence solo a los 15 min sin
--     señal; "Lo hago yo" queda hasta que lo liberen o lo publiquen.
--   · ajustes 'avance': ciclo y semana actual que ve todo el equipo.
--   Lo que ya está subido NO se guarda aquí: el panel lo lee de los archivos.
--   Pueden usarlo los admins y los ayudantes con permiso de Subir tema.
-- =========================================================
create table if not exists public.avance_marcas (
  curso       text not null check (char_length(curso) <= 40),
  seccion     text not null check (seccion in ('libros', 'seminarios', 'banqueo')),
  ciclo       text not null check (char_length(ciclo) <= 12),
  tema        text not null check (char_length(tema) <= 4),
  estado      text not null check (estado in ('subiendo', 'reservado')),
  email       text not null default '',
  nombre      text not null default '',
  actualizado timestamptz not null default now(),
  primary key (curso, seccion, ciclo, tema)
);
alter table public.avance_marcas enable row level security;
revoke all on public.avance_marcas from anon, authenticated;

insert into public.ajustes (clave, valor) values ('avance', '{"ciclo": "2027-I", "semana": 8, "semanas": 10}'::jsonb)
on conflict (clave) do nothing;

create or replace function public.avance_quien()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif((select e.nombre from public.equipo e where e.email = lower(auth.jwt() ->> 'email')), ''),
                  split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1));
$$;
revoke all on function public.avance_quien() from public, anon;

-- Ciclo y semana actual + las marcas vigentes del ciclo
create or replace function public.avance_estado(p_ciclo text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare cfg jsonb; c text;
begin
  if not public.puede('subir') then raise exception 'Sin permiso'; end if;
  select a.valor into cfg from public.ajustes a where a.clave = 'avance';
  cfg := coalesce(cfg, '{"ciclo": "2027-I", "semana": 8, "semanas": 10}'::jsonb);
  c := coalesce(nullif(p_ciclo, ''), cfg ->> 'ciclo');
  return jsonb_build_object('cfg', cfg, 'yo', lower(coalesce(auth.jwt() ->> 'email', '')), 'marcas', coalesce((
    select jsonb_agg(jsonb_build_object('curso', m.curso, 'seccion', m.seccion, 'tema', m.tema, 'estado', m.estado,
             'email', m.email, 'nombre', m.nombre, 'hace', extract(epoch from now() - m.actualizado)::int))
      from public.avance_marcas m
     where m.ciclo = c and (m.estado = 'reservado' or m.actualizado > now() - interval '15 minutes')), '[]'::jsonb));
end $$;
revoke all on function public.avance_estado(text) from public, anon;
grant execute on function public.avance_estado(text) to authenticated;

-- Marcar "subiendo" (señal cada minuto mientras se sube) o "reservado" (Lo hago yo).
-- No pisa la marca de otra persona salvo que esté vencida. Devuelve la marca que queda.
create or replace function public.avance_marcar(p_curso text, p_seccion text, p_ciclo text, p_tema text, p_estado text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.avance_marcas; yo text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if not public.puede('subir') then raise exception 'Sin permiso'; end if;
  select * into m from public.avance_marcas a where a.curso = p_curso and a.seccion = p_seccion and a.ciclo = p_ciclo and a.tema = p_tema;
  if found and m.email <> yo and (m.estado = 'reservado' or m.actualizado > now() - interval '15 minutes') then
    return jsonb_build_object('ok', false, 'nombre', m.nombre, 'estado', m.estado, 'hace', extract(epoch from now() - m.actualizado)::int);
  end if;
  insert into public.avance_marcas (curso, seccion, ciclo, tema, estado, email, nombre, actualizado)
  values (p_curso, p_seccion, p_ciclo, p_tema,
          -- si ya lo reservé, seguir subiendo no le quita la reserva
          case when found and m.email = yo and m.estado = 'reservado' and p_estado = 'subiendo' then 'reservado' else p_estado end,
          yo, public.avance_quien(), now())
  on conflict (curso, seccion, ciclo, tema) do update
    set estado = excluded.estado, email = excluded.email, nombre = excluded.nombre, actualizado = excluded.actualizado;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.avance_marcar(text, text, text, text, text) from public, anon;
grant execute on function public.avance_marcar(text, text, text, text, text) to authenticated;

-- Liberar: la propia marca (o cualquiera si eres admin)
create or replace function public.avance_soltar(p_curso text, p_seccion text, p_ciclo text, p_tema text)
returns void language sql security definer set search_path = '' as $$
  delete from public.avance_marcas a
   where a.curso = p_curso and a.seccion = p_seccion and a.ciclo = p_ciclo and a.tema = p_tema
     and public.puede('subir') and (a.email = lower(coalesce(auth.jwt() ->> 'email', '')) or public.es_admin());
$$;
revoke all on function public.avance_soltar(text, text, text, text) from public, anon;
grant execute on function public.avance_soltar(text, text, text, text) to authenticated;

-- Cambiar ciclo / semana actual / número de semanas (solo admin)
create or replace function public.avance_cfg_guardar(p_ciclo text, p_semana int, p_semanas int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador'; end if;
  insert into public.ajustes (clave, valor)
  values ('avance', jsonb_build_object('ciclo', p_ciclo, 'semana', greatest(1, least(p_semana, 30)), 'semanas', greatest(1, least(p_semanas, 30))))
  on conflict (clave) do update set valor = excluded.valor;
end $$;
revoke all on function public.avance_cfg_guardar(text, int, int) from public, anon;
grant execute on function public.avance_cfg_guardar(text, int, int) to authenticated;

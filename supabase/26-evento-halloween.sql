-- =========================================================
-- Modo Cachimbo · Evento "Noche de Brujas" (Halloween 2026)
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- Va después de 20-misiones-canjes.sql y 25-tematicas.sql.
--
-- Mientras la temática Halloween está activa (fechas del panel):
--   · cada misión del día cumplida = 1 calabaza
--   · las 3 misiones del día = +1 calabaza extra (día perfecto)
--   · el simulacro del día = +1 calabaza
-- Con las calabazas se canjean pines, disfraces del búho y un marco.
-- El pin dorado "Superviviente" no se compra: sale solo con 7 días perfectos.
-- Los premios quedan para siempre, aunque el evento termine.
-- =========================================================

create table if not exists public.evento_alumno (
  usuario   uuid not null references auth.users (id) on delete cascade,
  evento    text not null,
  dias      jsonb not null default '{}'::jsonb,   -- {"2026-10-24": {"m": 2, "s": true}, ...}
  premios   text[] not null default '{}',
  disfraz   text,
  actualizado timestamptz not null default now(),
  primary key (usuario, evento)
);
alter table public.evento_alumno enable row level security;
revoke all on public.evento_alumno from anon, authenticated;

-- Catálogo con precios (en calabazas). La web lo muestra, pero el precio que vale es este.
create or replace function public.ev_precio(p text)
returns integer language sql immutable set search_path = '' as $$
  select case p
    when 'pin-calabaza'   then 2
    when 'pin-murcielago' then 3
    when 'pin-fantasma'   then 5
    when 'pin-telarana'   then 7
    when 'marco-telarana' then 4
    when 'disfraz-capa'   then 5
    when 'disfraz-sabana' then 6
    when 'disfraz-calabaza' then 8
  end;
$$;

create or replace function public.ev_calabazas(d jsonb)
returns integer language sql immutable set search_path = '' as $$
  select coalesce(sum(least((v ->> 'm')::int, 3) + case when (v ->> 'm')::int >= 3 then 1 else 0 end
                      + case when (v ->> 's')::boolean then 1 else 0 end), 0)::int
    from jsonb_each(coalesce(d, '{}'::jsonb)) as e(k, v);
$$;

-- Estado del evento del alumno. Si el evento está activo, primero anota lo que cumplió en sus misiones.
create or replace function public.evento_estado()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  ev  text := 'halloween-2026';
  t   public.tematica;
  hoy date := (now() at time zone 'America/Lima')::date;
  activo boolean;
  c   public.corazones;
  r   public.evento_alumno;
  m   integer;
  dia text;
  perfectos integer;
  ganadas integer;
  gastadas integer;
begin
  if uid is null then raise exception 'no autorizado'; end if;
  select * into t from public.tematica where id = 1;
  activo := t.tema = 'halloween' and (t.inicio is null or t.inicio <= hoy) and (t.fin is null or t.fin >= hoy);

  insert into public.evento_alumno (usuario, evento) values (uid, ev) on conflict do nothing;
  select * into r from public.evento_alumno where usuario = uid and evento = ev for update;

  if activo then
    -- Las misiones guardadas son del día r.dia: se anotan a ese día si cae dentro del evento
    select * into c from public.corazones where usuario = uid;
    if found and (t.inicio is null or c.dia >= t.inicio) and (t.fin is null or c.dia <= t.fin) then
      select count(*) into m from jsonb_array_elements(c.misiones) e where e ->> 'estado' in ('lista', 'cobrada');
      dia := c.dia::text;
      r.dias := r.dias || jsonb_build_object(dia, jsonb_build_object(
        'm', greatest(m, coalesce((r.dias -> dia ->> 'm')::int, 0)),
        's', c.simulacro <> 'pend' or coalesce((r.dias -> dia ->> 's')::boolean, false)));
    end if;
  end if;

  select count(*) into perfectos from jsonb_each(r.dias) e(k, v) where (v ->> 'm')::int >= 3;
  if perfectos >= 7 and not ('pin-superviviente' = any (r.premios)) then
    r.premios := r.premios || 'pin-superviviente'::text;
  end if;
  update public.evento_alumno set dias = r.dias, premios = r.premios, actualizado = now() where usuario = uid and evento = ev;

  ganadas := public.ev_calabazas(r.dias);
  select coalesce(sum(public.ev_precio(p)), 0) into gastadas from unnest(r.premios) p;
  return jsonb_build_object(
    'evento', ev, 'activo', activo, 'inicio', t.inicio, 'fin', t.fin, 'hoy', hoy,
    'dias', r.dias, 'perfectos', perfectos, 'ganadas', ganadas, 'gastadas', gastadas, 'saldo', ganadas - gastadas,
    'premios', to_jsonb(r.premios), 'disfraz', r.disfraz,
    'misiones', case when activo and c.dia = hoy then c.misiones else null end,
    'simulacro', case when activo and c.dia = hoy then c.simulacro else null end);
end $$;
revoke all on function public.evento_estado() from public, anon;
grant execute on function public.evento_estado() to authenticated;

-- Canjear un premio con calabazas (solo mientras el evento está activo)
create or replace function public.evento_canjear(p_premio text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  e   jsonb;
  precio integer := public.ev_precio(p_premio);
begin
  if uid is null then raise exception 'no autorizado'; end if;
  if precio is null then raise exception 'premio desconocido'; end if;
  e := public.evento_estado();
  if not (e ->> 'activo')::boolean then raise exception 'el evento no está activo'; end if;
  if e -> 'premios' ? p_premio then return e; end if;
  if (e ->> 'saldo')::int < precio then raise exception 'te faltan calabazas'; end if;
  update public.evento_alumno set premios = premios || p_premio, actualizado = now()
   where usuario = uid and evento = 'halloween-2026';
  return public.evento_estado();
end $$;
revoke all on function public.evento_canjear(text) from public, anon;
grant execute on function public.evento_canjear(text) to authenticated;

-- Ponerle un disfraz al búho (el sombrero de bruja es gratis; null = sin disfraz)
create or replace function public.evento_disfraz(p_disfraz text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'no autorizado'; end if;
  if p_disfraz is not null and p_disfraz <> 'disfraz-gorro' and not exists (
       select 1 from public.evento_alumno where usuario = uid and evento = 'halloween-2026' and p_disfraz = any (premios)) then
    raise exception 'todavía no tienes ese disfraz';
  end if;
  insert into public.evento_alumno (usuario, evento, disfraz) values (uid, 'halloween-2026', p_disfraz)
  on conflict (usuario, evento) do update set disfraz = excluded.disfraz, actualizado = now();
  return public.evento_estado();
end $$;
revoke all on function public.evento_disfraz(text) from public, anon;
grant execute on function public.evento_disfraz(text) to authenticated;

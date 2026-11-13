-- =========================================================
-- Modo Cachimbo · Grupo VIP (Panel → Alumnos → Regalos → Grupo VIP)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 43-ayudantes-regalos.sql y 44-xp-regalo-rango.sql.
--
--   · regalo_grupo: los alumnos del grupo (se guardan por cuenta, así
--     que siguen ahí aunque cambies algo de su perfil).
--   · regalo_grupo_envio: cada regalo que diste a todo el grupo.
--   · grupo_regalo_ver(grupo): la lista y los últimos regalos al grupo.
--   · grupo_regalo_guardar(grupo, ids): guarda la lista de IDs de 5 cifras.
--   · grupo_regalo_dar(grupo, tipo, cantidad, ítem, nota): el mismo regalo
--     a todos de una vez. Cada alumno ve su aviso como un regalo normal.
--   Lo usan los admins y los ayudantes con el permiso «Regalos».
-- =========================================================

create table if not exists public.regalo_grupo (
  grupo    text not null default 'vip' check (char_length(grupo) between 1 and 40),
  usuario  uuid not null references auth.users (id) on delete cascade,
  agregado timestamptz not null default now(),
  por      text,
  primary key (grupo, usuario)
);
alter table public.regalo_grupo enable row level security;

create table if not exists public.regalo_grupo_envio (
  id         bigserial primary key,
  grupo      text not null,
  tipo       text not null,
  cantidad   integer,
  item       text,
  nota       text,
  recibieron integer not null default 0,
  saltados   integer not null default 0,
  de_email   text,
  de_nombre  text,
  creado     timestamptz not null default now()
);
create index if not exists regalo_grupo_envio_grupo on public.regalo_grupo_envio (grupo, creado desc);
alter table public.regalo_grupo_envio enable row level security;
-- Nadie lee ni escribe estas tablas directo: solo con las funciones de abajo

-- Da un regalo a una cuenta (lo mismo que regalar(), sin buscar ni anotar).
-- Devuelve false si ya tenía ese ítem.
create or replace function public.regalo_aplicar(u uuid, p_tipo text, n integer, p_item text, nota text, yo text, nom text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.cz_estado(u);
  if p_tipo = 'corazones' then
    update public.corazones set extra = least(extra + n, 999), actualizado = now() where usuario = u;
  elsif p_tipo = 'infinito' then
    update public.corazones set infinito_hasta = greatest(coalesce(infinito_hasta, now()), now()) + n * interval '1 hour', actualizado = now()
     where usuario = u;
  elsif p_tipo = 'xp' then
    insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), n)
    on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
    update public.corazones set xp_saldo = xp_saldo + n, actualizado = now() where usuario = u;
  elsif p_tipo = 'item' then
    insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, p_item, 'regalo', nota)
    on conflict (usuario, item) do nothing;
    if not found then return false; end if;
  end if;
  insert into public.regalos (usuario, tipo, cantidad, item, nota, de_email, de_nombre)
  values (u, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, yo, nom);
  return true;
end $$;
revoke all on function public.regalo_aplicar(uuid, text, integer, text, text, text, text) from public, anon, authenticated;

-- ---------- Ver el grupo ----------
create or replace function public.grupo_regalo_ver(p_grupo text default 'vip')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'miembros', coalesce((select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'apodo', public.duelo_apodo(g.usuario),
        'email', (select lower(a.email) from auth.users a where a.id = g.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = g.usuario and p.foto_url like 'https://%'))
        order by g.agregado, j.codigo)
      from public.regalo_grupo g join public.jugador_id j on j.usuario = g.usuario
     where g.grupo = p_grupo), '[]'::jsonb),
    'envios', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'cantidad', e.cantidad, 'item', e.item, 'nota', e.nota,
        'recibieron', e.recibieron, 'saltados', e.saltados, 'de', coalesce(e.de_nombre, e.de_email), 'creado', e.creado) order by e.id desc)
      from (select * from public.regalo_grupo_envio x where x.grupo = p_grupo order by x.id desc limit 10) e), '[]'::jsonb));
end $$;
revoke all on function public.grupo_regalo_ver(text) from public, anon;
grant execute on function public.grupo_regalo_ver(text) to authenticated;

-- ---------- Guardar la lista de IDs (reemplaza la anterior) ----------
create or replace function public.grupo_regalo_guardar(p_grupo text, p_codigos integer[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  yo  text := lower(auth.jwt() ->> 'email');
  faltan jsonb;
  n   integer;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_grupo is null or char_length(p_grupo) not between 1 and 40 then raise exception 'nombre de grupo no válido'; end if;
  if coalesce(array_length(p_codigos, 1), 0) > 1000 then raise exception 'Máximo 1000 alumnos por grupo'; end if;
  select coalesce(jsonb_agg(c), '[]'::jsonb) into faltan
    from (select distinct c from unnest(coalesce(p_codigos, '{}')) c
           where not exists (select 1 from public.jugador_id j where j.codigo = c) order by c) t;
  delete from public.regalo_grupo g
   where g.grupo = p_grupo
     and g.usuario not in (select j.usuario from public.jugador_id j where j.codigo = any (coalesce(p_codigos, '{}')));
  insert into public.regalo_grupo (grupo, usuario, por)
  select p_grupo, j.usuario, yo from public.jugador_id j where j.codigo = any (coalesce(p_codigos, '{}'))
  on conflict (grupo, usuario) do nothing;
  select count(*) into n from public.regalo_grupo g where g.grupo = p_grupo;
  perform public.anotar('Regalos', 'Guardó el grupo ' || upper(p_grupo) || ' con ' || n || ' alumnos', jsonb_build_object('grupo', p_grupo, 'alumnos', n));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('no_existen', faltan);
end $$;
revoke all on function public.grupo_regalo_guardar(text, integer[]) from public, anon;
grant execute on function public.grupo_regalo_guardar(text, integer[]) to authenticated;

-- ---------- Regalar a todo el grupo ----------
create or replace function public.grupo_regalo_dar(p_grupo text, p_tipo text, p_cantidad integer default null, p_item text default null, p_nota text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  n    integer := coalesce(p_cantidad, 0);
  nota text := nullif(left(trim(coalesce(p_nota, '')), 140), '');
  yo   text := lower(auth.jwt() ->> 'email');
  nom  text;
  ok   integer := 0;
  sal  integer := 0;
  u    uuid;
  txt  text;
begin
  if not public.puede('regalos') then raise exception 'no autorizado'; end if;
  if p_tipo = 'corazones' then
    if n < 1 or n > 50 then raise exception 'Elige de 1 a 50 corazones'; end if;
    txt := n || ' corazón' || case when n = 1 then '' else 'es' end;
  elsif p_tipo = 'infinito' then
    if n < 1 or n > 720 then raise exception 'Elige de 1 hora a 30 días'; end if;
    txt := 'corazones infinitos por ' || case when n % 24 = 0 then (n / 24) || ' día' || case when n = 24 then '' else 's' end
                                             else n || ' hora' || case when n = 1 then '' else 's' end end;
  elsif p_tipo = 'xp' then
    if n < 1 or n > 10000 then raise exception 'Elige de 1 a 10 000 XP'; end if;
    txt := n || ' XP';
  elsif p_tipo = 'item' then
    if not exists (select 1 from public.coleccion_item i where i.id = p_item) then raise exception 'Ese ítem no existe'; end if;
    txt := 'el ítem ' || coalesce((select i.nom from public.coleccion_item i where i.id = p_item), p_item);
  else
    raise exception 'tipo de regalo no válido';
  end if;
  if not exists (select 1 from public.regalo_grupo g where g.grupo = p_grupo) then raise exception 'El grupo está vacío'; end if;
  select e.nombre into nom from public.equipo e where e.email = yo;
  for u in select g.usuario from public.regalo_grupo g where g.grupo = p_grupo loop
    if public.regalo_aplicar(u, p_tipo, n, case when p_tipo = 'item' then p_item end, nota, yo, nom) then ok := ok + 1; else sal := sal + 1; end if;
  end loop;
  insert into public.regalo_grupo_envio (grupo, tipo, cantidad, item, nota, recibieron, saltados, de_email, de_nombre)
  values (p_grupo, p_tipo, case when p_tipo = 'item' then null else n end, case when p_tipo = 'item' then p_item end, nota, ok, sal, yo, nom);
  perform public.anotar('Regalos', 'Regaló ' || txt || ' al grupo ' || upper(p_grupo) || ' (' || ok || ' alumnos)',
    jsonb_build_object('grupo', p_grupo, 'tipo', p_tipo, 'cantidad', n, 'item', p_item, 'nota', nota, 'recibieron', ok, 'saltados', sal));
  return public.grupo_regalo_ver(p_grupo) || jsonb_build_object('recibieron', ok, 'saltados', sal);
end $$;
revoke all on function public.grupo_regalo_dar(text, text, integer, text, text) from public, anon;
grant execute on function public.grupo_regalo_dar(text, text, integer, text, text) to authenticated;

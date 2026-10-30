-- =========================================================
-- Modo Cachimbo · Reseñas de la app
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 14-equipo.sql (puede, anotar), 38-ver-jugador.sql (jugador_codigo)
-- y 43-ayudantes-regalos.sql (permisos_validos).
--
--   · Cada alumno deja una sola reseña desde su perfil (1 a 5 estrellas y
--     un texto de 20 a 280 letras). Si la edita, vuelve a quedar pendiente.
--   · Ninguna sale en la web hasta que un admin (o un ayudante con el
--     permiso «Reseñas») la publica desde el panel → Reseñas.
--   · resenas_publicas(): las publicadas, para el slider de la bienvenida
--     (sin sesión) y del inicio. Solo manda apodo, foto, lo que lleva
--     puesto, rango de la semana e ID. Nunca el correo ni el nombre.
-- =========================================================

create table if not exists public.resenas (
  id         serial primary key,
  usuario    uuid not null unique references auth.users (id) on delete cascade,
  estrellas  smallint not null check (estrellas between 1 and 5),
  texto      text not null check (char_length(texto) between 20 and 280),
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'publicada', 'oculta')),
  destacada  boolean not null default false,
  orden      int not null default 0,
  creada     timestamptz not null default now(),
  editada    timestamptz not null default now(),
  revisada   timestamptz,
  revisor    text
);
-- Sin políticas: todo pasa por las funciones de abajo
alter table public.resenas enable row level security;

-- El permiso «resenas» para los ayudantes (la lista de 43 más este)
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos','topxp','agenda','tematicas',
               'recursos','biblioteca','regalos','resenas'];
$$;

/* ---------- Alumno ---------- */

-- Mi reseña (null si aún no dejé una)
create or replace function public.mi_resena()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'estrellas', r.estrellas, 'texto', r.texto, 'estado', r.estado, 'editada', r.editada)
    from public.resenas r where r.usuario = auth.uid();
$$;
revoke all on function public.mi_resena() from public, anon;
grant execute on function public.mi_resena() to authenticated;

-- Escribir o editar mi reseña: queda pendiente hasta que la revisen
create or replace function public.guardar_resena(p_estrellas integer, p_texto text, p_acepto boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); tx text := regexp_replace(btrim(coalesce(p_texto, '')), '\s+', ' ', 'g'); antes public.resenas;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if not coalesce(p_acepto, false) then raise exception 'falta aceptar'; end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then raise exception 'estrellas no válidas'; end if;
  if char_length(tx) < 20 then raise exception 'texto muy corto'; end if;
  if char_length(tx) > 280 then raise exception 'texto muy largo'; end if;
  select * into antes from public.resenas r where r.usuario = uid;
  -- Sin cambios: se queda como estaba (no vuelve a pendiente)
  if antes.id is not null and antes.estrellas = p_estrellas and antes.texto = tx then return public.mi_resena(); end if;
  -- Un respiro entre cambios (doble toque en Enviar)
  if antes.id is not null and antes.editada > now() - interval '8 seconds' then raise exception 'espera un momento'; end if;
  perform public.jugador_codigo(uid);  -- su ID de 5 dígitos, para mostrarlo en la tarjeta
  insert into public.resenas (usuario, estrellas, texto)
  values (uid, p_estrellas, tx)
  on conflict (usuario) do update set estrellas = excluded.estrellas, texto = excluded.texto,
    estado = 'pendiente', destacada = false, editada = now(), revisada = null, revisor = null;
  return public.mi_resena();
end $$;
revoke all on function public.guardar_resena(integer, text, boolean) from public, anon;
grant execute on function public.guardar_resena(integer, text, boolean) to authenticated;

-- Borrar mi reseña
create or replace function public.borrar_mi_resena()
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.resenas where usuario = auth.uid();
$$;
revoke all on function public.borrar_mi_resena() from public, anon;
grant execute on function public.borrar_mi_resena() to authenticated;

/* ---------- Slider (bienvenida e inicio) ---------- */

-- Las publicadas: destacadas primero, luego el orden del panel y las más nuevas.
-- Abierta también sin sesión (la bienvenida).
create or replace function public.resenas_publicas()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'promedio', (select round(avg(r.estrellas)::numeric, 1) from public.resenas r where r.estado = 'publicada'),
    'total', (select count(*) from public.resenas r where r.estado = 'publicada'),
    'lista', coalesce((select jsonb_agg(t.x order by t.destacada desc, t.orden, t.id desc) from (
      select r.id, r.destacada, r.orden, jsonb_build_object(
        'id', r.id, 'estrellas', r.estrellas, 'texto', r.texto, 'creada', r.creada,
        'apodo', public.duelo_apodo(r.usuario),
        'foto', (select p.foto_url from public.perfiles p where p.id = r.usuario and p.foto_url like 'https://%'),
        'avatar', c.puesto ->> 'avatar', 'marco', c.puesto ->> 'marco', 'fondo', c.puesto ->> 'racha',
        'codigo', j.codigo,
        'xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = r.usuario and x.semana = public.cz_lunes()), 0)
      ) as x
      from public.resenas r
      left join public.coleccion_puesto c on c.usuario = r.usuario
      left join public.jugador_id j on j.usuario = r.usuario
      where r.estado = 'publicada'
      order by r.destacada desc, r.orden, r.id desc
      limit 30) t), '[]'::jsonb)
  );
$$;
revoke all on function public.resenas_publicas() from public;
grant execute on function public.resenas_publicas() to anon, authenticated;

/* ---------- Panel → Reseñas ---------- */

-- Todas, con los datos del alumno para revisarlas, y cuántas hay de cada estado
create or replace function public.resenas_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.puede('resenas') then raise exception 'no autorizado'; end if;
  return jsonb_build_object(
    'cuenta', (select coalesce(jsonb_object_agg(e.estado, e.n), '{}'::jsonb) from (select r.estado, count(*) as n from public.resenas r group by r.estado) e),
    'lista', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'estrellas', r.estrellas, 'texto', r.texto, 'estado', r.estado, 'destacada', r.destacada, 'orden', r.orden,
        'creada', r.creada, 'editada', r.editada, 'revisada', r.revisada, 'revisor', r.revisor,
        'codigo', j.codigo,
        'apodo', public.duelo_apodo(r.usuario),
        'nombre', p.nombre, 'carrera', p.carrera, 'modalidad', p.modalidad,
        'email', (select lower(a.email) from auth.users a where a.id = r.usuario),
        'foto', case when p.foto_url like 'https://%' then p.foto_url end,
        'avatar', c.puesto ->> 'avatar', 'marco', c.puesto ->> 'marco', 'fondo', c.puesto ->> 'racha',
        'xp_total', public.jugador_xp_total(r.usuario),
        'xp_semana', coalesce((select x.xp from public.xp_semana x where x.usuario = r.usuario and x.semana = public.cz_lunes()), 0),
        'alta', (select a.created_at from auth.users a where a.id = r.usuario)
      ) order by case r.estado when 'pendiente' then 0 when 'publicada' then 1 else 2 end,
                 case when r.estado = 'publicada' then r.destacada end desc nulls last,
                 case when r.estado = 'publicada' then r.orden end nulls last,
                 r.editada desc)
      from public.resenas r
      left join public.perfiles p on p.id = r.usuario
      left join public.coleccion_puesto c on c.usuario = r.usuario
      left join public.jugador_id j on j.usuario = r.usuario), '[]'::jsonb)
  );
end $$;
revoke all on function public.resenas_admin() from public, anon;
grant execute on function public.resenas_admin() to authenticated;

-- Publicar, ocultar, volver a pendiente, destacar o borrar una reseña
create or replace function public.moderar_resena(p_id integer, p_accion text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.resenas; quien text := lower(auth.jwt() ->> 'email');
begin
  if not public.puede('resenas') then raise exception 'no autorizado'; end if;
  select * into r from public.resenas x where x.id = p_id;
  if r.id is null then raise exception 'esa reseña ya no existe'; end if;
  if p_accion = 'publicar' then
    -- Entra al final de las publicadas
    update public.resenas set estado = 'publicada', revisada = now(), revisor = quien,
      orden = (select coalesce(max(x.orden), 0) + 1 from public.resenas x where x.estado = 'publicada')
      where id = p_id;
  elsif p_accion = 'ocultar' then
    update public.resenas set estado = 'oculta', destacada = false, revisada = now(), revisor = quien where id = p_id;
  elsif p_accion = 'pendiente' then
    update public.resenas set estado = 'pendiente', destacada = false, revisada = null, revisor = null where id = p_id;
  elsif p_accion = 'destacar' then
    if r.estado <> 'publicada' then raise exception 'primero publícala'; end if;
    update public.resenas set destacada = true where id = p_id;
  elsif p_accion = 'quitar' then
    update public.resenas set destacada = false where id = p_id;
  elsif p_accion = 'borrar' then
    if not public.puede('borrar') then raise exception 'no autorizado'; end if;
    delete from public.resenas where id = p_id;
  else
    raise exception 'acción no válida';
  end if;
  perform public.anotar('Reseñas',
    case p_accion when 'publicar' then 'Publicó' when 'ocultar' then 'Ocultó' when 'pendiente' then 'Devolvió a pendiente'
                  when 'destacar' then 'Destacó' when 'quitar' then 'Quitó de destacadas' else 'Borró' end || ' la reseña #' || p_id,
    jsonb_build_object('id', p_id, 'estrellas', r.estrellas, 'texto', r.texto));
end $$;
revoke all on function public.moderar_resena(integer, text) from public, anon;
grant execute on function public.moderar_resena(integer, text) to authenticated;

-- El orden del slider: los ids de las publicadas en el orden en que deben salir
create or replace function public.ordenar_resenas(p_ids integer[])
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.puede('resenas') then raise exception 'no autorizado'; end if;
  update public.resenas r set orden = o.i
    from unnest(p_ids) with ordinality as o(id, i)
   where r.id = o.id and r.estado = 'publicada';
end $$;
revoke all on function public.ordenar_resenas(integer[]) from public, anon;
grant execute on function public.ordenar_resenas(integer[]) to authenticated;

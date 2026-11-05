-- =========================================================
-- Modo Cachimbo · Los regalos de Recursos llegan con aviso
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 62-regalar-paquete.sql y 43-ayudantes-regalos.sql.
--
--   · regalar_items (Panel → Recursos) ahora, además de dar el ítem,
--     deja el aviso en public.regalos, como Panel → Regalos:
--       - al alumno le llega un sobre con el mensaje y los regalos
--         (assets/sobre.js, lo abre corazones.js con mis_corazones);
--       - sale en el historial de regalos del alumno en el panel.
--   · Se anota en el historial del equipo (anotar).
--   · La tabla regalos entra a Realtime: el sobre le llega al alumno
--     en segundos, sin recargar la página.
-- =========================================================

create or replace function public.regalar_items(p_items text[], p_emails text[] default null, p_codigos integer[] default null, p_mensaje text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare n integer; a integer; faltan integer[];
        yo text := lower(auth.jwt() ->> 'email'); nom text;
        nota text := nullif(left(trim(coalesce(p_mensaje, '')), 120), '');
begin
  -- Desde el SQL Editor no hay sesión (auth.uid() es null) y se permite; desde la web, admins o quien sube recursos
  if auth.uid() is not null and not (public.es_admin() or public.puede('recursos')) then raise exception 'no autorizado'; end if;
  if p_items is null or cardinality(p_items) = 0 then raise exception 'Elige al menos un ítem'; end if;
  if exists (select 1 from unnest(p_items) i where not exists (select 1 from public.coleccion_item c where c.id = i)) then
    raise exception 'Uno de los ítems ya no existe';
  end if;
  select coalesce(array_agg(c), '{}') into faltan from unnest(coalesce(p_codigos, '{}')) c
   where not exists (select 1 from public.jugador_id j where j.codigo = c);
  select e.nombre into nom from public.equipo e where e.email = yo;

  with para as (
    select u.id from auth.users u
     where (p_emails is null and p_codigos is null)
        or lower(u.email) = any (select lower(e) from unnest(coalesce(p_emails, '{}')) e)
        or u.id in (select j.usuario from public.jugador_id j where j.codigo = any (coalesce(p_codigos, '{}')))
  ), nuevos as (
    insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select p.id, i, 'regalo', nota
        from para p cross join (select distinct x as i from unnest(p_items) x) it
      on conflict (usuario, item) do nothing
      returning usuario, item
  ), aviso as (
    insert into public.regalos (usuario, tipo, item, nota, de_email, de_nombre)
      select usuario, 'item', item, nota, yo, nom from nuevos
      returning usuario
  )
  select count(*), count(distinct usuario) into n, a from aviso;

  if n > 0 and auth.uid() is not null then
    perform public.anotar('Recursos', 'Regaló ' || cardinality(p_items) || ' ítem' || case when cardinality(p_items) = 1 then '' else 's' end || ' a ' || a || ' alumno' || case when a = 1 then '' else 's' end,
      jsonb_build_object('items', to_jsonb(p_items), 'codigos', to_jsonb(p_codigos), 'correos', to_jsonb(p_emails), 'nota', nota));
  end if;
  return jsonb_build_object('alumnos', a, 'entregas', n, 'sin_id', to_jsonb(faltan));
end $$;
revoke all on function public.regalar_items(text[], text[], integer[], text) from public, anon;
grant execute on function public.regalar_items(text[], text[], integer[], text) to authenticated;

-- ---------------------------------------------------------
-- Al toque: la tabla regalos avisa en vivo (Realtime) a la web del alumno.
-- Cada alumno solo escucha sus regalos (la regla «regalos: míos» de 43).
-- ---------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'regalos') then
    alter publication supabase_realtime add table public.regalos;
  end if;
end $$;

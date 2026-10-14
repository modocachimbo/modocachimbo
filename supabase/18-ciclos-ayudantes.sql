-- =========================================================
-- 18 · Permiso nuevo para ayudantes: Ciclos
-- Agrega la casilla Ciclos en Ayudantes y deja que el ayudante que
-- la tenga guarde en la pestaña Ciclos (antes solo el administrador).
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- =========================================================
create or replace function public.permisos_validos()
returns text[] language sql immutable set search_path = '' as $$
  select array['reportes','editar','borrar','corr','subir','examen','vocab','cursos',
               'perfil','frases','alertas','tutorial','alumnos','simulacro','codigos','ciclos'];
$$;

create or replace function public.guardar_ajuste(p_clave text, p_valor jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare per text; nom text;
begin
  per := case p_clave when 'perfil' then 'perfil' when 'frases' then 'frases'
                      when 'practica' then 'cursos' when 'ciclos' then 'ciclos' when 'vocabulario' then 'vocab' end;
  nom := case p_clave when 'perfil' then 'Perfil del alumno' when 'frases' then 'Frases del día'
                      when 'practica' then 'Cursos' when 'ciclos' then 'Ciclos' when 'vocabulario' then 'Vocabulario' else p_clave end;
  if not (public.es_admin() or (per is not null and public.puede(per))) then raise exception 'no autorizado'; end if;
  if pg_column_size(p_valor) > 60000 then raise exception 'demasiado grande'; end if;
  insert into public.ajustes (clave, valor, actualizado) values (p_clave, p_valor, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado = now();
  perform public.anotar(nom,
    case p_clave when 'practica' then 'Cambió los ajustes de la práctica'
                 when 'ciclos' then 'Cambió qué ciclos se ven o sus nombres'
                 when 'vocabulario' then 'Cambió en qué cursos sale Vocabulario o su candado'
                 else 'Guardó cambios' end,
    case when p_clave = 'vocabulario' then p_valor else '{}'::jsonb end);
end $$;

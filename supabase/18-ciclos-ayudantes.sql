-- =========================================================
-- 18 · Ayudantes con permiso de Cursos también pueden usar Ciclos
-- Antes la pestaña Ciclos se les mostraba pero al guardar decía
-- "Solo el administrador puede cambiar los ciclos".
-- Correr una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- =========================================================
create or replace function public.guardar_ajuste(p_clave text, p_valor jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare per text; nom text;
begin
  per := case p_clave when 'perfil' then 'perfil' when 'frases' then 'frases'
                      when 'practica' then 'cursos' when 'ciclos' then 'cursos' when 'vocabulario' then 'vocab' end;
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

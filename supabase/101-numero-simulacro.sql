-- Modo Cachimbo · N.º del simulacro en el PDF, ligado a la cuenta
-- ---------------------------------------------------------
-- Cada simulacro descargado se guarda en public.descargas (tipo 'simulacro',
-- ref 'simulacro/<id del simulacro>'). El N.º es el orden en que el alumno
-- descargó por primera vez cada simulacro distinto: 1, 2, 3…
-- El mismo simulacro conserva su número; sirve igual en el celular y en la PC.
-- Lo usa assets/descarga-pdf.js justo después de pedir_descarga.

create or replace function public.numero_simulacro(p_ref text)
returns integer language sql stable security definer set search_path = '' as $$
  with s as (
    select d.ref, min(d.creado) as primero
    from public.descargas d
    where d.usuario = auth.uid() and d.tipo = 'simulacro' and d.ref is not null
    group by d.ref
  )
  select case
    when auth.uid() is null then null
    when exists (select 1 from s where s.ref = p_ref)
      then (select count(*)::int from s where s.primero <= (select x.primero from s x where x.ref = p_ref))
    else (select count(*)::int + 1 from s)
  end;
$$;
revoke all on function public.numero_simulacro(text) from public, anon;
grant execute on function public.numero_simulacro(text) to authenticated;

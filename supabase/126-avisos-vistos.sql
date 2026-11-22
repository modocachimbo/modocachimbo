-- =========================================================
-- Modo Cachimbo · 126: Lo que ya se le mostró al alumno se guarda en Supabase
-- Antes se guardaba solo en el celular (localStorage): si borraba la caché,
-- el pack de rango de la temporada le volvía a llegar en sobre como regalo nuevo.
-- aviso_marcar(clave, valor): guarda el mayor valor visto y devuelve el que había antes.
-- Se puede volver a correr sin problema.
-- =========================================================
create table if not exists public.avisos_vistos (
  usuario uuid not null references auth.users (id) on delete cascade,
  clave   text not null check (char_length(clave) between 1 and 60),
  valor   integer not null default 0,
  cuando  timestamptz not null default now(),
  primary key (usuario, clave)
);
alter table public.avisos_vistos enable row level security;

create or replace function public.aviso_marcar(p_clave text, p_valor integer)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); antes integer;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select v.valor into antes from public.avisos_vistos v where v.usuario = uid and v.clave = p_clave for update;
  insert into public.avisos_vistos (usuario, clave, valor) values (uid, p_clave, p_valor)
  on conflict (usuario, clave) do update set valor = greatest(public.avisos_vistos.valor, excluded.valor), cuando = now();
  return coalesce(antes, -1);
end $$;
revoke all on function public.aviso_marcar(text, integer) from public, anon;
grant execute on function public.aviso_marcar(text, integer) to authenticated;

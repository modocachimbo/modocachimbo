-- 144 · Códigos de diamantes
-- Javier crea códigos en el panel (Recargas Yape → Códigos de diamantes) y se los pasa al alumno
-- por WhatsApp. El alumno los canjea en Tienda → Consigue diamantes → «Canjear código».
-- Sirve dentro de la app de Play Store (canjear un código comprado fuera sí está permitido).
-- Cada código se usa una sola vez. Tras 5 intentos fallidos en 1 hora el alumno espera.

create table if not exists public.diamantes_codigos (
  codigo     text primary key check (codigo ~ '^[A-Z0-9-]{6,24}$'),
  diamantes  integer not null check (diamantes between 1 and 100000),
  nota       text,
  creado     timestamptz not null default now(),
  usado_por  uuid references auth.users (id) on delete set null,
  usado      timestamptz
);
alter table public.diamantes_codigos enable row level security;  -- sin políticas: solo por funciones

create table if not exists public.diamantes_codigos_fallos (
  usuario uuid not null,
  creado  timestamptz not null default now()
);
create index if not exists diamantes_codigos_fallos_u on public.diamantes_codigos_fallos (usuario, creado);
alter table public.diamantes_codigos_fallos enable row level security;

-- Admin: crea N códigos de X diamantes (DIA-XXXX-XXXX, sin letras que se confunden)
create or replace function public.diamantes_codigos_crear(p_diamantes integer, p_cuantos integer default 1, p_nota text default null)
returns setof text language plpgsql volatile security definer set search_path = '' as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; k int; i int;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_diamantes is null or p_diamantes < 1 or p_diamantes > 100000 then raise exception 'Cantidad de diamantes no válida.'; end if;
  if p_cuantos is null or p_cuantos < 1 or p_cuantos > 50 then raise exception 'Puedes crear de 1 a 50 códigos a la vez.'; end if;
  for k in 1 .. p_cuantos loop
    loop
      c := 'DIA-';
      for i in 1 .. 8 loop
        c := c || substr(a, 1 + floor(random() * length(a))::int, 1);
        if i = 4 then c := c || '-'; end if;
      end loop;
      begin
        insert into public.diamantes_codigos (codigo, diamantes, nota) values (c, p_diamantes, nullif(left(trim(p_nota), 80), ''));
        exit;
      exception when unique_violation then null;
      end;
    end loop;
    return next c;
  end loop;
end $$;
revoke all on function public.diamantes_codigos_crear(integer, integer, text) from public, anon;
grant execute on function public.diamantes_codigos_crear(integer, integer, text) to authenticated;

-- Admin: lista de códigos (los últimos 100)
create or replace function public.diamantes_codigos_admin()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return coalesce((select jsonb_agg(x order by x.creado desc) from (
    select d.codigo, d.diamantes, d.nota, d.creado, d.usado,
      (select coalesce(nullif(trim(p.apodo), ''), p.nombre) from public.perfiles p where p.id = d.usado_por) as apodo,
      (select j.codigo from public.jugador_id j where j.usuario = d.usado_por) as jid
    from public.diamantes_codigos d order by d.creado desc limit 100) x), '[]'::jsonb);
end $$;
revoke all on function public.diamantes_codigos_admin() from public, anon;
grant execute on function public.diamantes_codigos_admin() to authenticated;

-- Admin: borrar un código que aún no se usó
create or replace function public.diamantes_codigos_borrar(p_codigo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from public.diamantes_codigos where codigo = upper(trim(p_codigo)) and usado is null;
end $$;
revoke all on function public.diamantes_codigos_borrar(text) from public, anon;
grant execute on function public.diamantes_codigos_borrar(text) to authenticated;

-- Alumno: canjear
create or replace function public.diamantes_canjear(p_codigo text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare u uuid := auth.uid(); c text; r public.diamantes_codigos; saldo int;
begin
  if u is null then raise exception 'Inicia sesión.'; end if;
  perform pg_advisory_xact_lock(hashtext('diacod:' || u::text));
  if (select count(*) from public.diamantes_codigos_fallos f where f.usuario = u and f.creado > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('error', 'Muchos intentos. Prueba de nuevo en una hora.');
  end if;
  c := upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'));
  if c ~ '^[A-Z0-9]{8}$' then c := 'DIA-' || substr(c, 1, 4) || '-' || substr(c, 5, 4); end if;           -- sin guiones
  if c ~ '^DIA[A-Z0-9]{8}$' then c := 'DIA-' || substr(c, 4, 4) || '-' || substr(c, 8, 4); end if;
  select * into r from public.diamantes_codigos d where d.codigo = c for update;
  if not found then
    insert into public.diamantes_codigos_fallos (usuario) values (u);
    delete from public.diamantes_codigos_fallos f where f.creado < now() - interval '1 day';
    return jsonb_build_object('error', 'Ese código no existe. Revísalo bien.');
  end if;
  if r.usado is not null then
    return jsonb_build_object('error', case when r.usado_por = u then 'Ya canjeaste este código.' else 'Este código ya fue usado.' end);
  end if;
  update public.diamantes_codigos set usado = now(), usado_por = u where codigo = c;
  saldo := public.diamantes_dar(u, r.diamantes, 'Código de diamantes');
  return jsonb_build_object('ok', true, 'diamantes', r.diamantes, 'saldo', saldo);
end $$;
revoke all on function public.diamantes_canjear(text) from public, anon;
grant execute on function public.diamantes_canjear(text) to authenticated;

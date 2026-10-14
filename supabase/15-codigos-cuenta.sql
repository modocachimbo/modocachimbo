-- =========================================================
-- Modo Cachimbo · Códigos guardados en la cuenta de Google
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita haber corrido antes supabase/01-perfiles.sql.
--
--   · codigos_cuenta: los códigos de acceso que activó cada alumno
--     estando conectado con Google. Si entra con la misma cuenta en
--     otro celular o laptop (o se le borraron los datos del
--     navegador), el acceso vuelve solo, sin escribir el código.
--     El Apps Script sigue revisando cada código y cuenta cada
--     dispositivo nuevo en su máximo, igual que antes.
--   · Cada alumno solo ve y cambia los suyos.
-- =========================================================

create table if not exists public.codigos_cuenta (
  usuario  uuid not null references auth.users (id) on delete cascade,
  codigo   text not null check (codigo ~ '^[A-Z0-9_-]{3,40}$'),
  producto text not null check (char_length(producto) between 1 and 300),
  vence    text check (char_length(vence) <= 20),
  creado   timestamptz not null default now(),
  primary key (usuario, codigo)
);
alter table public.codigos_cuenta enable row level security;
drop policy if exists "codigos propios: ver" on public.codigos_cuenta;
create policy "codigos propios: ver" on public.codigos_cuenta
  for select to authenticated using ((select auth.uid()) = usuario);
-- Nadie escribe directo: solo con las funciones de abajo

-- Guarda en la cuenta los códigos que ya funcionan en este dispositivo.
-- p = [{ "codigo": "MC-ABCD-EFGH", "producto": "fijas-VIP", "vence": "2027-03-31" }, ...]
create or replace function public.guardar_codigos_cuenta(p jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); x jsonb; n integer := 0;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if jsonb_typeof(coalesce(p, '[]'::jsonb)) <> 'array' then raise exception 'lista inválida'; end if;
  for x in select value from jsonb_array_elements(p) with ordinality a(value, i) where i <= 20 loop
    if upper(coalesce(x ->> 'codigo', '')) ~ '^[A-Z0-9_-]{3,40}$' and coalesce(x ->> 'producto', '') <> ''
       and (select count(*) from public.codigos_cuenta c where c.usuario = uid) < 30 then
      insert into public.codigos_cuenta (usuario, codigo, producto, vence)
      values (uid, upper(x ->> 'codigo'), left(x ->> 'producto', 300), nullif(left(coalesce(x ->> 'vence', ''), 20), ''))
      on conflict (usuario, codigo) do update set producto = excluded.producto, vence = coalesce(excluded.vence, public.codigos_cuenta.vence);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.guardar_codigos_cuenta(jsonb) from public, anon;
grant execute on function public.guardar_codigos_cuenta(jsonb) to authenticated;

-- Quita un código de la cuenta (cuando el Apps Script dice que ya no sirve: desactivado, vencido…)
create or replace function public.quitar_codigo_cuenta(p_codigo text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.codigos_cuenta where usuario = auth.uid() and codigo = upper(p_codigo);
$$;
revoke all on function public.quitar_codigo_cuenta(text) from public, anon;
grant execute on function public.quitar_codigo_cuenta(text) to authenticated;

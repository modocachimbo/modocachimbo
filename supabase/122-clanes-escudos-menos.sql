-- =========================================================
-- Modo Cachimbo · Clanes: menos formas de escudo y menos símbolos
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 90-clanes-escudos.sql. Las listas tienen que ser
-- iguales a FORMAS y SIMB de assets/clanes.js.
--
--   · Formas que quedan: punta, redondo, corona, hex, espadas, pinchos.
--   · Símbolos que quedan: rayo, libro, buho, llama, estrella, atomo,
--     corona, espadas, birrete, cohete, cerebro.
--   · Los clanes que tenían una forma quitada pasan a «punta» (clásico)
--     y los que tenían un símbolo quitado pasan a «rayo».
-- =========================================================

update public.clanes set forma = 'punta'
  where forma not in ('punta', 'redondo', 'corona', 'hex', 'espadas', 'pinchos');
update public.clanes set simbolo = 'rayo'
  where simbolo not in ('rayo', 'libro', 'buho', 'llama', 'estrella', 'atomo', 'corona', 'espadas', 'birrete', 'cohete', 'cerebro');

alter table public.clanes drop constraint if exists clanes_forma_check;
alter table public.clanes add constraint clanes_forma_check check (forma in (
  'punta', 'redondo', 'corona', 'hex', 'espadas', 'pinchos'));

alter table public.clanes drop constraint if exists clanes_simbolo_check;
alter table public.clanes add constraint clanes_simbolo_check check (simbolo in (
  'rayo', 'libro', 'buho', 'llama', 'estrella', 'atomo', 'corona', 'espadas', 'birrete', 'cohete', 'cerebro'));

create or replace function public.clan_validar(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if char_length(trim(coalesce(p_nombre, ''))) not between 3 and 24 then raise exception 'nombre_largo'; end if;
  if upper(coalesce(p_tag, '')) !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag_mal'; end if;
  if public.clan_nombre_feo(p_nombre) or public.clan_nombre_feo(p_tag) then raise exception 'nombre_feo'; end if;
  if coalesce(p_forma, '') not in ('punta', 'redondo', 'corona', 'hex', 'espadas', 'pinchos') then raise exception 'forma_mal'; end if;
  if coalesce(p_simbolo, '') not in ('rayo', 'libro', 'buho', 'llama', 'estrella', 'atomo',
    'corona', 'espadas', 'birrete', 'cohete', 'cerebro') then raise exception 'simbolo_mal'; end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'color_mal'; end if;
end $$;
revoke all on function public.clan_validar(text, text, text, text, text) from public, anon, authenticated;

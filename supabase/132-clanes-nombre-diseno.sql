-- =========================================================
-- Modo Cachimbo · Clanes: nombres con letras de diseño
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 88-clanes.sql y 122-clanes-escudos-menos.sql.
--
--   · El nombre del clan acepta cualquier carácter que copien y peguen:
--     letras de diseño (𝓛𝓸𝓼, 𝐋𝐨𝐬, ꜱᴀɴ ᴍᴀʀᴄᴏꜱ, Ⓛⓞⓢ), símbolos (★ 彡 ღ ✿),
--     emojis, letras de otros idiomas…
--   · Se cuentan las letras que se VEN (de 3 a 24): los acentos y
--     adornos que se pegan encima (L̶o̶s̶) no suman.
--   · No vale un nombre «invisible» (solo espacios o el carácter en
--     blanco ㅤ): tiene que tener al menos 3 caracteres que se vean.
--   · Se quitan solos los caracteres que voltean el texto (de derecha a
--     izquierda) y los invisibles, para que no rompan la pantalla.
--   · El filtro de groserías también lee las letras de diseño
--     (𝓹𝓾𝓽𝓸 o ᴘᴜᴛᴏ no pasan).
--   · No se puede copiar el nombre de otro clan cambiándole solo la
--     letra (𝐎𝐰𝐥 𝐆𝐚𝐧𝐠 = Owl Gang): sale «ese nombre ya existe».
-- =========================================================

-- Caracteres que se pegan encima de otra letra (acentos, tachados, zalgo)
create or replace function public.clan_sin_adornos(t text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(t, ''),
    '[̀-ͯ҃-҉᪰-᫿᷀-᷿⃐-⃿︠-︯︀-️‍]', '', 'g');
$$;

-- Limpia el nombre: sin caracteres que voltean el texto ni invisibles, sin espacios de más
create or replace function public.clan_nombre_limpio(t text)
returns text language sql immutable set search_path = '' as $$
  select trim(regexp_replace(
           regexp_replace(coalesce(t, ''), '[​‌‎‏‪-‮⁠-⁤⁦-⁩﻿­\r\n\t]', '', 'g'),
           '\s{2,}', ' ', 'g'));
$$;

-- Letras que se ven (para el mínimo de 3 y el máximo de 24)
create or replace function public.clan_nombre_largo(t text)
returns integer language sql immutable set search_path = '' as $$
  select char_length(public.clan_sin_adornos(t));
$$;
create or replace function public.clan_nombre_visibles(t text)
returns integer language sql immutable set search_path = '' as $$
  select char_length(regexp_replace(public.clan_sin_adornos(t), '[\sㅤᅟᅠ⠀ﾠ⠀᠎]', '', 'g'));
$$;

-- Pasa las letras de diseño a letras normales (para el filtro y para comparar nombres)
create or replace function public.clan_nombre_plano(t text)
returns text language plpgsql immutable set search_path = '' as $$
declare x text := public.clan_sin_adornos(t);
begin
  begin
    x := normalize(x, NFKC);   -- 𝓛 𝐋 𝕃 Ⓛ Ｌ → L
  exception when others then null;
  end;
  -- Versalitas que NFKC no cambia (ꜱᴀɴ ᴍᴀʀᴄᴏꜱ)
  return translate(lower(x), 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ', 'abcdefghijklmnopqrstuvwyz');
end $$;
-- Solo letras y números: «𝐎𝐰𝐥 ★ 𝐆𝐚𝐧𝐠» → «owlgang»
create or replace function public.clan_nombre_clave(t text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(public.clan_nombre_plano(t), '[^[:alnum:]]', '', 'g');
$$;

-- Nombres feos: ahora también con letras de diseño
create or replace function public.clan_nombre_feo(t text)
returns boolean language sql immutable set search_path = '' as $$
  select translate(regexp_replace(public.clan_nombre_plano(t), '[^[:alnum:]@$]+', ' ', 'g'), 'áéíóúü0134@$', 'aeiouuoieaas') ~
    '\m(put[ao]s?\M|pendej|mierd|cojud|huev[oó]n|webon|cabr[oó]n|conchatu|ctm\M|csm\M|mrd\M|verga|pinga|chuch|culo\M|maric|perra|joder|idiota|imbecil|estupid|nazi|hitler|sexo|porno|xxx)';
$$;

-- El nombre se guarda con hasta 80 caracteres (las letras de diseño ocupan más)
alter table public.clanes drop constraint if exists clanes_nombre_check;
alter table public.clanes add constraint clanes_nombre_check check (char_length(nombre) between 3 and 80);

create or replace function public.clan_validar(p_nombre text, p_tag text, p_forma text, p_simbolo text, p_color text)
returns void language plpgsql immutable set search_path = '' as $$
declare n text := public.clan_nombre_limpio(p_nombre);
begin
  if public.clan_nombre_visibles(n) < 3 or public.clan_nombre_largo(n) > 24 or char_length(n) > 80 then raise exception 'nombre_largo'; end if;
  if upper(coalesce(p_tag, '')) !~ '^[A-Z0-9]{2,5}$' then raise exception 'tag_mal'; end if;
  if public.clan_nombre_feo(n) or public.clan_nombre_feo(p_tag) then raise exception 'nombre_feo'; end if;
  if coalesce(p_forma, '') not in ('punta', 'redondo', 'corona', 'hex', 'espadas', 'pinchos') then raise exception 'forma_mal'; end if;
  if coalesce(p_simbolo, '') not in ('rayo', 'libro', 'buho', 'llama', 'estrella', 'atomo',
    'corona', 'espadas', 'birrete', 'cohete', 'cerebro') then raise exception 'simbolo_mal'; end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'color_mal'; end if;
end $$;
revoke all on function public.clan_validar(text, text, text, text, text) from public, anon, authenticated;

-- Al guardar: limpia el nombre y no deja copiar el de otro clan con otras letras
create or replace function public.clan_nombre_antes()
returns trigger language plpgsql set search_path = '' as $$
declare k text;
begin
  new.nombre := public.clan_nombre_limpio(new.nombre);
  if not new.cerrado and (tg_op = 'INSERT' or new.nombre is distinct from old.nombre or (old.cerrado and not new.cerrado)) then
    k := public.clan_nombre_clave(new.nombre);
    if k <> '' and exists (select 1 from public.clanes c where not c.cerrado and c.id <> new.id
                            and public.clan_nombre_clave(c.nombre) = k) then
      raise exception 'nombre_usado';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists clan_nombre_antes on public.clanes;
create trigger clan_nombre_antes before insert or update of nombre, cerrado on public.clanes
  for each row execute function public.clan_nombre_antes();

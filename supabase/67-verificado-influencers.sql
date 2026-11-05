-- =========================================================
-- Modo Cachimbo · La V de verificado pasa a ser de influencers
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 64-influencers.sql.
--
--   · La V ya no se pone sola a los admins ni a los ayudantes.
--   · Ahora es un pin de Mi colección («Verificado») que tienen solo los
--     influencers, mientras estén en el grupo (como lo de 64): se lo
--     ponen en su vitrina y sale en su tarjeta y en los tops.
--   · A los influencers que ya están les llega un sobre con la V
--     (solo la primera vez que corres este archivo).
-- =========================================================

do $$
declare era boolean;
begin
  select true into era from public.coleccion_item where id = 'pin-verificado';
  insert into public.coleccion_item (id, espacio, regla, visible, nom, rareza, img)
  values ('pin-verificado', 'pines', '{"tipo":"grupo","g":"influencer"}', true, 'Verificado', 'legendario', 'assets/pines/verificado.webp')
  on conflict (id) do update set espacio = excluded.espacio, regla = excluded.regla, nom = excluded.nom, rareza = excluded.rareza, img = excluded.img;

  if era is null then
    insert into public.regalos (usuario, tipo, item, nota, de_nombre)
    select g.usuario, 'item', 'pin-verificado', '¡Ya tienes la V de verificado de Modo Cachimbo!', 'Modo Cachimbo'
      from public.grupo_miembro g where g.grupo = 'influencer';
  end if;
end $$;

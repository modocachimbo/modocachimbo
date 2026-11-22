-- =========================================================
-- Modo Cachimbo · 125: Cofres no reclamados llegan en sobre
-- El domingo a las 23:50 (hora de Lima) se revisa cada clan:
--   · los cofres del clan que el alumno podía abrir y no abrió
--     (la barra llegó y él tiene al menos el mínimo de XP propio),
--   · y sus cofres personales que ya alcanzó y no abrió,
-- se abren solos y los premios le llegan en un sobre «De: Tu clan».
-- Correr después de 124. Se puede volver a correr sin problema.
-- =========================================================

-- Los sobres aceptan tickets (ya lo hace el 117); por si acaso:
alter table public.regalos drop constraint if exists regalos_tipo_check;
alter table public.regalos add constraint regalos_tipo_check
  check (tipo in ('corazones', 'infinito', 'xp', 'item', 'rayos', 'ticket', 'racha'));

create or replace function public.cofres_no_reclamados()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare lunes date := public.cz_lunes(); r record; u uuid; f record; p record; x jsonb;
  nm integer; b integer; pts integer; bonus integer; mio integer; yo_pts integer;
  vxp integer; vry integer; vtk integer; its text[]; noms text[]; pr jsonb; total integer := 0; nuevo boolean;
begin
  for r in select c.id from public.clanes c loop
    select count(*) into nm from public.clan_miembros k where k.clan = r.id;
    continue when nm = 0;
    b := greatest(nm, 5);
    bonus := 0;
    for x in select * from jsonb_array_elements(public.clan_misiones(r.id)) loop
      if (x ->> 'prog')::integer >= (x ->> 'meta')::integer and (x ->> 'meta')::integer > 0 then bonus := bonus + (x ->> 'bonus')::integer; end if;
    end loop;
    pts := public.clan_xp_semana(r.id) + bonus;

    for u in select k.usuario from public.clan_miembros k where k.clan = r.id loop
      perform pg_advisory_xact_lock(hashtext('cofre:' || u::text));
      vxp := 0; vry := 0; vtk := 0; its := '{}'; noms := '{}';
      mio := public.xp_semana_de(u);
      yo_pts := (public.mi_actividad_clan(u) ->> 'puntos')::integer;

      -- Cofres del clan
      if mio >= public.clan_cofre_minimo() then
        for f in select * from public.clan_cofres_cfg c where c.por_miembro * b <= pts
                   and not exists (select 1 from public.clan_cofres_abiertos o where o.usuario = u and o.semana = lunes and o.n = c.n)
                 order by c.n loop
          vxp := vxp + f.xp; vtk := vtk + f.tickets;
          if f.rayos > 0 then
            insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'cofre:' || lunes || ':' || f.n, f.rayos) on conflict do nothing;
            if found then vry := vry + f.rayos; end if;
          end if;
          nuevo := false;
          if f.item is not null and exists (select 1 from public.coleccion_item i where i.id = f.item) then
            insert into public.coleccion_mia (usuario, item, origen, mensaje) values (u, f.item, 'evento', 'Cofre ' || f.nombre || ' del clan')
            on conflict (usuario, item) do nothing;
            nuevo := found;
            if nuevo then its := its || f.item; end if;
          end if;
          pr := jsonb_build_object('n', f.n, 'nombre', f.nombre, 'xp', f.xp, 'rayos', f.rayos, 'tickets', f.tickets, 'auto', true,
            'item', case when nuevo then f.item end);
          insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (u, lunes, f.n, r.id, pr);
          noms := noms || f.nombre;
        end loop;
      end if;

      -- Cofres personales
      for p in select * from public.clan_premios_yo_cfg c where c.meta <= yo_pts
                 and not exists (select 1 from public.clan_cofres_abiertos o where o.usuario = u and o.semana = lunes and o.n = 10 + c.n)
               order by c.n loop
        vxp := vxp + p.xp; vtk := vtk + p.tickets;
        if p.rayos > 0 then
          insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'premioyo:' || lunes || ':' || p.n, p.rayos) on conflict do nothing;
          if found then vry := vry + p.rayos; end if;
        end if;
        pr := jsonb_build_object('n', p.n, 'nombre', 'Recompensa ' || p.n, 'xp', p.xp, 'rayos', p.rayos, 'tickets', p.tickets, 'auto', true);
        insert into public.clan_cofres_abiertos (usuario, semana, n, clan, premio) values (u, lunes, 10 + p.n, r.id, pr);
        noms := noms || ('Personal ' || p.n);
      end loop;

      continue when cardinality(noms) = 0;
      total := total + cardinality(noms);
      if vxp > 0 then
        perform public.cz_estado(u);
        insert into public.xp_semana (usuario, semana, xp) values (u, lunes, vxp)
        on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
        update public.corazones set xp_saldo = xp_saldo + vxp, actualizado = now() where usuario = u;
      end if;
      if vtk > 0 then perform public.sala_tickets_sumar(u, vtk); end if;

      -- El sobre: una fila por premio, todas con la misma nota
      declare nota text := left('No abriste ' || case when cardinality(noms) = 1 then 'tu cofre ' else 'tus cofres ' end ||
          array_to_string(noms, ', ') || ' esta semana. ¡Aquí tienes tus premios!', 120);
      begin
        if vxp > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'xp', vxp, nota, 'Tu clan'); end if;
        if vry > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'rayos', vry, nota, 'Tu clan'); end if;
        if vtk > 0 then insert into public.regalos (usuario, tipo, cantidad, nota, de_nombre) values (u, 'ticket', vtk, nota, 'Tu clan'); end if;
        insert into public.regalos (usuario, tipo, item, nota, de_nombre) select u, 'item', i, nota, 'Tu clan' from unnest(its) i;
      end;
    end loop;
  end loop;
  return total;
end $$;
revoke all on function public.cofres_no_reclamados() from public, anon, authenticated;

-- El reloj: domingo 23:50 de Lima = lunes 04:50 UTC
do $$ begin
  if exists (select 1 from cron.job where jobname = 'mc-cofres-no-reclamados') then perform cron.unschedule('mc-cofres-no-reclamados'); end if;
end $$;
select cron.schedule('mc-cofres-no-reclamados', '50 4 * * 1', $cron$ select public.cofres_no_reclamados(); $cron$);

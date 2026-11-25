-- =========================================================
-- Modo Cachimbo · Guerra de clanes: premios nuevos al cerrar la temporada
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 135-sala-clan-guerra.sql (correr después del 135 y 136).
--
--   A cada miembro que JUGÓ por su clan en la temporada (partida o duelo):
--     Puesto del clan   Diamantes   XP      Rayos
--     1.°               300         1 000   30
--     2.°               150           700   20
--     3.°                80           500   15
--     Los demás clanes   40           200    5   (para que nadie juegue en vano)
--   · El XP sube el nivel del clan y su Top de la semana (es XP normal).
--   · 1.°, 2.° y 3.° además ganan la copa en el escudo; el 1.° el pin «Campeón».
--   · Top 3 jugadores: 80, 50 y 30 diamantes (igual que antes).
--   · Emblema «Guerrero» para todos los que jugaron (igual que antes).
-- =========================================================

create or replace function public.guerra_cerrar(t integer)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r record; dia integer; xp integer; ray integer; nom text; clanes jsonb := '[]'::jsonb; jug jsonb := '[]'::jsonb; u uuid;
begin
  if t < 1 or public.guerra_hoy() <= public.guerra_inicio(t) + 27 then return; end if;
  perform pg_advisory_xact_lock(hashtext('guerra_cerrar'));
  if exists (select 1 from public.guerra_cierres where temporada = t) then return; end if;

  -- Todos los clanes que jugaron, por puesto
  for r in select x.clan, x.puesto from (
             select g.clan, row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto
               from public.guerra_puntos g join public.clanes c on c.id = g.clan and not c.cerrado
              where g.temporada = t and g.termino is not null group by g.clan) x
           order by x.puesto loop
    dia := case r.puesto when 1 then 300 when 2 then 150 when 3 then 80 else 40 end;
    xp  := case r.puesto when 1 then 1000 when 2 then 700 when 3 then 500 else 200 end;
    ray := case r.puesto when 1 then 30 when 2 then 20 when 3 then 15 else 5 end;
    select k.nombre into nom from public.clanes k where k.id = r.clan;
    if r.puesto <= 3 then
      insert into public.guerra_copas (clan, temporada, puesto) values (r.clan, t, r.puesto) on conflict do nothing;
      clanes := clanes || jsonb_build_object('clan', r.clan, 'nombre', nom, 'puesto', r.puesto);
    end if;
    -- A cada miembro que jugó por ese clan esta temporada
    for u in select distinct g.usuario from public.guerra_puntos g where g.temporada = t and g.clan = r.clan and g.termino is not null loop
      perform public.diamantes_dar(u, dia, left('Guerra de clanes T' || t || ': ' || r.puesto || '.° puesto con ' || nom, 80));
      perform public.cz_estado(u);
      insert into public.xp_semana (usuario, semana, xp) values (u, public.cz_lunes(), xp)
      on conflict (usuario, semana) do update set xp = public.xp_semana.xp + excluded.xp;
      update public.corazones set xp_saldo = xp_saldo + xp, actualizado = now() where usuario = u;
      insert into public.lab_rayos (usuario, clave, cantidad) values (u, 'guerra-t' || t, ray) on conflict do nothing;
      insert into public.guerra_premios (usuario, temporada, premio)
      values (u, t, jsonb_build_object('clan_puesto', r.puesto, 'clan', nom, 'diamantes', dia, 'xp', xp, 'rayos', ray))
      on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;
    end loop;
    if r.puesto = 1 then
      insert into public.coleccion_mia (usuario, item, origen, mensaje)
      select distinct g.usuario, 'pin-guerra-campeon-t' || t, 'evento', 'Campeones de la Guerra de clanes T' || t
        from public.guerra_puntos g where g.temporada = t and g.clan = r.clan and g.termino is not null
      on conflict do nothing;
    end if;
  end loop;

  -- Top 3 individual
  for r in select x.usuario, x.puesto from (
             select g.usuario, row_number() over (order by sum(g.puntos) desc, min(g.termino)) as puesto
               from public.guerra_puntos g where g.temporada = t and g.termino is not null group by g.usuario) x
           where x.puesto <= 3 loop
    dia := case r.puesto when 1 then 80 when 2 then 50 else 30 end;
    perform public.diamantes_dar(r.usuario, dia, 'Guerra de clanes T' || t || ': ' || r.puesto || '.° individual');
    jug := jug || jsonb_build_object('codigo', public.jugador_codigo(r.usuario), 'apodo', public.duelo_apodo(r.usuario), 'puesto', r.puesto);
    insert into public.guerra_premios (usuario, temporada, premio)
    values (r.usuario, t, jsonb_build_object('ind_puesto', r.puesto, 'ind_diamantes', dia))
    on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;
  end loop;

  -- Emblema para todos los que jugaron
  insert into public.coleccion_mia (usuario, item, origen, mensaje)
  select distinct g.usuario, 'pin-guerra-t' || t, 'evento', 'Jugaste la Guerra de clanes T' || t
    from public.guerra_puntos g where g.temporada = t and g.termino is not null
  on conflict do nothing;
  insert into public.guerra_premios (usuario, temporada, premio)
  select distinct g.usuario, t, '{"emblema":true}'::jsonb from public.guerra_puntos g where g.temporada = t and g.termino is not null
  on conflict (usuario, temporada) do update set premio = public.guerra_premios.premio || excluded.premio;

  insert into public.guerra_cierres (temporada, clanes, jugadores) values (t, clanes, jug);
end $$;
revoke all on function public.guerra_cerrar(integer) from public, anon, authenticated;

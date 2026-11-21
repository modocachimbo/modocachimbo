-- =========================================================
-- Modo Cachimbo · Duelos de hasta 6 jugadores.
-- Antes: 2, 3 o 4. Ahora también 5 y 6.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Necesita 111-duelos-v3.sql. crear_duelo es copia de 111 con 5 y 6.
-- =========================================================

alter table public.duelos drop constraint if exists duelos_max_jug_check;
alter table public.duelos add constraint duelos_max_jug_check check (max_jug between 2 and 6);

create or replace function public.crear_duelo(p jsonb)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cod text;
  letras constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  q jsonb;
  lista jsonb := '[]';
  res jsonb := '[]';
  previo uuid;
  nuevo uuid;
  cant integer;
  segs integer := 60;
  cmd jsonb := '[]';
  ncmd integer := 0;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  if (select count(*) from public.duelos x where x.creador = uid and x.creado > now() - interval '1 day') >= 40 then
    raise exception 'Ya creaste muchos duelos hoy. Intenta mañana.';
  end if;
  if jsonb_typeof(p -> 'preguntas') <> 'array' or jsonb_array_length(p -> 'preguntas') not between 3 and 30 then
    raise exception 'preguntas no válidas';
  end if;
  for q in select * from jsonb_array_elements(p -> 'preguntas') loop
    if not public.duelo_q_ok(q) then raise exception 'pregunta no válida'; end if;
    lista := lista || jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end loop;
  if jsonb_typeof(p -> 'reserva') = 'array' and jsonb_array_length(p -> 'reserva') >= 1 and public.duelo_q_ok(p -> 'reserva' -> 0) then
    q := p -> 'reserva' -> 0;
    res := jsonb_build_array(jsonb_build_object('ref', q ->> 'ref', 'c', (q ->> 'c')::integer, 'k', (q ->> 'k')::integer));
  end if;
  cant := jsonb_array_length(lista);
  if coalesce(p ->> 'seg', '') ~ '^[0-9]{1,3}$' then segs := least(greatest((p ->> 'seg')::integer, 15), 120); end if;
  if coalesce(p ->> 'comodines', '') = 'true' then
    -- Todos los comodines quedan disponibles; cada jugador elige los suyos en la sala
    select coalesce(jsonb_agg(k), '[]') into cmd from unnest(public.duelo_pool()) k
      where k <> 'cambio' or jsonb_array_length(res) > 0;
    ncmd := case when cant <= 10 then 2 when cant <= 20 then 3 else 4 end;
  end if;

  if coalesce(p ->> 'revancha_de', '') ~ '^[A-Z0-9]{6}$' then
    select x.id into previo from public.duelos x where x.codigo = p ->> 'revancha_de'
      and (x.creador = uid or exists (select 1 from public.duelo_jugadas j where j.duelo = x.id and j.usuario = uid));
  end if;

  loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(letras, 1 + floor(random() * length(letras))::integer, 1); end loop;
    exit when not exists (select 1 from public.duelos x where x.codigo = cod);
  end loop;

  insert into public.duelos (codigo, creador, titulo, curso, fuente, ciclo, tema, preguntas, n, revancha_de, max_jug, auto, en_sala, vence,
                             seg, comodines, final_x3, cmd_cant, reserva, relampago)
  values (cod, uid,
          left(coalesce(nullif(trim(p ->> 'titulo'), ''), 'Duelo'), 80),
          left(coalesce(nullif(trim(p ->> 'curso'), ''), 'todos'), 40),
          case when p ->> 'fuente' in ('mezcla', 'libro', 'fijas', 'seminarios', 'banqueo') then p ->> 'fuente' else 'mezcla' end,
          case when coalesce(p ->> 'ciclo', '') ~ '^[0-9]{4}-(I|II|III)$' then p ->> 'ciclo' end,
          left(nullif(trim(coalesce(p ->> 'tema', '')), ''), 80),
          lista, cant, previo,
          case when p ->> 'jugadores' in ('2', '3', '4', '5', '6') then (p ->> 'jugadores')::integer else 2 end,
          coalesce((p ->> 'auto')::boolean, false), true, now() + interval '5 minutes',
          segs, cmd, coalesce(p ->> 'final', '') = 'true', ncmd, res,
          case when cant >= 8 then cant / 2 end)
  returning id into nuevo;
  insert into public.duelo_jugadas (duelo, usuario) values (nuevo, uid);
  delete from public.duelo_eventos e where e.creado < now() - interval '1 day';
  return cod;
end $$;
revoke all on function public.crear_duelo(jsonb) from public, anon;
grant execute on function public.crear_duelo(jsonb) to authenticated;

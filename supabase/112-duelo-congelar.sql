-- =========================================================
-- Modo Cachimbo · Duelos: Congelar pasa a ser un ataque.
-- Antes: tu propio reloj se paraba 10 s.
-- Ahora: las alternativas de TODOS tus rivales se congelan (hielo
-- azul) 5 s y no pueden marcar; tu reloj sigue normal. Si un rival
-- tiene Espejo, el hielo te rebota a ti.
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Necesita 111-duelos-v3.sql.
-- =========================================================

create or replace function public.usar_comodin(p_codigo text, p_k text, p_i integer, p_n integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  d public.duelos;
  j public.duelo_jugadas;
  q jsonb;
  quita jsonb;
  extra jsonb := '{}';
  ult boolean;
begin
  if uid is null then raise exception 'sin sesión'; end if;
  select * into d from public.duelos x where x.codigo = upper(trim(p_codigo));
  if d.id is null then raise exception 'No existe ese duelo.'; end if;
  select * into j from public.duelo_jugadas x where x.duelo = d.id and x.usuario = uid for update;
  if j.duelo is null or j.terminado is not null then raise exception 'No estás jugando este duelo.'; end if;
  if d.empieza is null or now() < d.empieza then raise exception 'El duelo aún no empieza.'; end if;
  if p_i is distinct from j.actual then raise exception 'Esa pregunta ya pasó.'; end if;
  if not public.duelo_mano(d, j) ? p_k then raise exception 'No tienes ese comodín.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where e ->> 'k' = p_k) then raise exception 'Ya usaste ese comodín.'; end if;
  if exists (select 1 from jsonb_array_elements(j.usados) e where (e ->> 'i')::integer = j.actual) then
    raise exception 'Solo un comodín por pregunta.';
  end if;
  if now() > j.visto + make_interval(secs => d.seg) then raise exception 'Se acabó el tiempo de esta pregunta.'; end if;
  ult := d.final_x3 and j.actual = d.n - 1;
  if p_k in ('doble', 'apuesta') and ult then raise exception 'La última ya vale 3.'; end if;
  q := case when j.cambio_i = j.actual and jsonb_array_length(d.reserva) > 0 then d.reserva -> 0 else d.preguntas -> j.actual end;

  if p_k = 'mitad' then
    select jsonb_agg(o) into quita from (
      select o from generate_series(0, (q ->> 'k')::integer - 1) o
      where o <> (q ->> 'c')::integer order by random() limit least(2, (q ->> 'k')::integer - 2)) x;
    extra := jsonb_build_object('quita', coalesce(quita, '[]'));
  elsif p_k in ('doble', 'escudo', 'ladron') then
    update public.duelo_jugadas x set activo = p_k where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'apuesta' then
    if p_n is null or p_n not between 1 and 3 then raise exception 'Apuesta 1, 2 o 3 puntos.'; end if;
    update public.duelo_jugadas x set activo = 'apuesta', apuesta = p_n where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('apuesta', p_n);
  elsif p_k = 'espejo' then
    if j.espejo then raise exception 'Tu Espejo ya está activo.'; end if;
    update public.duelo_jugadas x set espejo = true where x.duelo = d.id and x.usuario = uid;
  elsif p_k = 'cambio' then
    if jsonb_array_length(d.reserva) = 0 then raise exception 'Este duelo no tiene preguntas de reserva.'; end if;
    -- Pregunta nueva con el reloj desde cero
    update public.duelo_jugadas x set cambio_i = j.actual, visto = now(), activo = null where x.duelo = d.id and x.usuario = uid;
    extra := jsonb_build_object('reserva', d.reserva -> 0 ->> 'ref');
  elsif p_k in ('robar', 'terremoto', 'hielo') then
    extra := public.duelo_atacar(d, uid, p_k);
    update public.duelo_jugadas x set stats = public.duelo_stat(x.stats, 'ataques', 1) where x.duelo = d.id and x.usuario = uid;
    extra := extra || jsonb_build_object('robados', (extra ->> 'golpes')::integer);
  elsif p_k <> 'espia' then
    raise exception 'Comodín no válido.';
  end if;

  update public.duelo_jugadas x set usados = x.usados || jsonb_build_array(
      jsonb_build_object('k', p_k, 'i', j.actual) || case when quita is not null then jsonb_build_object('quita', quita) else '{}' end)
  where x.duelo = d.id and x.usuario = uid;
  if p_k not in ('robar', 'terremoto') then
    insert into public.duelo_eventos (duelo, usuario, tipo, dato) values (d.id, uid, 'comodin', p_k);
  end if;
  return jsonb_build_object('ok', true, 'k', p_k) || extra || case when p_k = 'espia' then jsonb_build_object('espia', public.duelo_espia(d, uid, j.actual)) else '{}' end;
end $$;
revoke all on function public.usar_comodin(text, text, integer, integer) from public, anon;
grant execute on function public.usar_comodin(text, text, integer, integer) to authenticated;

-- =========================================================
-- Modo Cachimbo · «XP por pregunta» sin castigar a quien estudia Seminarios
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 50-revisar-trampas-xp.sql (y 57 si lo usas).
--
--   · Antes: XP por pregunta = todo el XP de la semana ÷ preguntas
--     registradas. Quien estudiaba mucho Seminarios, Banqueo, Duelo,
--     Vocabulario o Flashcards (que no se registran pregunta por pregunta)
--     salía con un número altísimo sin hacer trampa.
--   · Ahora: XP por pregunta = solo el XP ganado en Práctica, Repaso,
--     Fijas, Exámenes y Simulacro ÷ las preguntas registradas de esos
--     mismos modos. La alerta «Mucho XP para las preguntas que respondió»
--     usa esa misma cuenta.
--   · Columna nueva xp_registrable: ese XP que sí se puede comprobar.
-- =========================================================

drop function if exists public.xp_revision(date);

create or replace function public.xp_revision(p_dia date default null)
returns table (
  puesto integer, usuario uuid, nombre text, apodo text, email text, xp integer,
  regalado integer, premios integer, preguntas integer, xp_por_pregunta integer, xp_registrable integer,
  envios integer, respuestas integer, aciertos integer, horas integer, max_hora integer,
  ajustado boolean, senales text[], desde date
)
language plpgsql stable security definer set search_path = '' as $$
declare
  lunes date;
  ini timestamptz;
  fin timestamptz;
begin
  if not public.puede('topxp') then raise exception 'no autorizado'; end if;
  lunes := (date_trunc('week', coalesce(p_dia, (now() at time zone 'America/Lima')::date)::timestamp))::date;
  ini := lunes::timestamp at time zone 'America/Lima';
  fin := ini + interval '7 days';
  return query
    with top as (
      select x.usuario as u, x.xp as xp_sem, (row_number() over (order by x.xp desc, x.usuario))::integer as pos
      from public.xp_semana x where x.semana = lunes and x.xp > 0
      order by x.xp desc limit 50
    ), env as (
      select e.usuario as u, count(*)::integer as n, sum(e.ok + e.mal)::integer as resp, sum(e.ok)::integer as oks,
             count(distinct date_trunc('hour', e.creado))::integer as hrs,
             -- XP de los modos que se registran pregunta por pregunta
             sum(case when e.fuente in ('libro', 'repaso', 'fijas', 'examen', 'simulacro') then e.xp else 0 end)::integer as xreg
      from public.xp_envios e where e.creado >= ini and e.creado < fin and e.usuario in (select t.u from top t)
      group by e.usuario
    ), hora as (
      select h.u, max(h.s)::integer as mx from (
        select e.usuario as u, sum(e.xp) as s from public.xp_envios e
        where e.creado >= ini and e.creado < fin and e.usuario in (select t.u from top t)
        group by e.usuario, date_trunc('hour', e.creado)) h
      group by h.u
    ), base as (
      select t.pos, t.u, t.xp_sem,
        coalesce((select sum(g.cantidad) from public.regalos g where g.usuario = t.u and g.tipo = 'xp' and g.creado >= ini and g.creado < fin), 0)::integer as reg,
        coalesce((select sum(j.xp_premio) from public.duelo_jugadas j where j.usuario = t.u and j.terminado >= ini and j.terminado < fin), 0)::integer as prem,
        (coalesce((select sum(p.total) from public.progreso p where p.usuario = t.u and p.actualizado >= ini and p.actualizado < fin), 0)
         + coalesce((select sum(s.correctas + s.incorrectas) from public.simulacro_intentos s where s.usuario = t.u and s.creado >= ini and s.creado < fin), 0))::integer as preg,
        coalesce(v.n, 0) as n, coalesce(v.resp, 0) as resp, coalesce(v.oks, 0) as oks, coalesce(v.hrs, 0) as hrs, coalesce(h.mx, 0) as mx,
        coalesce(v.xreg, 0) as xreg,
        exists (select 1 from public.xp_ajustes a where a.usuario = t.u and a.semana = lunes) as aj
      from top t left join env v on v.u = t.u left join hora h on h.u = t.u
    )
    select b.pos, b.u, p.nombre, p.apodo, au.email::text, b.xp_sem, b.reg, b.prem, b.preg,
      (case when b.preg > 0 then b.xreg / b.preg end)::integer, b.xreg,
      b.n, b.resp, (case when b.resp > 0 then round(100.0 * b.oks / b.resp) end)::integer, b.hrs, b.mx, b.aj,
      array_remove(array[
        case when b.xreg > 5000 and (b.preg = 0 or b.xreg / b.preg > 60)
             then 'Mucho XP para las preguntas que respondió' end,
        case when b.mx > 6000 then 'Más de 6' || chr(160) || '000 XP en una sola hora' end,
        case when b.resp >= 300 and b.oks = b.resp then 'Acertó el 100' || chr(160) || '% de ' || replace(to_char(b.resp, 'FM999G999G999'), ',', chr(160)) || ' respuestas' end,
        case when b.hrs > 16 * 7 or (b.hrs > 0 and b.hrs >= 16 * (extract(day from (least(now(), fin) - ini)) + 1)) then 'Activo casi todas las horas del día' end
      ], null),
      lunes
    from base b
    join auth.users au on au.id = b.u
    left join public.perfiles p on p.id = b.u
    order by b.pos;
end $$;
revoke all on function public.xp_revision(date) from public, anon;
grant execute on function public.xp_revision(date) to authenticated;

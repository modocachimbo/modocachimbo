-- =========================================================
-- Modo Cachimbo · Verificar el Top 10 de la semana
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo
-- este archivo → Run. Se puede volver a correr sin problema.
-- Necesita 50-revisar-trampas-xp.sql.
--
--   · xp_verificar_top(p_dia, p_n): los primeros p_n (10) de la semana con
--     lo que DICEN que respondieron (lo que la web mandó a sumar_xp) frente
--     a lo que DE VERDAD quedó registrado (Práctica, Repaso, Fijas, Exámenes
--     y Simulacro), las alertas de xp_revision y un veredicto:
--       trampa   → lo que dice no cuadra con lo registrado, o 2+ alertas
--       revisar  → 1 alerta
--       limpio   → nada raro
--   · «Volver a rango cero» en el panel usa xp_ajustar (archivo 50) con 0:
--     queda en 0 XP esa semana (sin rango) y queda anotado quién y por qué.
--
-- Seminarios, Banqueo, Duelo, Vocabulario y Flashcards no se registran
-- pregunta por pregunta: lo que se gana ahí no cuenta como contradicción
-- (sale aparte como «otras respuestas»).
-- =========================================================

create or replace function public.xp_verificar_top(p_dia date default null, p_n integer default 10)
returns table (
  puesto integer, usuario uuid, nombre text, apodo text, email text, xp integer,
  preguntas integer, resp_registrables integer, resp_otras integer,
  senales text[], veredicto text, ajustado boolean, desde date
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
    with rev as (
      select * from public.xp_revision(lunes) r where r.puesto <= least(greatest(coalesce(p_n, 10), 1), 50)
    ), env as (
      -- Lo que la web dijo que respondió, separado en lo que se puede comprobar y lo que no
      select e.usuario as u,
        sum(case when e.fuente in ('libro', 'repaso', 'fijas', 'examen', 'simulacro') then e.ok + e.mal else 0 end)::integer as reg,
        sum(case when e.fuente in ('libro', 'repaso', 'fijas', 'examen', 'simulacro') then 0 else e.ok + e.mal end)::integer as otras
      from public.xp_envios e
      where e.creado >= ini and e.creado < fin and e.usuario in (select r.usuario from rev r)
      group by e.usuario
    ), juntos as (
      select r.*, coalesce(v.reg, 0) as reg, coalesce(v.otras, 0) as otras,
        -- Dice que respondió mucho más de lo que quedó registrado. Se da margen
        -- porque la web guarda solo el último intento de cada tema.
        (coalesce(v.reg, 0) >= 100 and coalesce(v.reg, 0) > 4 * r.preguntas + 100) as contra
      from rev r left join env v on v.u = r.usuario
    )
    select j.puesto, j.usuario, j.nombre, j.apodo, j.email, j.xp, j.preguntas, j.reg, j.otras,
      case when j.contra
        then array['Dice que respondió ' || replace(to_char(j.reg, 'FM999G999G999'), ',', chr(160)) || ' preguntas, pero solo hay '
                   || replace(to_char(j.preguntas, 'FM999G999G999'), ',', chr(160)) || ' registradas'] || j.senales
        else j.senales end,
      case when j.ajustado and j.xp = 0 then 'cero'
           when j.contra or coalesce(array_length(j.senales, 1), 0) >= 2 then 'trampa'
           when coalesce(array_length(j.senales, 1), 0) = 1 then 'revisar'
           else 'limpio' end,
      j.ajustado, lunes
    from juntos j
    order by j.puesto;
end $$;
revoke all on function public.xp_verificar_top(date, integer) from public, anon;
grant execute on function public.xp_verificar_top(date, integer) to authenticated;

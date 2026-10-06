/* =========================================================
   Modo Cachimbo · Frase del día en el saludo del inicio
   4 frases por día de la semana. Cada semana toca la siguiente,
   así en un mes no se repite ninguna. Durante el día no cambia.
   Para editarlas: cambia el texto entre comillas.
   ========================================================= */
(function () {
  var FRASES = {
    0: [ // Domingo
      'Descanso activo: repasar con calma tus dudas de la semana es el mayor acto de amor propio hacia tus metas.',
      'Un momento de práctica hoy te dará la tranquilidad de empezar la semana con ventaja y la mente despejada.',
      'Cree en el proceso: las horas que nadie ve son las que te van a poner frente a la puerta de la universidad.',
      'Revisa tus apuntes, respira profundo y confía: estás mucho más cerca de lo que imaginas.'
    ],
    1: [ // Lunes
      'Arranca la semana: la vacante no llega por ósmosis, pero cada minuto que inviertes hoy construye tu ingreso.',
      'Que hoy tu determinación tenga más fuerza que los enlaces covalentes: empieza con el pie derecho.',
      'Tu relación con el pasado terminó, pero tu compromiso con tus sueños apenas empieza: a darle con todo.',
      'Mientras otros dudan frente a la pantalla, tú estás a solo 10 preguntas de dar un paso gigante.'
    ],
    2: [ // Martes
      'Si invertiste tanta energía en lo que no valía la pena, imagínate de lo que eres capaz cuando te enfocas en ti.',
      'Los tropiezos del camino enseñan, pero corregir tus errores en los simulacros te asegura la vacante.',
      'Ni buscando en límites infinitos vas a encontrar un mejor momento para superarte que este martes: ¡a resolver!',
      'Que tu esfuerzo diario sea directamente proporcional a la meta que quieres alcanzar.'
    ],
    3: [ // Miércoles
      'Mitad de semana: que tu enfoque produzca más energía que una mitocondria en plena faena. ¡Tú puedes!',
      'Superar momentos difíciles te hizo fuerte; resolver este bloque de ejercicios solo confirmará tu capacidad.',
      'Cuesta dominar las tildes y las fórmulas, pero la satisfacción de ver tu nombre en la lista de ingresantes lo vale todo.',
      'No te compares con el ritmo de nadie: tu constancia silenciosa de hoy será el gran resultado de mañana.'
    ],
    4: [ // Jueves
      'Tu cerebro tiene miles de millones de neuronas listas para brillar; confía en tu capacidad y ponlas a prueba.',
      'Casi es fin de semana, pero tu disciplina marca la diferencia entre soñar con la meta y vivirla.',
      'Dile adiós a la voz que te dice “mañana repaso”: tu futuro universitario se construye pregunta a pregunta, hoy.',
      'El camino preuniversitario es exigente, pero cada concepto dominado te acerca a la vida que quieres tener.'
    ],
    5: [ // Viernes
      'Viernes de silueta... silueta de quien no se rinde y tiene la meta clarísima. Cierra la semana con orgullo.',
      'Que tu convicción sea tan sólida e inquebrantable como un gas noble: nada te distrae de tu objetivo.',
      'Hay quienes buscan atajos y quienes construyen su ingreso con disciplina: estás en el camino correcto.',
      'Termina hoy sabiendo que diste lo mejor de ti; cada acierto suma y cada error corregido te hace invencible.'
    ],
    6: [ // Sábado
      'Sábado de simulacro: no le temas a equivocarte, cada error detectado hoy es un acierto garantizado en el examen.',
      'Si tu perseverancia se mantiene constante, no hay problema complejo que no puedas resolver.',
      'El pasado ya es historia; hoy tienes en tus manos la oportunidad de escribir el capítulo de tu ingreso.',
      'Regálate el orgullo de terminar el día diciendo: “hoy no me rendí y aprendí algo nuevo”.'
    ]
  };
  var hoy = new Date();
  var dias = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000);
  var semana = Math.floor((dias + 3) / 7); // semanas que empiezan en lunes
  var lista = FRASES[hoy.getDay()];
  window.MCFrase = lista[semana % lista.length];
  var el = document.getElementById('salFrase');
  if (el) el.textContent = window.MCFrase;
})();

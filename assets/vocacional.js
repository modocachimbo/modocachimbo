/* =========================================================
   Modo Cachimbo · Test vocacional (modelo RIASEC de Holland)
   - 48 actividades propias (8 por tipo), escritas para postulantes
     de la UNJFSC. El modelo de Holland es teoría de libre uso; las
     frases son nuestras (no se copian de ningún test con licencia).
   - Respuesta de 1 a 5 (caritas). Puntaje por tipo de 0 a 100.
   - Cada carrera tiene un código de 3 letras; el parecido sale de
     comparar ese código con el puntaje del alumno.
   - Las carreras vienen de assets/carreras.js (MCCarreras), así que
     si el panel agrega una carrera nueva, toma el código de su bloque
     hasta que se le ponga uno aquí en CODIGOS.
   ========================================================= */
(function () {
  var TIPOS = {
    R: { nombre: 'Realista', color: '#FF9600', frase: 'te gusta trabajar con tus manos, con máquinas, herramientas, plantas o animales, y ver resultados concretos.' },
    I: { nombre: 'Investigador', color: '#1CB0F6', frase: 'te gusta entender cómo funcionan las cosas, investigar, resolver problemas y trabajar con ciencia y datos.' },
    A: { nombre: 'Artístico', color: '#CE82FF', frase: 'te gusta crear, imaginar y expresarte con dibujo, música, palabras o diseño.' },
    S: { nombre: 'Social', color: '#FF6FA8', frase: 'te gusta ayudar, enseñar, cuidar y trabajar con personas.' },
    E: { nombre: 'Emprendedor', color: '#FFC800', frase: 'te gusta liderar, convencer, vender ideas y tomar decisiones.' },
    C: { nombre: 'Convencional', color: '#58CC02', frase: 'te gusta el orden, los números, organizar información y hacer las cosas con exactitud.' }
  };
  var ORDEN = ['R', 'I', 'A', 'S', 'E', 'C'];

  // 8 actividades por tipo. Se muestran intercaladas (R, I, A, S, E, C, R, I…)
  var ITEMS = {
    R: ['Reparar una bicicleta o una moto', 'Armar o arreglar un aparato eléctrico', 'Manejar maquinaria en una obra o una fábrica',
        'Construir un mueble con tus propias manos', 'Sembrar y cuidar cultivos en el campo', 'Instalar cables de luz o tuberías en una casa',
        'Criar y cuidar animales en una granja', 'Trabajar en un barco pesquero o en el puerto'],
    I: ['Hacer experimentos en un laboratorio', 'Investigar por qué aparece una enfermedad', 'Observar células o microbios con un microscopio',
        'Resolver problemas difíciles de matemática o física', 'Estudiar cómo se contaminan los ríos y el mar', 'Averiguar cómo funciona el cuerpo humano',
        'Analizar datos para descubrir algo nuevo', 'Leer sobre el universo, los planetas y las estrellas'],
    A: ['Dibujar, pintar o diseñar afiches', 'Tocar un instrumento o cantar en un grupo', 'Actuar en una obra de teatro o en un video',
        'Escribir cuentos, poemas o canciones', 'Grabar y editar videos para redes sociales', 'Tomar fotos artísticas',
        'Decorar o diseñar el interior de una casa', 'Diseñar ropa o accesorios'],
    S: ['Enseñar a niños a leer y escribir', 'Escuchar y aconsejar a un amigo con problemas', 'Cuidar a personas enfermas o adultos mayores',
        'Hacer voluntariado en tu comunidad', 'Explicarle un tema difícil a un compañero', 'Organizar juegos y actividades para niños',
        'Entrenar a un equipo deportivo', 'Orientar a jóvenes sobre su futuro'],
    E: ['Vender productos y convencer a los clientes', 'Poner tu propio negocio', 'Dirigir a un equipo de trabajo',
        'Ser el delegado o líder de tu salón', 'Negociar precios con proveedores', 'Hablar en público para presentar una idea',
        'Administrar un hotel o un restaurante', 'Hacer campaña para ganar una elección'],
    C: ['Llevar las cuentas de ingresos y gastos de un negocio', 'Ordenar documentos y archivos', 'Hacer tablas y cuadros en Excel',
        'Revisar que unos datos no tengan errores', 'Controlar el inventario de una tienda', 'Hacer trámites y llenar formularios',
        'Calcular sueldos y pagos de impuestos', 'Seguir un procedimiento paso a paso con exactitud']
  };
  var PREGUNTAS = [];
  for (var i = 0; i < 8; i++) ORDEN.forEach(function (t) { PREGUNTAS.push({ tipo: t, texto: ITEMS[t][i] }); });

  // Código de Holland de cada carrera de la UNJFSC (3 letras, de más a menos importante)
  var CODIGOS = {
    'Ingeniería civil': 'RIC', 'Ingeniería ambiental': 'RIS', 'Ingeniería de sistemas': 'ICE', 'Ingeniería industrial': 'ERC',
    'Ingeniería informática': 'ICR', 'Ingeniería agronómica': 'RIE', 'Ingeniería electrónica': 'RIC',
    'Ingeniería en industrias alimentarias': 'RIC', 'Ingeniería metalúrgica': 'RIC', 'Ingeniería pesquera': 'RIE',
    'Ingeniería zootécnica': 'RIS', 'Ingeniería química': 'IRC', 'Ingeniería acuícola': 'RIE', 'Matemática aplicada': 'ICA',
    'Estadística e informática': 'CIR',
    'Medicina humana': 'ISR', 'Enfermería': 'SIR', 'Bromatología y nutrición': 'ISC', 'Educación física y deportes': 'SRE',
    'Biología con mención en biotecnología': 'IRS',
    'Derecho y ciencias políticas': 'ESI', 'Trabajo social': 'SEA', 'Ciencias de la comunicación': 'AES', 'Sociología': 'ISA',
    'Educación inicial y arte': 'SAE', 'Educación primaria y problemas del aprendizaje': 'SAI',
    'Biología, química y tecnología de los alimentos': 'SIR', 'Ciencias sociales y turismo': 'SEI',
    'Lengua, comunicación e idioma inglés': 'ASE', 'Matemática, física e informática': 'SIC', 'Construcciones metálicas': 'RSC',
    'Administración': 'ECS', 'Ciencias contables y financieras': 'CEI', 'Economía y finanzas': 'IEC',
    'Gestión en turismo y hotelería': 'ESA', 'Negocios internacionales': 'ESC'
  };
  // Carrera nueva sin código: el de su bloque
  var POR_BLOQUE = { A: 'RIC', B: 'ISR', C: 'SAE', D: 'ECS' };

  // respuestas: arreglo de 48 valores 1..5 (o null). Devuelve { R: 0..100, … }
  function puntajes(resp) {
    var suma = {}, n = {};
    ORDEN.forEach(function (t) { suma[t] = 0; n[t] = 0; });
    PREGUNTAS.forEach(function (p, i) { var v = resp[i]; if (v >= 1 && v <= 5) { suma[p.tipo] += v; n[p.tipo]++; } });
    var out = {};
    ORDEN.forEach(function (t) { out[t] = n[t] ? Math.round((suma[t] / n[t] - 1) / 4 * 100) : 0; });
    return out;
  }
  // Las 3 letras más altas (empate: orden RIASEC)
  function codigo(p) {
    return ORDEN.slice().sort(function (a, b) { return p[b] - p[a] || ORDEN.indexOf(a) - ORDEN.indexOf(b); }).slice(0, 3).join('');
  }
  function codigoDe(carrera, bloqueId) {
    var n = window.MCCarreras ? window.MCCarreras.norm(carrera) : carrera;
    for (var k in CODIGOS) if ((window.MCCarreras ? window.MCCarreras.norm(k) : k) === n) return CODIGOS[k];
    return POR_BLOQUE[bloqueId] || 'RIC';
  }
  // Parecido 0..99: promedio ponderado (3-2-1) de tu puntaje en las letras de la carrera,
  // más un premio cuando esas letras también están en tu código (más si en el mismo lugar).
  function parecidoExacto(p, cod) {
    var w = [3, 2, 1], s = 0, bono = 0, top = codigo(p);
    for (var i = 0; i < 3; i++) {
      s += w[i] * (p[cod[i]] || 0);
      var j = top.indexOf(cod[i]);
      if (j === i) bono += w[i] * 1.6; else if (j >= 0) bono += w[i] * 0.8;
    }
    return Math.max(0, Math.min(99, s / 6 * 0.9 + bono));
  }
  function parecido(p, cod) { return Math.round(parecidoExacto(p, cod)); }
  // Todas las carreras ordenadas por parecido
  function ranking(p) {
    var lista = [];
    var bloques = window.MCCarreras ? window.MCCarreras.bloques : [];
    bloques.forEach(function (b) {
      (b.carreras || []).forEach(function (c) {
        var cod = codigoDe(c, b.id);
        var x = parecidoExacto(p, cod);
        lista.push({ carrera: c, bloque: b.id, bloqueNombre: b.nombre, codigo: cod, pct: Math.round(x), exacto: x });
      });
    });
    lista.sort(function (a, b) { return b.exacto - a.exacto || a.carrera.localeCompare(b.carrera); });
    return lista;
  }

  window.MCVocacional = { TIPOS: TIPOS, ORDEN: ORDEN, PREGUNTAS: PREGUNTAS, CODIGOS: CODIGOS, puntajes: puntajes, codigo: codigo, codigoDe: codigoDe, parecido: parecido, ranking: ranking };
})();

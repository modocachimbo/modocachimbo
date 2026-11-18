/* =========================================================
   Modo Cachimbo · Catálogo del Laboratorio
   Lo usan laboratorio.html (tarjetas) y descargas.html (paquetes de simuladores).
   Cada curso: [nombre, color, brillo, [[sim, título, subtítulo, 'listo'|'pronto', página], …]]
   PRECIO0: precio [energía, gratis] si todavía no llegó lo de Supabase (lab_sims).
   ========================================================= */
window.MC_LAB_CUR=[
 ['Biología','#55C23A','rgba(85,194,58,.22)',[['celula','Célula eucariota','Animal y vegetal · organelas en 3D','listo','lab-celula.html'],['mitosis','Mitosis y meiosis','Desde la interfase, fase por fase y animado','listo','lab-mitosis.html'],['punnett','Cruces de Mendel','Cuadro de Punnett animado con arvejas','listo','lab-punnett.html'],['adn','ADN y síntesis de proteínas','Replicación, transcripción y traducción','pronto']]],
 ['Química','#3AB4F0','rgba(58,180,240,.22)',[['tabla','Tabla periódica interactiva','Familias, tendencias y datos de los 118','listo','lab-tabla.html'],['atomo','Configuración electrónica','Serrucho, Hund, iones y números cuánticos','listo','lab-atomo.html'],['balanceo','Balanceo de ecuaciones','Moléculas, balanza y método del tanteo','listo','lab-balanceo.html']]],
 ['Física','#FF9600','rgba(255,150,0,.22)',[['parabolico','Tiro parabólico','Ángulo, velocidad, alcance y altura','listo','lab-parabolico.html'],['plano','Plano inclinado','Peso, normal, rozamiento y fuerza F','listo','lab-plano-inclinado.html'],['mru','MRU y MRUV','Gráficas x–t, v–t y a–t en vivo','listo','lab-mru.html'],['circuito','Circuitos eléctricos','Serie, paralelo y mixto con focos','listo','lab-circuito.html'],['optica','Lentes y espejos','Espejos cóncavos, convexos y lentes','listo','lab-optica.html']]],
 ['Anatomía','#E0458A','rgba(224,69,138,.22)',[['corazon','Corazón','Circulación mayor y menor','pronto'],['neurona','Neurona y sinapsis','El impulso nervioso','pronto'],['ojo','El ojo','Cómo se forma la imagen','pronto']]],
 ['Matemática','#9B6BFF','rgba(155,107,255,.22)',[['funcion','Funciones','Lineal, cuadrática, valor absoluto, raíz y exponencial','listo','lab-funciones.html'],['trigo','Circunferencia trigonométrica','Seno, coseno y tangente girando','listo','lab-trigo.html'],['geo','Triángulos notables','37°, 53°, 30°, 60°, 45° y más','listo','lab-triangulos.html']]]
];
/* Precios por si el servidor no respondió (los de verdad: tabla lab_sims) */
window.MC_LAB_PRECIO0={celula:[60,1],tabla:[40,1],parabolico:[40,0],corazon:[60,0],funcion:[40,0],adn:[60,0]};

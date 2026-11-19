/* =========================================================
   Modo Cachimbo · Temas fijos (beta)
   Qué temas vinieron en cada examen de admisión, por modalidad (CPU, Ordinario), desde 2020-I.
   Cada tema lleva una cadena de 1 y 0, una letra por examen, en el mismo
   orden que "examenes" (1 = vino, 0 = no vino).
   Por ahora los datos viven aquí; más adelante se pegarán desde el panel.
   ========================================================= */
window.MC_TEMAS_FIJOS = {
  cpu: {
  examenes: ['2020-I','2020-II','2021-I','2021-II','2022-I','2022-II','2023-I','2023-II','2024-I','2024-II','2024-III','2025-I','2025-II','2025-III','2026-I'],
  cursos: {
    biologia: [
      ['Biología como ciencia',        '000000000000100'],
      ['Origen de la vida y evolución','010111001010000'],
      ['Bioelementos',                 '000000000001001'],
      ['Biomoléculas inorgánicas',     '000000010001000'],
      ['Glúcidos y lípidos',           '000000000111000'],
      ['Proteínas y ácidos nucleicos', '000101000110001'],
      ['Virus y procariota',           '000001100011100'],
      ['Célula eucariota',             '100110001010100'],
      ['Metabolismo celular',          '001000111100000'],
      ['Ciclo celular',                '011000001100100'],
      ['Genética',                     '010010100100000'],
      ['Taxonomía',                    '100000010101101'],
      ['Ecología',                     '100000000011001']
    ]
  }
  },
  ordinario: { examenes: [], cursos: {} }
};

/**
 * Data Awal / Seed Bangsal & Bed RSUD Dr. M. Soewandhie
 * 22 Unit / Bangsal dengan total kapasitas 384 tempat tidur
 */

export const INITIAL_WARDS_DATA = [
  { id: 'IGD', name: 'IGD & TRIAGE', total: 24, occupied: 18, inden: 4, prereferral: 1, available: 2 },
  { id: 'DAHLIA', name: 'DAHLIA', total: 28, occupied: 22, inden: 3, prereferral: 0, available: 3 },
  { id: 'MAWAR', name: 'MAWAR', total: 24, occupied: 19, inden: 2, prereferral: 0, available: 3 },
  { id: 'MELATI', name: 'MELATI', total: 26, occupied: 21, inden: 1, prereferral: 0, available: 4 },
  { id: 'WIJAYA_KUSUMA', name: 'WIJAYA KUSUMA', total: 30, occupied: 24, inden: 2, prereferral: 0, available: 4 },
  { id: 'ASOKA', name: 'ASOKA', total: 20, occupied: 15, inden: 1, prereferral: 0, available: 4 },
  { id: 'BOUGENVILLE', name: 'BOUGENVILLE', total: 24, occupied: 20, inden: 2, prereferral: 0, available: 2 },
  { id: 'SERUNI', name: 'SERUNI', total: 57, occupied: 49, inden: 2, prereferral: 0, available: 6 },
  { id: 'ANGGREK', name: 'ANGGREK', total: 32, occupied: 29, inden: 1, prereferral: 0, available: 2 },
  { id: 'TERATAI', name: 'TERATAI', total: 35, occupied: 28, inden: 2, prereferral: 0, available: 5 },
  { id: 'VK', name: 'VK BERSALIN', total: 11, occupied: 4, inden: 0, prereferral: 0, available: 7 },
  { id: 'LAVENDER', name: 'LAVENDER', total: 10, occupied: 3, inden: 3, prereferral: 0, available: 4 },
  { id: 'ICU', name: 'ICU', total: 9, occupied: 4, inden: 0, prereferral: 0, available: 5 },
  { id: 'ICCU', name: 'ICCU', total: 8, occupied: 4, inden: 0, prereferral: 0, available: 4 },
  { id: 'BURN', name: 'BURN UNIT', total: 2, occupied: 0, inden: 0, prereferral: 0, available: 2 },
  { id: 'ICU_ISO', name: 'ICU ISO', total: 2, occupied: 0, inden: 0, prereferral: 0, available: 2 },
  { id: 'MICU', name: 'MICU', total: 3, occupied: 3, inden: 0, prereferral: 0, available: 0 },
  { id: 'ISU', name: 'ISU', total: 5, occupied: 3, inden: 2, prereferral: 0, available: 0 },
  { id: 'NICU', name: 'NICU', total: 8, occupied: 0, inden: 2, prereferral: 0, available: 6 },
  { id: 'NEONATUS', name: 'NEONATUS', total: 15, occupied: 11, inden: 0, prereferral: 0, available: 4 },
  { id: 'EDELWEIS_2', name: 'EDELWEIS LT.2', total: 19, occupied: 9, inden: 0, prereferral: 0, available: 10 },
  { id: 'EDELWEIS_3', name: 'EDELWEIS LT.3', total: 12, occupied: 7, inden: 0, prereferral: 0, available: 5 }
];

export const INITIAL_IGD_QUEUE = [
  { id: 'q-1', queue_number: 'Q-01', bed: 'K1', name: 'Wagini', diag: 'Obs penkes ec CVA + Afasia global + DM Hiperglikemia + HT emergency', consult: 'C+ J+ dr Dian, dr Eryn, dr Niken', target: 'Teratai', triage_level: 'P1' },
  { id: 'q-2', queue_number: 'Q-02', bed: 'K2', name: 'Ny. Munati', diag: 'Obs penkes ec susp ensefalopati sepsis + hiperpirexia + s ISK + DM', consult: 'C dr Agung J+', target: 'Inden Medik', triage_level: 'P1' },
  { id: 'q-3', queue_number: 'Q-03', bed: 'K3', name: 'An. Alkhalifi Naufal', diag: 'Anemia gravis + pansitopenia + hiperleukositosis', consult: 'C dr. Shinta J 1/2', target: 'Hemato Onko', triage_level: 'P2' },
  { id: 'q-4', queue_number: 'Q-04', bed: 'K4', name: 'Ny. Emmy', diag: 'Obs penurunan kesadaran susp Encephalopati Metabolik + Hematemesis', consult: 'C dr. Agung J-', target: 'Inden Medik No.4', triage_level: 'P1' },
  { id: 'q-5', queue_number: 'Q-05', bed: 'K5', name: 'Ny. Sri Murtiarti', diag: 'Post koma hipoglikemia', consult: 'C-', target: 'DAHLIA', triage_level: 'P2' },
  { id: 'q-6', queue_number: 'Q-06', bed: 'K6', name: 'Tn. Subari', diag: 'Obs penkes ec susp CVA dd ensefalopati + ulkus femur D + DM', consult: 'C dr Dian J+, dr Aisah J+, dr Eryn J+', target: 'Teratai / ISU', triage_level: 'P1' },
  { id: 'q-7', queue_number: 'Q-07', bed: 'K8', name: 'Ny. Luluk Uljannah', diag: 'Abdominal pain susp peritonitis dd appendisitis perforasi', consult: 'C dr Esa J 1/2', target: 'BGV Bedah', triage_level: 'P2' },
  { id: 'q-8', queue_number: 'Q-08', bed: 'K10', name: 'Ny. Ngadiyem', diag: 'Obs penurunan kesadaran susp CVA bleeding + gagal napas + hipotensi', consult: 'C dr Dian J 1/2, dr Angela J+', target: 'ISU / Inden ICU', triage_level: 'P1' }
];

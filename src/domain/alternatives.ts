export type EquipmentAlternative = Readonly<{
  name: string;
  equipment: string;
  setup: string;
  caution: string;
  suggestedLoadKg?: (originalLoadKg?: number) => number | undefined;
}>;

export const equipmentAlternatives: Readonly<Record<string, EquipmentAlternative>> = Object.freeze({
  'coiffe-rotateurs': {
    name: 'Rotation externe avec haltère léger',
    equipment: 'Haltère léger, couché sur le côté',
    setup: 'Garde le coude collé au corps et conserve 10 répétitions par bras.',
    caution: 'Utilise une charge très légère et un mouvement lent.',
    suggestedLoadKg: () => 2,
  },
  bosu: {
    name: 'Équilibre unipodal au sol',
    equipment: 'Aucun matériel, près d’un support stable',
    setup: 'Conserve 3 séries de 20 secondes par jambe.',
    caution: 'Reste près d’un mur ou d’un montant pour te rattraper.',
  },
  rameur: {
    name: 'Vélo à intensité moyenne',
    equipment: 'Vélo cardio',
    setup: 'Conserve exactement la même durée et le même repos.',
    caution: 'Reste à une intensité d’échauffement, sans chercher un sprint.',
  },
  velo: {
    name: 'Rameur à intensité moyenne',
    equipment: 'Rameur',
    setup: 'Conserve exactement la même durée et le même repos.',
    caution: 'Garde le dos neutre et une allure progressive.',
  },
  'presse-cuisses-inclinee': {
    name: 'Goblet squat',
    equipment: 'Un haltère tenu contre la poitrine',
    setup: 'Conserve les répétitions et les repos du PDF. Ajuste la charge pour garder 2 à 3 répétitions en réserve.',
    caution: 'Ne reprends pas les kilogrammes de la presse : la charge n’est pas comparable.',
    suggestedLoadKg: (orig) => (orig ? Math.min(32, Math.max(12, Math.round((orig * 0.25) / 2) * 2)) : 20),
  },
  'leg-curl-allonge': {
    name: 'Leg curl assis',
    equipment: 'Machine leg curl assis',
    setup: 'Conserve les répétitions et le repos prescrits.',
    caution: 'Réajuste la charge : les valeurs des deux machines ne sont pas directement comparables.',
    suggestedLoadKg: (orig) => (orig ? Math.max(10, Math.round((orig * 0.8) / 2) * 2) : 25),
  },
  'chest-press': {
    name: 'Développé couché avec haltères',
    equipment: 'Banc plat et deux haltères',
    setup: 'Conserve les répétitions et le repos prescrits.',
    caution: 'Commence léger : la charge de la machine ne se transpose pas aux haltères.',
    suggestedLoadKg: (orig) => (orig ? Math.max(8, Math.round((orig * 0.4) / 2) * 2) : 16),
  },
  'tirage-horizontal': {
    name: 'Rowing haltère, buste appuyé',
    equipment: 'Banc incliné et haltères',
    setup: 'Conserve les répétitions et le repos prescrits.',
    caution: 'Choisis une charge contrôlable sans tirer avec les lombaires.',
    suggestedLoadKg: (orig) => (orig ? Math.max(8, Math.round((orig * 0.45) / 2) * 2) : 16),
  },
  'squat-smith': {
    name: 'Goblet squat',
    equipment: 'Un haltère tenu contre la poitrine',
    setup: 'Conserve les répétitions et les repos du PDF.',
    caution: 'Ne transpose pas la charge de la Smith machine ; commence plus léger.',
    suggestedLoadKg: (orig) => (orig ? Math.min(28, Math.max(10, Math.round((orig * 0.5) / 2) * 2)) : 18),
  },
  'leg-extension': {
    name: 'Spanish squat',
    equipment: 'Sangle épaisse ou élastique solide fixé derrière les genoux',
    setup: 'Conserve les répétitions et le repos prescrits, avec une amplitude confortable.',
    caution: 'Vérifie la solidité du point d’ancrage avant de commencer.',
  },
  'developpe-couche-machine': {
    name: 'Développé couché avec haltères',
    equipment: 'Banc plat et deux haltères',
    setup: 'Conserve les répétitions et le repos prescrits.',
    caution: 'Commence léger : la charge de la machine ne se transpose pas aux haltères.',
    suggestedLoadKg: (orig) => (orig ? Math.max(10, Math.round((orig * 0.35) / 2) * 2) : 18),
  },
  'tirage-vertical': {
    name: 'Tractions assistées prise neutre',
    equipment: 'Machine de tractions assistées',
    setup: 'Conserve les répétitions et le repos prescrits.',
    caution: 'Choisis assez d’assistance pour garder une exécution complète et contrôlée.',
  },
  skierg: {
    name: 'Corde ondulatoire, mouvement simultané',
    equipment: 'Battle rope',
    setup: 'Conserve la durée et le repos du circuit.',
    caution: 'Reste à une intensité régulière et garde le tronc gainé.',
  },
  'developpe-clavicule': {
    name: 'Développé épaules à la machine',
    equipment: 'Machine à épaules, prise neutre si possible',
    setup: 'Conserve la durée et le repos du circuit.',
    caution: 'Ajuste la charge : les kilogrammes ne sont pas comparables aux haltères.',
    suggestedLoadKg: (orig) => (orig ? Math.round(orig * 1.5) : 8),
  },
  'cooldown-full-body-a': {
    name: 'Marche dans la salle',
    equipment: 'Aucun matériel',
    setup: 'Marche 5 minutes à une allure proche de 5 km/h.',
    caution: 'L’objectif est de redescendre progressivement en intensité.',
  },
  'cooldown-full-body-b': {
    name: 'Marche dans la salle',
    equipment: 'Aucun matériel',
    setup: 'Marche rapidement pendant 5 minutes.',
    caution: 'L’objectif est de redescendre progressivement en intensité.',
  },
  'cooldown-cardio': {
    name: 'Marche dans la salle',
    equipment: 'Aucun matériel',
    setup: 'Marche rapidement pendant 5 minutes.',
    caution: 'L’objectif est de redescendre progressivement en intensité.',
  },
});

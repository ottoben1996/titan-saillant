import type { Tutorial } from './types';

/**
 * Contenu pédagogique des exercices réellement prescrits par `programs.ts`
 * (échauffements, séries de travail, finishers et retours au calme).
 *
 * Vocabulaire volontairement constant d'une fiche à l'autre : « omoplates
 * serrées », « gainage », « appui », « bassin plaqué », « souffle à l'effort ».
 */
const tutorial = (
  exerciseId: string,
  title: string,
  muscles: string[],
  equipment: string[],
  position: string,
  steps: string[],
  commonMistakes: string[],
  safety: string[],
  extra?: {
    youtubeShortId?: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    tempoRecommended?: string;
    keyCue?: string;
  }
): Tutorial => ({
  exerciseId,
  title,
  muscles,
  equipment,
  position,
  steps,
  commonMistakes,
  safety,
  ...extra,
});

export const tutorials: Readonly<Record<string, Tutorial>> = {
  'coiffe-rotateurs': tutorial(
    'coiffe-rotateurs',
    'Coiffe des rotateurs',
    ['Épaules', 'coiffe des rotateurs'],
    ['Élastique ou poulie'],
    'Debout ou assis, coude collé au flanc et plié à 90°, avant-bras devant le ventre. Épaule basse, omoplate serrée contre la cage thoracique. La résistance part à hauteur du coude, dans l’axe du bras.',
    [
      'Place le coude contre le flanc et garde-le fixe comme une charnière pendant toute la série.',
      'Écarte l’avant-bras vers l’extérieur sans décoller le coude, en soufflant lentement.',
      'Marque une seconde d’arrêt quand l’avant-bras arrive dans l’axe du corps.',
      'Reviens au point de départ sur deux temps, en inspirant, sans laisser l’élastique ramener le bras d’un coup.',
    ],
    [
      'Le coude se décolle du flanc dès que la résistance augmente : reprends une tension plus légère.',
      'Le buste tourne pour aider le bras : garde tronc et bassin immobiles, seul l’avant-bras travaille.',
      'Le mouvement part avec un élan : la coiffe se travaille lentement, jamais lancée.',
    ],
    [
      'Choisis une tension légère ; une gêne à l’épaule qui persiste après la série signale une charge à réduire.',
      'Arrête la série en cas de douleur vive ou de craquement douloureux à l’épaule.',
    ],
    {
      youtubeShortId: 'fuWq7fg74dc',
      primaryMuscles: ['Épaules'],
      tempoRecommended: '2-1-2-0',
      keyCue: 'Le coude ne bouge pas, seul l’avant-bras tourne',
    }
  ),
  bosu: tutorial(
    'bosu',
    'Équilibre sur bosu',
    ['Jambes', 'gainage'],
    ['Bosu'],
    'Monte au centre du bosu, pied bien à plat, jambes légèrement fléchies. Regard fixe devant toi, sur un repère à hauteur d’yeux. Bras légèrement écartés pour corriger l’équilibre.',
    [
      'Monte au centre du bosu en appui sur la jambe, puis transfère le poids progressivement.',
      'Tiens sur une jambe 20 secondes, genou souple, en fixant un point devant toi.',
      'À mi-série, pose le pied au sol et change de jambe proprement.',
      'Respire normalement, sans bloquer, même quand l’équilibre devient instable.',
    ],
    [
      'Le regard descend vers les pieds : lève les yeux vers un point fixe pour stabiliser la position.',
      'Le genou se verrouille pour compenser l’instabilité : garde-le légèrement fléchi.',
      'La descente se fait d’un coup : pose le pied au sol en contrôlant avant de lâcher l’autre.',
    ],
    [
      'Reste près d’un mur ou d’un montant pour te rattraper si l’équilibre part.',
      'Descends du bosu dès que la cheville ou le genou signale une douleur.',
    ],
    {
      youtubeShortId: 'MGNzdT5eiRo',
      primaryMuscles: ['Jambes', 'Gainage'],
      keyCue: 'Regard fixe devant, appui au centre du bosu',
    }
  ),
  rameur: tutorial(
    'rameur',
    'Rameur',
    ['Dos', 'jambes', 'bras'],
    ['Rameur'],
    'Assis sur le siège, pieds sanglés sur les cale-pieds, tibias verticaux en position d’attaque. Dos neutre, gainage léger, bras tendus devant toi.',
    [
      'Attaque : jambes fléchies, buste légèrement penché, bras tendus, épaules relâchées.',
      'Pousse fort dans les jambes en gardant le buste penché et les bras tendus.',
      'Jambes presque tendues, ouvre le buste puis ramène la poignée au bas des côtes en soufflant.',
      'Reviens dans l’ordre inverse : bras, puis buste, puis jambes, en inspirant.',
    ],
    [
      'Les bras tirent avant les jambes : la puissance vient des jambes, les bras finissent le geste.',
      'Le dos s’arrondit en fin de tirage : gaine le tronc et garde la poitrine ouverte.',
      'Le retour se fait avec un à-coup : enchaîne les mouvements dans l’ordre inverse, sans télégraphier.',
    ],
    [
      'Règle la résistance et serre les sangles avant de commencer pour éviter que les pieds glissent.',
      'Réduis la puissance si le bas du dos se charge en fin de séance.',
    ],
    {
      youtubeShortId: 'soveq2xBNpo',
      primaryMuscles: ['Dos', 'Jambes'],
      secondaryMuscles: ['Bras'],
      tempoRecommended: 'Cadence régulière : tirage puissant, retour fluide',
      keyCue: 'Jambes, buste, bras à l’aller ; l’inverse au retour',
    }
  ),
  velo: tutorial(
    'velo',
    'Vélo',
    ['Jambes', 'cardio'],
    ['Vélo cardio'],
    'Selle réglée à hauteur de hanche, jambe presque tendue en bas de course avec le genou légèrement fléchi. Buste relâché, mains posées sans crispation sur le guidon.',
    [
      'Règle la selle à hauteur de hanche, puis vérifie que le genou reste légèrement fléchi en bas de course.',
      'Pédale à intensité moyenne, à cadence régulière, sans résistance excessive.',
      'Garde les épaules basses et les mains détendues, le buste accompagne légèrement la cadence.',
      'Respire régulièrement : tu dois pouvoir dire une courte phrase à cette allure.',
    ],
    [
      'Les épaules montent vers les oreilles : relâche le haut du corps, les jambes font le travail.',
      'La selle est trop basse et le genou plie fortement en haut : remonte la selle d’un cran.',
      'Le buste reste crispé et figé : laisse une légère oscillation accompagner la cadence.',
    ],
    [
      'Engage les pieds dans les cale-pieds ou les sangles avant d’accélérer.',
      'Arrête d’appuyer si un genou chauffe ou si le souffle devient saccadé.',
    ],
    {
      youtubeShortId: 'eHlLVxr6N_U',
      primaryMuscles: ['Jambes'],
      keyCue: 'Jambes régulières, haut du corps relâché',
    }
  ),
  'presse-cuisses-inclinee': tutorial(
    'presse-cuisses-inclinee',
    'Presse à cuisse inclinée',
    ['Quadriceps', 'fessiers'],
    ['Presse inclinée'],
    'Dos et bassin plaqués contre le dossier, pieds écartés largeur du bassin au milieu du plateau, orteils légèrement ouverts. Mains aux poignées latérales, tête posée.',
    [
      'Pose les pieds au centre du plateau, largeur du bassin, et plaque le bas du dos contre le dossier.',
      'Déverrouille les sécurités, puis descends en contrôlant sur trois temps jusqu’à sentir l’étirement des cuisses.',
      'Pousse dans les talons et le milieu du pied en soufflant, sans verrouiller les genoux en fin de course.',
      'Garde une seconde en haut avant de redescendre pour enchaîner la série suivante.',
    ],
    [
      'Le bassin décolle du dossier en fin de descente : réduis l’amplitude et garde le contact.',
      'Les genoux se verrouillent d’un coup en haut : termine la poussée sans les claquer.',
      'Les genoux partent vers l’intérieur à la montée : pousse dans les orteils et garde-les dans l’axe.',
    ],
    [
      'Réduis l’amplitude dès qu’une tension vive apparaît à l’arrière du genou : ne cherche pas la descente maximale.',
      'Vérifie que les sécurités sont en place avant de charger la machine.',
    ],
    {
      youtubeShortId: 'EotSw18oR9w',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
      secondaryMuscles: ['Ischio-jambiers', 'Mollets'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Talons bien vissés au plateau, bas du dos collé',
    }
  ),
  'leg-curl-allonge': tutorial(
    'leg-curl-allonge',
    'Leg curl allongé',
    ['Ischio-jambiers'],
    ['Machine leg curl'],
    'Allongé sur le ventre, genoux au bord du banc, chevilles sous les rouleaux, bassin plaqué au banc. Mains aux poignées, front posé.',
    [
      'Allonge-toi ventre sur le banc, cale les chevilles sous le rouleau et plaque le bassin.',
      'Fléchis les genoux en ramenant les talons vers les fessiers, sans décoller le bassin.',
      'Marque une seconde de contraction en haut, hanches toujours au contact du banc.',
      'Redescends lentement sur trois temps, jusqu’à presque tendre les jambes, sans lâcher la charge.',
    ],
    [
      'Le bassin se soulève pour finir la répétition : la charge est trop lourde, réduis-la.',
      'Le retour se fait en chute libre : la phase négative se contrôle, sinon l’exercice perd son intérêt.',
      'Le dos se cambre quand la charge résiste : garde le ventre posé et le bassin plaqué.',
    ],
    [
      'Arrête en cas de crampe ou de pointe vive à l’arrière de la cuisse, et réduis la charge au besoin.',
      'Ajuste le rouleau juste au-dessus des talons pour ne pas tirer sur la cheville.',
    ],
    {
      youtubeShortId: 'lGNeJsdqJwg',
      primaryMuscles: ['Ischio-jambiers'],
      tempoRecommended: '3-0-1-1',
      keyCue: 'Bassin collé au banc, contraction une seconde en haut',
    }
  ),
  'chest-press': tutorial(
    'chest-press',
    'Chest press machine',
    ['Pectoraux', 'triceps'],
    ['Machine chest press'],
    'Assis, dos contre le dossier, omoplates basses et serrées, poignées au milieu du torse. Pieds à plat, coudes sous les poignées.',
    [
      'Règle le siège pour que les poignées arrivent au milieu du torse, puis plaque le dos et serre les omoplates.',
      'Pousse devant toi en soufflant, sans hausser les épaules ni verrouiller brutalement les coudes.',
      'Reviens lentement jusqu’à sentir un léger étirement des pectoraux, omoplates toujours stables.',
      'Enchaîne la répétition suivante sans relâcher complètement la tension en bas de course.',
    ],
    [
      'Les épaules montent vers les oreilles pendant la poussée : garde les omoplates basses et serrées de bout en bout.',
      'Les coudes se verrouillent violemment : termine bras presque tendus, sans claquer l’articulation.',
      'Le dos se décolle du dossier pour pousser plus fort : la charge est trop lourde, réduis-la.',
    ],
    [
      'Choisis une charge qui te laisse contrôler la phase de retour : ne force jamais sur l’articulation de l’épaule.',
      'Arrête en cas de douleur vive à l’épaule ou à la poitrine.',
    ],
    {
      youtubeShortId: 'Qu7-ceCvq7w',
      primaryMuscles: ['Pectoraux'],
      secondaryMuscles: ['Épaules', 'Triceps'],
      tempoRecommended: '2-0-1-0',
      keyCue: 'Omoplates serrées avant chaque poussée',
    }
  ),
  'tirage-horizontal': tutorial(
    'tirage-horizontal',
    'Tirage horizontal prise serrée',
    ['Dos', 'biceps'],
    ['Poulie basse'],
    'Assis, pieds calés contre le support, genoux légèrement fléchis. Buste droit, gainage léger, bras tendus vers la poulie.',
    [
      'Assieds-toi, cale les pieds et attrape la poignée bras tendus, buste droit.',
      'Tire les coudes vers l’arrière en rapprochant les omoplates, sans pencher le buste.',
      'Amène la poignée vers le nombril ou le bas des côtes en soufflant, coudes le long du corps.',
      'Reviens lentement bras tendus, en laissant les omoplates s’ouvrir sous contrôle.',
    ],
    [
      'Le buste se balance en arrière pour tirer plus lourd : reste droit et laisse les coudes faire le travail.',
      'Les épaules montent vers les oreilles : garde-les basses, c’est le dos qui travaille.',
      'Le retour se fait en lâchant la résistance : accompagne la poignée jusqu’au bout des bras.',
    ],
    [
      'Ne tire jamais la poignée derrière la nuque ni vers le haut du torse : reste au niveau du ventre.',
      'Réduis la charge si les lombaires se chargent en fin de série.',
    ],
    {
      youtubeShortId: 'CprcFM98rlY',
      primaryMuscles: ['Dorsaux'],
      secondaryMuscles: ['Biceps', 'Trapèzes'],
      tempoRecommended: '2-1-1-0',
      keyCue: 'Coudes vers l’arrière, omoplates serrées',
    }
  ),
  'jumping-jack': tutorial(
    'jumping-jack',
    'Jumping Jack',
    ['Cardio', 'jambes'],
    ['Aucun'],
    'Debout, pieds joints, bras le long du corps, genoux souples. Appuis sûrs sur tout le pied.',
    [
      'Pars debout, pieds joints, bras le long du corps, genoux légèrement fléchis.',
      'Écarte les pieds et monte les bras au-dessus de la tête en soufflant.',
      'Reviens pieds joints, bras au corps, en réceptionnant souplement.',
      'Enchaîne au rythme d’une respiration fluide, sans t’arrêter entre les répétitions.',
    ],
    [
      'La réception se fait jambes tendues et talons qui claquent : fléchis les genoux à chaque retour.',
      'La respiration est bloquée pendant l’effort : souffle à chaque ouverture.',
      'Les appuis restent sur la pointe sans contrôle : reste réactif mais pose le pied à plat.',
    ],
    [
      'Réduis l’amplitude et le rythme si le souffle se saccade ou si les appuis deviennent douloureux.',
      'Passe en pas chassés si les sauts fatiguent les genoux ou les chevilles.',
    ],
    {
      youtubeShortId: 'FVltHbdTZQ0',
      primaryMuscles: ['Cardio', 'Jambes'],
      keyCue: 'Réception souple, respiration continue',
    }
  ),
  'gainage-planche': tutorial(
    'gainage-planche',
    'Gainage planche',
    ['Abdominaux', 'épaules'],
    ['Tapis'],
    'Appui sur les avant-bras, coudes sous les épaules, mains dans l’axe. Corps aligné des talons à la tête, bassin ni haut ni bas, gainage actif.',
    [
      'Place les coudes sous les épaules, avant-bras au sol, pieds largeur du bassin.',
      'Monte le bassin jusqu’à aligner épaules, hanches et chevilles.',
      'Contracte abdos et fessiers, omoplates serrées, en respirant calmement.',
      'Maintiens la position jusqu’à la fin du chrono, sans creuser ni monter les hanches.',
    ],
    [
      'Les hanches s’affaissent progressivement : rattrape en serrant fessiers et abdos, ou raccourcis la série.',
      'Les fesses montent pour soulager le ventre : reviens à l’alignement, quitte à tenir moins longtemps.',
      'La respiration est bloquée : garde un souffle régulier, signe d’un gainage tenu et non crispé.',
    ],
    [
      'Arrête la position si le bas du dos pique : repose les genoux et reprends avec un appui plus haut.',
      'Préfère une série plus courte bien alignée à une série longue avec le dos creusé.',
    ],
    {
      youtubeShortId: 'v25dawSzRTM',
      primaryMuscles: ['Abdominaux'],
      secondaryMuscles: ['Épaules'],
      keyCue: 'Une ligne des talons à la tête, respiration calme',
    }
  ),
  'squat-smith': tutorial(
    'squat-smith',
    'Squat smith machine',
    ['Cuisses', 'fessiers'],
    ['Smith machine'],
    'Barre au niveau des trapèzes, pieds légèrement avancés sous la barre, écart largeur des épaules. Dos plaqué à la barre, gainage serré, orteils légèrement ouverts.',
    [
      'Place la barre au niveau des trapèzes et avance les pieds pour que la descente reste guidée par la machine.',
      'Descends en poussant les fesses en arrière jusqu’à une amplitude confortable, en inspirant.',
      'Arrête quand le bas du dos commence à s’arrondir, puis remonte en poussant dans les talons en soufflant.',
      'Termine debout genoux souples, sans les claquer, puis enchaîne la répétition suivante.',
    ],
    [
      'Les genoux rentrent vers l’intérieur à la remontée : pousse-les vers l’extérieur, dans l’axe des orteils.',
      'Le bas du dos s’arrondit en fin de descente : remonte, c’est la limite d’amplitude du jour.',
      'Les talons se décollent : répartis le poids sur tout le pied et recule un peu les appuis si besoin.',
    ],
    [
      'Sécurise les crochets de la Smith avant la série et tourne les mains d’un cran pour verrouiller la barre.',
      'Réduis l’amplitude dès qu’une gêne apparaît au genou ou au bas du dos.',
    ],
    {
      youtubeShortId: 'SDN28-YuxAU',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
      secondaryMuscles: ['Ischio-jambiers'],
      tempoRecommended: '3-1-1-0',
      keyCue: 'Genoux dans l’axe des orteils, buste solide',
    }
  ),
  'leg-extension': tutorial(
    'leg-extension',
    'Leg extension',
    ['Quadriceps'],
    ['Machine leg extension'],
    'Assis, dos contre le dossier, genou aligné avec l’axe de rotation de la machine. Tibias sous le rouleau, poignées tenues.',
    [
      'Règle le dossier pour que le genou soit dans l’axe de la machine, tibias contre le rouleau.',
      'Tends les jambes en soufflant, sans verrouiller violemment les genoux.',
      'Marque une seconde de contraction en haut, quadriceps serrés.',
      'Redescends en contrôlant sur deux temps, sans laisser la charge retomber.',
    ],
    [
      'La charge est balancée avec élan : la phase de retour doit être aussi contrôlée que la montée.',
      'Les genoux se verrouillent d’un coup en haut : tends les jambes sans claquer l’articulation.',
      'Le bassin se décolle du siège : baisse la charge pour rester assis stable.',
    ],
    [
      'Réduis l’amplitude si le genou craque de façon douloureuse et reste dans le secteur indolore.',
      'Ne cherche pas à ajouter de charge si la forme se dégrade en fin de séance de jambes.',
    ],
    {
      youtubeShortId: 'uM86QE59Tgc',
      primaryMuscles: ['Quadriceps'],
      tempoRecommended: '2-0-1-1',
      keyCue: 'Contraction tenue une seconde, retour contrôlé',
    }
  ),
  'developpe-couche-machine': tutorial(
    'developpe-couche-machine',
    'Développé couché machine convergente',
    ['Pectoraux', 'triceps'],
    ['Machine convergente'],
    'Assis ou allongé selon la machine, omoplates serrées et basses contre le dossier, cage thoracique bombée. Poignées à hauteur des pectoraux, pieds au sol.',
    [
      'Règle le siège pour que les poignées arrivent au niveau du haut des pectoraux, puis plaque le dos.',
      'Serre les omoplates et bombe légèrement la cage thoracique avant de pousser.',
      'Pousse les poignées en avant et légèrement vers l’intérieur en soufflant, sans décoller le dos.',
      'Reviens lentement jusqu’à l’étirement des pectoraux, omoplates toujours stables.',
    ],
    [
      'Le dos se cambre et décolle du dossier : la charge est trop lourde, garde le contact.',
      'Les poignées descendent trop bas et tirent sur l’épaule : limite l’amplitude au secteur confortable.',
      'Les épaules montent vers les oreilles pendant la poussée : garde-les basses et serrées.',
    ],
    [
      'Arrête la série en cas de douleur vive à l’épaule : ne descends pas plus bas que le confortable.',
      'Vérifie le réglage du siège avant de charger pour éviter une amplitude d’épaule excessive.',
    ],
    {
      youtubeShortId: 'E7fl51PkEn4',
      primaryMuscles: ['Pectoraux'],
      secondaryMuscles: ['Triceps', 'Épaules'],
      tempoRecommended: '3-1-1-0',
      keyCue: 'Cage thoracique bombée, omoplates serrées',
    }
  ),
  'tirage-vertical': tutorial(
    'tirage-vertical',
    'Tirage vertical prise neutre',
    ['Dos', 'biceps'],
    ['Poulie haute'],
    'Assis, genoux calés sous les coussins, buste droit, gainage léger. Prise neutre, poignées au-dessus des épaules, bras tendus.',
    [
      'Cale les genoux sous les coussins et attrape la barre en prise neutre, bras tendus.',
      'Abaisse les épaules d’abord, puis fléchis les coudes en tirant vers le haut du torse.',
      'Amène la barre au niveau des clavicules en soufflant, buste immobile.',
      'Remonte la barre lentement bras tendus, en laissant les omoplates s’ouvrir en fin de course.',
    ],
    [
      'La barre est tirée derrière la nuque : tire toujours devant, vers le haut du torse.',
      'Le buste se balance en arrière pour finir la répétition : reste droit, c’est le dos qui tire.',
      'Les épaules restent hautes et les bras travaillent seuls : abaisse les omoplates avant de fléchir les coudes.',
    ],
    [
      'Réduis la charge si les épaules ou les coudes tirent en fin de série.',
      'Ne descends pas plus bas que la position confortable fournie par les coussins.',
    ],
    {
      youtubeShortId: 'n9-LFZWeqZ4',
      primaryMuscles: ['Dorsaux'],
      secondaryMuscles: ['Biceps', 'Épaules'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Épaules basses d’abord, coudes ensuite',
    }
  ),
  skierg: tutorial(
    'skierg',
    'SKIERG',
    ['Dos', 'bras', 'cardio'],
    ['SKIERG'],
    'Debout face à la machine, pieds largeur du bassin, poignées à hauteur de tête en haut de course. Buste légèrement penché, gainage actif.',
    [
      'Debout, genoux souples, saisis les poignées et place-les au-dessus de la tête, bras légèrement fléchis.',
      'Tire les poignées vers le bas en accompagnant d’une légère flexion du buste et des jambes, en soufflant.',
      'Arrive hanches fléchies, coudes le long du corps, sans arrondir le dos.',
      'Remonte les mains au-dessus de la tête en inspirant, puis enchaîne en mouvement continu.',
    ],
    [
      'Seuls les bras tirent : ajoute le buste et les jambes, la chaîne complète fait l’efficacité.',
      'Le dos s’arrondit fortement en bas du mouvement : garde la poitrine ouverte et les omoplates contrôlées.',
      'Le mouvement est haché : garde une cadence régulière et une respiration fluide.',
    ],
    [
      'Ajuste la résistance avant de commencer et garde les pieds stables pour éviter la glissade.',
      'Réduis l’intensité si le bas du dos se lance pendant le tirage.',
    ],
    {
      youtubeShortId: 'TvY76Ii3ITs',
      primaryMuscles: ['Dos', 'Bras'],
      secondaryMuscles: ['Cardio'],
      keyCue: 'Bras, buste et jambes ensemble sur le tirage',
    }
  ),
  'hollow-hold': tutorial(
    'hollow-hold',
    'Hollow hold',
    ['Abdominaux'],
    ['Tapis'],
    'Allongé sur le dos, bas du dos plaqué au sol, jambes tendues selon le niveau, bras au-dessus de la tête. Gainage profond, ventre rentré.',
    [
      'Allonge-toi sur le dos et plaque le bas du dos au sol en rentrant légèrement le ventre.',
      'Décolle les épaules et tends les jambes selon ton niveau, en gardant le dos plaqué.',
      'Étire les bras au-dessus de la tête tant que le dos reste au contact du sol.',
      'Maintiens la position jusqu’à la fin du chrono en respirant régulièrement, sans creuser le dos.',
    ],
    [
      'Le bas du dos se creuse et se décolle : réduis l’amplitude en repliant un peu les jambes ou en gardant les bras au sol.',
      'La respiration est bloquée : garde un souffle court mais continu.',
      'La tête est trop décollée : l’enroulement reste léger, c’est le ventre qui tient la position.',
    ],
    [
      'Dès que le bas du dos se décolle, arrête la série ou réduis l’amplitude : ne force pas sur les lombaires.',
      'Préfère une position plus facile tenue proprement à une position avancée avec le dos creusé.',
    ],
    {
      youtubeShortId: 'SMpasIMw7LE',
      primaryMuscles: ['Abdominaux'],
      keyCue: 'Bas du dos plaqué, ventre rentré',
    }
  ),
  'mountain-climber': tutorial(
    'mountain-climber',
    'Mountain climber',
    ['Abdominaux', 'cardio'],
    ['Tapis'],
    'Planche haute, mains sous les épaules, corps aligné, gainage actif. Pieds réunis, appuis sur les orteils.',
    [
      'Place-toi en planche haute, mains sous les épaules, corps aligné des talons à la tête.',
      'Ramène un genou vers la poitrine sans monter les fesses.',
      'Repose le pied et alterne avec l’autre jambe au rythme du chrono.',
      'Garde les épaules au-dessus des mains et une respiration continue.',
    ],
    [
      'Les fesses montent pendant l’alternance : garde le bassin bas et le corps aligné.',
      'Les mains se décalent vers l’avant : replace-les régulièrement sous les épaules.',
      'L’alternance devient précipitée : un rythme régulier vaut mieux qu’une course désordonnée.',
    ],
    [
      'Repose les genoux si les poignets ou les lombaires se chargent, puis reprends plus lentement.',
      'Ralentis si les appuis sur les orteils deviennent douloureux.',
    ],
    {
      youtubeShortId: 'x7Kr-V67T7k',
      primaryMuscles: ['Abdominaux', 'Cardio'],
      keyCue: 'Bassin bas, épaules au-dessus des mains',
    }
  ),
  'sit-to-stand': tutorial(
    'sit-to-stand',
    'Sit to stand',
    ['Cuisses', 'fessiers'],
    ['Banc ou chaise'],
    'Assis au bord du banc ou de la chaise, pieds à plat sous les genoux, dos droit, bras le long du corps ou croisés.',
    [
      'Assieds-toi au bord du banc, pieds à plat sous les genoux, dos droit.',
      'Penche légèrement le buste vers l’avant et pousse dans les pieds en soufflant pour te lever.',
      'Termine debout genoux souples, sans les verrouiller violemment.',
      'Redescends lentement en contrôlant, jusqu’à frôler l’assise avant de te rasseoir.',
    ],
    [
      'Tu te laisses tomber sur la chaise : contrôle la descente, c’est la partie qui travaille.',
      'Tu pousses avec les mains sur les genoux : garde les bras libres et pousse dans les pieds.',
      'Les genoux partent vers l’intérieur à la levée : mets-les dans l’axe des orteils.',
    ],
    [
      'Utilise un banc stable, ni trop haut ni roulant, pour éviter de te rattraper en déséquilibre.',
      'Garde une assise à hauteur confortable : si les genoux tirent, remonte le siège.',
    ],
    {
      youtubeShortId: '8gkfe4aTE-0',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
      keyCue: 'Pousse dans les pieds, contrôle la descente',
    }
  ),
  crunches: tutorial(
    'crunches',
    'Crunches',
    ['Abdominaux'],
    ['Tapis'],
    'Allongé sur le dos, genoux fléchis, pieds à plat, bas du dos au sol. Mains au niveau des tempes, coudes légèrement ouverts.',
    [
      'Allonge-toi, pieds à plat, genoux fléchis, et plaque le bas du dos.',
      'Décolle les épaules en enroulant le haut du dos, mains aux tempes, sans tirer la nuque.',
      'Souffle complètement en haut de l’enroulement.',
      'Redescends lentement jusqu’à effleurer le sol, puis enchaîne.',
    ],
    [
      'La nuque est tirée par les mains : les mains reposent à peine, c’est le ventre qui enroule le buste.',
      'Le bas du dos décolle et le mouvement devient un sit-up complet : reste sur un enroulement court.',
      'La montée se fait avec élan : descente lente, sans rebond.',
    ],
    [
      'Arrête si la nuque ou le bas du dos tire et corrige d’abord la position des mains et l’enroulement.',
      'Réduis l’amplitude plutôt que de forcer avec un mouvement de balancier.',
    ],
    {
      youtubeShortId: 'xGbcIHSvSlo',
      primaryMuscles: ['Abdominaux'],
      tempoRecommended: '2-1-2-0',
      keyCue: 'Mains légères aux tempes, ventre qui enroule',
    }
  ),
  'developpe-clavicule': tutorial(
    'developpe-clavicule',
    'Développé clavicule prise neutre',
    ['Épaules', 'haut des pectoraux'],
    ['Haltères'],
    'Debout, pieds largeur du bassin, gainage léger. Haltères à hauteur d’épaules, prise neutre paumes face à face, avant-bras verticaux.',
    [
      'Debout, gainage actif, place les haltères à hauteur d’épaules, paumes face à face, coudes à 45° du buste.',
      'Pousse les haltères au-dessus de la tête en soufflant, sans cambrer ni hausser les épaules.',
      'À la fin de la poussée, passe la tête légèrement en avant, haltères dans l’axe des épaules.',
      'Redescends lentement jusqu’à hauteur d’épaules, sous contrôle, sans laisser tomber les bras.',
    ],
    [
      'Le dos se cambre et le bassin avance : garde le tronc gainé et la cage thoracique basse.',
      'Les haltères se cognent en haut : laisse un écart stable entre les mains.',
      'Les coudes s’ouvrent à 90° du buste : garde-les à environ 45°, plus confortables pour l’épaule.',
    ],
    [
      'Reste sur des charges légères : avec des haltères en mouvement libre, mieux vaut contrôler que forcer.',
      'Arrête si l’épaule tire en haut de la poussée et réduis l’amplitude.',
    ],
    {
      youtubeShortId: 'aO_1PB0X_lU',
      primaryMuscles: ['Épaules'],
      secondaryMuscles: ['Triceps', 'Pectoraux'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Coudes à 45° du buste, poussée sous contrôle',
    }
  ),
  'cooldown-full-body-a': tutorial(
    'cooldown-full-body-a',
    'Retour au calme — tapis 5 km/h',
    ['Cardio'],
    ['Tapis de course'],
    'Sur le tapis, marche à 5 km/h, bras souples, buste droit, appuis sûrs. Reste à portée de la télécommande d’arrêt.',
    [
      'Monte sur le tapis avant de le mettre en marche et attache la sécurité d’arrêt à ta taille.',
      'Démarre à 5 km/h et laisse une minute d’adaptation avant de trouver une marche régulière.',
      'Garde le buste droit, les bras relâchés et un souffle nasal calme.',
      'À la fin des 5 minutes, décélère progressivement au lieu de t’arrêter net.',
    ],
    [
      'Le buste s’affaisse sur le guidon : reste droit, la marche est un décrassage, pas un appui.',
      'La vitesse est changée brutalement en cours de route : garde une allure constante sur toute la durée.',
      'L’arrêt se fait d’un coup en fin de séance : réduis la vitesse pour redescendre en douceur.',
    ],
    [
      'Attache le dispositif d’arrêt d’urgence avant de démarrer le tapis.',
      'Descends si tu as un vertige ou un essoufflement inhabituel après l’effort.',
    ],
    {
      primaryMuscles: ['Cardio'],
      keyCue: 'Cinq minutes sans forcer, arrêt attaché au départ',
    }
  ),
  'cooldown-full-body-b': tutorial(
    'cooldown-full-body-b',
    'Retour au calme — tapis marche rapide',
    ['Cardio'],
    ['Tapis de course'],
    'Sur le tapis, marche rapide sans courir, buste droit, bras qui accompagnent. Sécurité d’arrêt en place.',
    [
      'Monte sur le tapis, attache la sécurité d’arrêt puis démarre à allure de marche.',
      'Augmente progressivement jusqu’à une marche rapide, sans passer au pas de course.',
      'Garde une respiration ample et un buste droit pendant les 5 minutes.',
      'Réduis la vitesse sur la dernière minute pour finir en marche lente avant de descendre.',
    ],
    [
      'La marche rapide se transforme en course : reste sur un pas rapide, l’objectif est la récupération.',
      'Les bras restent figés le long du corps : laisse-les accompagner naturellement le mouvement.',
      'Le buste penche en avant en fin de séance : redresse-le et redescends en intensité si nécessaire.',
    ],
    [
      'Vérifie la sécurité d’arrêt au début et garde la main libre pour l’actionner en cas de besoin.',
      'Ralentis si le bas du dos ou les mollets se durcissent après la musculation.',
    ],
    {
      primaryMuscles: ['Cardio'],
      keyCue: 'Marche rapide jamais courue, fin en douceur',
    }
  ),
  'cooldown-cardio': tutorial(
    'cooldown-cardio',
    'Retour au calme — tapis après circuit',
    ['Cardio'],
    ['Tapis de course'],
    'Sur le tapis, marche rapide, épaules relâchées, respiration ample pour redescendre après le circuit. Sécurité d’arrêt activée.',
    [
      'Monte sur le tapis, active la sécurité d’arrêt et démarre tranquillement après le circuit cardio.',
      'Trouve une marche rapide mais confortable : le souffle doit revenir progressivement.',
      'Garde un buste droit et des épaules basses pendant les 5 minutes.',
      'Baisse l’allure sur la fin et quitte le tapis une fois l’essoufflement retombé.',
    ],
    [
      'On reprend un rythme trop élevé : cette marche sert à redescendre, pas à prolonger le circuit.',
      'La respiration reste courte et haute : ralentis pour retrouver un souffle ample et calme.',
      'L’arrêt se fait en sautant du tapis : décélère d’abord, puis descends à l’arrêt.',
    ],
    [
      'Garde le dispositif d’arrêt attaché : la fatigue du circuit rend les appuis moins sûrs.',
      'Si un vertige survient en fin de circuit, ralentis immédiatement et descends sans te précipiter.',
    ],
    {
      primaryMuscles: ['Cardio'],
      keyCue: 'Redescendre l’allure pour retrouver le souffle',
    }
  ),
};

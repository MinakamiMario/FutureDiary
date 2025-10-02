// utils/enhancedTemplates.js - Enhanced template system for narrative generation

import { NARRATIVE_STYLES } from './narrativeStyles';

/**
 * Enhanced Template System for Rich Narrative Generation
 * Provides context-aware, style-specific templates for users without paid AI
 */

// Tijd-gebaseerde context detectie
const getTimeContext = (date) => {
  const dayOfWeek = new Date(date).getDay();
  const hour = new Date(date).getHours();
  const month = new Date(date).getMonth();
  
  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isWorkday: dayOfWeek >= 1 && dayOfWeek <= 5,
    isEvening: hour >= 18,
    isMorning: hour >= 6 && hour < 12,
    isAfternoon: hour >= 12 && hour < 18,
    season: month >= 2 && month <= 4 ? 'spring' :
            month >= 5 && month <= 7 ? 'summer' :
            month >= 8 && month <= 10 ? 'autumn' : 'winter'
  };
};

// Rijke introductie templates per style
const ENHANCED_INTROS = {
  [NARRATIVE_STYLES.CASUAL]: {
    high_activity: [
      "Wow, wat een actieve dag had je vandaag! 🚀",
      "Hey daar, energizer bunny! Je was vandaag echt on fire! 🔥",
      "Jeetje, je bent vandaag behoorlijk druk geweest!",
      "Damn, wat een dag! Je hebt echt van alles gedaan vandaag! 💪"
    ],
    medium_activity: [
      "Hey! Je dag zag er vrij chill uit vandaag 😎",
      "Hoi daar! Een lekkere relaxte dag gehad?",
      "Yo! Vandaag was een mooie, rustige dag voor je",
      "Hallo! Een lekker ontspannen dagje?"
    ],
    low_activity: [
      "Hé, rustige dag vandaag? Dat is ook wel eens lekker! 😌",
      "Hey! Vandaag was je dag voor rust en ontspanning",
      "Hoi! Een mooie rustige dag - precies wat je nodig had misschien?",
      "Sup! Soms is een rustige dag precies wat we nodig hebben 🧘‍♀️"
    ]
  },
  
  [NARRATIVE_STYLES.DETAILED]: {
    high_activity: [
      "Jouw dagelijkse analyse toont een opmerkelijk actieve dag met diverse activiteiten en bewegingen.",
      "De gedetailleerde observatie van je dag laat een indrukwekkend patroon van activiteit zien.",
      "Een grondige analyse van je dagindeling onthult een zeer productieve en bewegingsrijke dag.",
      "De systematische evaluatie van je dagactiviteiten wijst op een uitzonderlijk actieve levensstijl."
    ],
    medium_activity: [
      "Je dagpatroon vertoont een gebalanceerde mix van activiteit en rust.",
      "De analyse van je dag laat een harmonieuze verdeling van verschillende activiteiten zien.",
      "Je dagstructuur wijst op een evenwichtige benadering van werk en ontspanning.",
      "Een nadere beschouwing van je dag toont een goed gedoseerde hoeveelheid activiteit."
    ],
    low_activity: [
      "De observatie van je dag suggereert een bewuste keuze voor rust en reflectie.",
      "Je dagindeling kenmerkt zich door een meer contemplatieve en rustgevende aanpak.",
      "De analyse toont een dag gericht op herstel en innerlijke rust.",
      "Je dagpatroon reflecteert een periode van bewuste ontspanning en mentale rust."
    ]
  },
  
  [NARRATIVE_STYLES.PROFESSIONAL]: {
    high_activity: [
      "**Dagelijkse Activiteitenrapport**: Gebruiker vertoonde verhoogde activiteitsniveaus met diverse taken en bewegingen.",
      "**Status Update**: Dag gekenmerkt door hoge productiviteit en significante fysieke activiteit.",
      "**Activiteitenanalyse**: Substantiële beweging en taakuitvoering geregistreerd gedurende de dagperiode.",
      "**Performance Summary**: Uitstekende activiteitscores met breed scala aan uitgevoerde taken."
    ],
    medium_activity: [
      "**Dagrapport**: Gebalanceerde activiteitsniveaus met adequate beweging en taakuitvoering.",
      "**Status**: Gemiddelde productiviteit met stabiele activiteitspatronen geobserveerd.",
      "**Evaluatie**: Consistente activiteitsniveaus binnen normale parameters.",
      "**Overzicht**: Standaard operationele dag met reguliere activiteitspatronen."
    ],
    low_activity: [
      "**Daganalyse**: Minimale activiteitsniveaus, mogelijk indicatief voor rustperiode of hersteldag.",
      "**Status**: Gereduceerde activiteit geregistreerd, binnen acceptabele parameters voor recuperatie.",
      "**Rapport**: Lage-intensiteit dag met focus op rust en herstel.",
      "**Observatie**: Beperkte bewegingsactiviteit, consistent met rustdag-protocol."
    ]
  },
  
  [NARRATIVE_STYLES.POETIC]: {
    high_activity: [
      "In de dans van deze dag wervelden jouw voeten door een symfonie van beweging en actie.",
      "Zoals de wind door bomen waait, zo danste jij door een dag vol energie en leven.",
      "De zon keek neer op een dag waarin jij als een rivier stroomde - altijd in beweging, altijd voorwaarts.",
      "In het tapijt van tijd weefde jij vandaag draden van goud, glimmend van activiteit en vitaliteit."
    ],
    medium_activity: [
      "Je dag ontvouwde zich als een zachte melodie - niet te luid, niet te stil, precies goed.",
      "Zoals het getij dat rustig komt en gaat, zo volgde jouw dag een natuurlijk ritme van actie en rust.",
      "In de tuin van tijd plantte jij vandaag zaden van beweging die zacht groeiden in het licht.",
      "Je dag stroomde als een beekje - kalm, gestaag, met hier en daar een vrolijke kabbeling."
    ],
    low_activity: [
      "Vandaag was jouw dag een stil meer, spiegelglad en vredig onder de hemel van rust.",
      "In de stilte van deze dag vond je de poëzie van het niets-doen, de schoonheid van het zijn.",
      "Zoals de maan die rustig over de hemel drijft, zo gleed jouw dag voorbij in vredige contemplatie.",
      "Je dag was een zachte sluimering, een tedere omhelzing van rust en innerlijke vrede."
    ]
  },
  
  [NARRATIVE_STYLES.STANDAARD]: {
    high_activity: [
      "Vandaag was een bijzonder actieve dag voor je.",
      "Je hebt een drukke en productieve dag achter de rug.",
      "Wat een bewegelijke dag heb je gehad vandaag.",
      "Je dag stond in het teken van veel activiteit en beweging."
    ],
    medium_activity: [  
      "Je hebt een mooie, gebalanceerde dag gehad.",
      "Vandaag was een rustige maar productieve dag.",
      "Je dag kende een goede mix van activiteit en ontspanning.",
      "Een aangename dag met verschillende activiteiten."
    ],
    low_activity: [
      "Vandaag was een dag van rust en ontspanning voor je.",
      "Je hebt een kalme, vredige dag gehad.",
      "Vandaag nam je de tijd voor jezelf en rust.",
      "Een mooie rustige dag om bij te komen."
    ]
  }
};

// Context-aware activiteit categorisatie  
const categorizeActivityLevel = (steps, locations, calls, appUsage) => {
  let activityScore = 0;
  
  // Stappen score (0-40 punten)
  if (steps > 15000) activityScore += 40;
  else if (steps > 10000) activityScore += 30;
  else if (steps > 5000) activityScore += 20;
  else if (steps > 2000) activityScore += 10;
  
  // Locaties score (0-25 punten)
  const locationCount = locations?.length || 0;
  if (locationCount > 5) activityScore += 25;
  else if (locationCount > 3) activityScore += 20;
  else if (locationCount > 1) activityScore += 15;
  else if (locationCount > 0) activityScore += 10;
  
  // Gesprekken score (0-20 punten)
  const callCount = calls?.length || 0;
  if (callCount > 10) activityScore += 20;
  else if (callCount > 5) activityScore += 15;
  else if (callCount > 2) activityScore += 10;
  else if (callCount > 0) activityScore += 5;
  
  // App usage score (0-15 punten) - meer apps = actiever
  const appCount = appUsage?.appCount || 0;
  if (appCount > 15) activityScore += 15;
  else if (appCount > 10) activityScore += 12;
  else if (appCount > 5) activityScore += 8;
  else if (appCount > 0) activityScore += 5;
  
  // Categoriseer op basis van totale score (0-100)
  if (activityScore >= 70) return 'high_activity';
  if (activityScore >= 35) return 'medium_activity';
  return 'low_activity';
};

// Enhanced introduction generator
export const generateEnhancedIntroduction = (date, activityGroups, locations, calls, appUsage, narrativeStyle = NARRATIVE_STYLES.STANDAARD) => {
  const timeContext = getTimeContext(date);
  const steps = activityGroups?.totalSteps || 0;
  const activityLevel = categorizeActivityLevel(steps, locations, calls, appUsage);
  
  const styleIntros = ENHANCED_INTROS[narrativeStyle] || ENHANCED_INTROS[NARRATIVE_STYLES.STANDAARD];
  const levelIntros = styleIntros[activityLevel] || styleIntros.medium_activity;
  
  // Random selectie voor variatie
  const selectedIntro = levelIntros[Math.floor(Math.random() * levelIntros.length)];
  
  // Context-aware toevoegingen
  let contextAddition = '';
  if (timeContext.isWeekend && activityLevel === 'high_activity') {
    const weekendAdditions = {
      [NARRATIVE_STYLES.CASUAL]: " Weekendwarrior mode aan! 🌟",
      [NARRATIVE_STYLES.DETAILED]: " Een opmerkelijke prestatie voor een weekenddag.",
      [NARRATIVE_STYLES.PROFESSIONAL]: " Uitstekende weekendproductiviteit genoteerd.",
      [NARRATIVE_STYLES.POETIC]: " Zelfs de rust van het weekend kon jouw energie niet temmen.",
      [NARRATIVE_STYLES.STANDARD]: " Indrukwekkend voor een weekenddag."
    };
    contextAddition = weekendAdditions[narrativeStyle] || '';
  }
  
  return selectedIntro + contextAddition;
};

// Verbeterde activiteiten narratives
const ENHANCED_ACTIVITY_TEMPLATES = {
  [NARRATIVE_STYLES.CASUAL]: {
    high_steps: [
      "Je hebt echt je beste beentje voorgezet met {steps} stappen! 👟",
      "Wauw! {steps} stappen - dat is echt een prestatie! 🏃‍♀️",
      "Met {steps} stappen heb je vandaag echt kilometers gemaakt! 🚶‍♂️"
    ],
    medium_steps: [
      "Je hebt lekker {steps} stappen gelopen vandaag! 😊",
      "Nice! {steps} stappen is een mooie score! 👍",
      "Met {steps} stappen heb je je goed bewogen! 🌟"
    ],
    low_steps: [
      "Je hebt {steps} stappen gedaan - soms is rust ook belangrijk! 😌",
      "Vandaag waren het {steps} stappen, perfect voor een rustige dag! 🧘‍♀️",
      "Met {steps} stappen heb je het rustig aan gedaan - heel verstandig! 💆‍♀️"
    ]
  },
  
  [NARRATIVE_STYLES.DETAILED]: [
    "Je fysieke activiteit omvatte {steps} stappen, wat wijst op een {activity_assessment} bewegingspatroon gedurende de dag.",
    "Met een totaal van {steps} stappen toonde je een {activity_assessment} niveau van dagelijkse mobiliteit en beweging.",
    "Je bewegingsactiviteit van {steps} stappen reflecteert een {activity_assessment} investering in je fysieke welzijn."
  ],
  
  [NARRATIVE_STYLES.PROFESSIONAL]: [
    "**Bewegingsstatistieken**: {steps} stappen geregistreerd, classificatie: {activity_level}.",
    "**Fysieke Activiteit**: Totaal {steps} stappen gedocumenteerd voor deze rapportageperiode.",
    "**Mobiliteit**: {steps} stappen output gegenereerd met {activity_level} performance rating."
  ],
  
  [NARRATIVE_STYLES.POETIC]: [
    "Je voeten schreven {steps} kleine gedichten op de aarde, elk een stap in de dans van het leven.",
    "Met {steps} stappen tekende je een pad van verhalen op het canvas van de dag.",
    "Elke van je {steps} stappen was een hartslag in de muziek van beweging."
  ],
  
  [NARRATIVE_STYLES.STANDARD]: [
    "Je hebt vandaag {steps} stappen gelopen.",
    "Met {steps} stappen heb je een {activity_assessment} dag gehad qua beweging.",
    "Je dagelijkse beweging bedroeg {steps} stappen."
  ]
};

// Smart step assessment
const getStepAssessment = (steps, narrativeStyle) => {
  const assessments = {
    high: {
      [NARRATIVE_STYLES.CASUAL]: "super actieve",
      [NARRATIVE_STYLES.DETAILED]: "uitzonderlijk actieve", 
      [NARRATIVE_STYLES.PROFESSIONAL]: "hoog-prestatie",
      [NARRATIVE_STYLES.POETIC]: "energieke",
      [NARRATIVE_STYLES.STANDARD]: "zeer actieve"
    },
    medium: {
      [NARRATIVE_STYLES.CASUAL]: "mooie",
      [NARRATIVE_STYLES.DETAILED]: "gebalanceerde",
      [NARRATIVE_STYLES.PROFESSIONAL]: "standaard",
      [NARRATIVE_STYLES.POETIC]: "harmonieuze", 
      [NARRATIVE_STYLES.STANDARD]: "gemiddelde"
    },
    low: {
      [NARRATIVE_STYLES.CASUAL]: "rustige", 
      [NARRATIVE_STYLES.DETAILED]: "minimale",
      [NARRATIVE_STYLES.PROFESSIONAL]: "lage-intensiteit",
      [NARRATIVE_STYLES.POETIC]: "vredige",
      [NARRATIVE_STYLES.STANDARD]: "kalme"
    }
  };
  
  const level = steps > 10000 ? 'high' : steps > 5000 ? 'medium' : 'low';
  return assessments[level][narrativeStyle] || assessments[level][NARRATIVE_STYLES.STANDAARD];
};

// Enhanced activity narrative generator - updated to handle activityGroups
export const generateEnhancedActivityNarrative = (activityGroupsOrSteps, narrativeStyle = NARRATIVE_STYLES.STANDAARD) => {
  // Handle backward compatibility: if it's a number, treat as legacy steps parameter
  const steps = typeof activityGroupsOrSteps === 'number' ? activityGroupsOrSteps : (activityGroupsOrSteps?.totalSteps || 0);
  
  const templates = ENHANCED_ACTIVITY_TEMPLATES[narrativeStyle] || ENHANCED_ACTIVITY_TEMPLATES[NARRATIVE_STYLES.STANDAARD];
  
  let selectedTemplate;
  if (narrativeStyle === NARRATIVE_STYLES.CASUAL) {
    const level = steps > 10000 ? 'high_steps' : steps > 5000 ? 'medium_steps' : 'low_steps';
    const levelTemplates = templates[level];
    selectedTemplate = levelTemplates[Math.floor(Math.random() * levelTemplates.length)];
  } else {
    selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  }
  
  const activityAssessment = getStepAssessment(steps, narrativeStyle);
  const activityLevel = steps > 10000 ? 'HOOG' : steps > 5000 ? 'GEMIDDELD' : 'LAAG';
  
  return selectedTemplate
    .replace('{steps}', steps.toLocaleString('nl-NL'))
    .replace('{activity_assessment}', activityAssessment)  
    .replace('{activity_level}', activityLevel);
};

// Enhanced location narratives
const ENHANCED_LOCATION_TEMPLATES = {
  [NARRATIVE_STYLES.CASUAL]: {
    single: ["Je bent naar {location} geweest - nice plek! 📍"],
    multiple: ["Je hebt vandaag {count} verschillende plekken bezocht: {locations}. Wat een rondreisje! 🌍"],
    many: ["Wow! Je bent naar maar liefst {count} verschillende plekken geweest: {locations}. Echte wereldreiziger! ✈️"]
  },
  
  [NARRATIVE_STYLES.DETAILED]: {
    single: ["Je dagelijkse mobiliteit omvatte een bezoek aan {location}, wat duidt op een doelgerichte beweging."],
    multiple: ["Je ruimtelijke bewegingspatroon omvatte {count} verschillende locaties: {locations}, wat wijst op een gevarieerde dagindeling."],
    many: ["Een analyse van je bewegingspatroon toont {count} verschillende bestemmingen: {locations}, wat duidt op een zeer mobiele en diverse dag."]
  },
  
  [NARRATIVE_STYLES.PROFESSIONAL]: {
    single: ["**Locatie**: Eén bestemmingspunt geregistreerd: {location}."],
    multiple: ["**Mobiliteitsrapport**: {count} verschillende locaties bezocht: {locations}."],
    many: ["**Uitgebreide Mobiliteit**: {count} bestemmingen gedocumenteerd: {locations}. Hoge mobiliteitsrating genoteerd."]
  },
  
  [NARRATIVE_STYLES.POETIC]: {
    single: ["Je reis voerde je naar {location}, een pauze in de dans van beweging."],
    multiple: ["Je wandeling door de wereld bracht je naar {count} verschillende oorden: {locations}, elk een nieuwe scene in je dagelijkse verhaal."],
    many: ["Zoals de wind die door vele landen waait, zo droegen je voeten je naar {count} verschillende plekken: {locations}."]
  },
  
  [NARRATIVE_STYLES.STANDAARD]: {
    single: ["Je bezocht {location} vandaag."],
    multiple: ["Je bent naar {count} verschillende locaties geweest: {locations}."],
    many: ["Je hebt {count} verschillende plekken bezocht: {locations}."]
  }
};

// Enhanced calls narratives
const ENHANCED_CALLS_TEMPLATES = {
  [NARRATIVE_STYLES.CASUAL]: {
    few: ["Je hebt {count} gesprekjes gevoerd vandaag! 📞"],
    some: ["Met {count} telefoontjes was je lekker sociaal bezig! 💬"],
    many: ["Wauw! {count} gesprekken - wat een sociale vlinder ben je! 🦋"]
  },
  
  [NARRATIVE_STYLES.DETAILED]: {
    few: ["Je communicatiepatroon omvatte {count} telefonische interacties."],
    some: ["Je sociale connectiviteit manifesteerde zich in {count} gesprekken."],
    many: ["Een intensief communicatiepatroon van {count} gesprekken wijst op een zeer sociale dag."]
  },
  
  [NARRATIVE_STYLES.PROFESSIONAL]: {
    few: ["**Communicatie**: {count} telefonische contacten geregistreerd."],
    some: ["**Gesprekken**: {count} communicatie-interacties gedocumenteerd."],
    many: ["**Hoge Communicatie-activiteit**: {count} gesprekken gelogd. Uitstekende sociale connectiviteit."]
  },
  
  [NARRATIVE_STYLES.POETIC]: {
    few: ["Stemmen vonden {count} keer hun weg naar jouw oor, boodschappers van verbinding."],
    some: ["Door {count} gesprekken weefde je draden van menselijke verbinding in de dag."],
    many: ["Je dag gonste van {count} stemmen, een symfonie van menselijke verbinding."]
  },
  
  [NARRATIVE_STYLES.STANDAARD]: {
    few: ["Je voerde {count} gesprekken vandaag."],
    some: ["Je had {count} telefonische contacten."],
    many: ["Met {count} gesprekken was het een sociale dag."]
  }
};

// Enhanced location narrative generator
export const generateEnhancedLocationNarrative = (locations, narrativeStyle = NARRATIVE_STYLES.STANDAARD) => {
  if (!locations || locations.length === 0) return null;
  
  const count = locations.length;
  const locationNames = locations.map(loc => loc.name || loc.label || 'onbekende locatie').join(', ');
  
  const templates = ENHANCED_LOCATION_TEMPLATES[narrativeStyle] || ENHANCED_LOCATION_TEMPLATES[NARRATIVE_STYLES.STANDAARD];
  
  let selectedTemplate;
  if (count === 1) {
    selectedTemplate = templates.single[Math.floor(Math.random() * templates.single.length)];
    return selectedTemplate.replace('{location}', locationNames);
  } else if (count <= 3) {
    selectedTemplate = templates.multiple[Math.floor(Math.random() * templates.multiple.length)];
  } else {
    selectedTemplate = templates.many[Math.floor(Math.random() * templates.many.length)];
  }
  
  return selectedTemplate
    .replace('{count}', count)
    .replace('{locations}', locationNames);
};

// Enhanced calls narrative generator  
export const generateEnhancedCallsNarrative = (totalCalls, narrativeStyle = NARRATIVE_STYLES.STANDAARD) => {
  if (!totalCalls || totalCalls === 0) return null;
  
  const templates = ENHANCED_CALLS_TEMPLATES[narrativeStyle] || ENHANCED_CALLS_TEMPLATES[NARRATIVE_STYLES.STANDAARD];
  
  let selectedTemplate;
  if (totalCalls <= 2) {
    selectedTemplate = templates.few[Math.floor(Math.random() * templates.few.length)];
  } else if (totalCalls <= 5) {
    selectedTemplate = templates.some[Math.floor(Math.random() * templates.some.length)];
  } else {
    selectedTemplate = templates.many[Math.floor(Math.random() * templates.many.length)];
  }
  
  return selectedTemplate.replace('{count}', totalCalls);
};

// Enhanced conclusions per style
const ENHANCED_CONCLUSIONS = {
  [NARRATIVE_STYLES.CASUAL]: [
    "Al met al een lekkere dag! Keep it up! 💪",
    "Wat een mooie dag heb je gehad! Tot morgen! 😊",
    "Nice day! Je hebt er weer wat moois van gemaakt! ✨",
    "Zo, dat was je dag! Lekker bezig geweest! 🌟"
  ],
  
  [NARRATIVE_STYLES.DETAILED]: [
    "Samenvattend toont je dagpatroon een gebalanceerde mix van activiteit, sociale interactie en persoonlijke tijd.",
    "De analyse van je dag wijst op een goed gestructureerde balans tussen verschillende levensdomeinen.",
    "Je dagindeling reflecteert een doordachte benadering van werk, beweging en sociale verbinding.",
    "Overall demonstreert je dag een harmonieuze integratie van fysieke, sociale en digitale activiteiten."
  ],
  
  [NARRATIVE_STYLES.PROFESSIONAL]: [
    "**Samenvatting**: Alle dagelijkse doelstellingen succesvol uitgevoerd binnen normale parameters.",
    "**Conclusie**: Dag voltooid met adequate performance over alle gemeten domeinen.",
    "**Status**: Succesvolle afronding van dagelijks activiteitenprogramma.",
    "**Evaluatie**: Consistente prestaties geleverd conform verwachtingen."
  ],
  
  [NARRATIVE_STYLES.POETIC]: [
    "Zo vloeide jouw dag voorbij als een rivier vol verhalen, elke druppel een herinnering.",
    "En terwijl de avond viel, droeg de wind de echo's van jouw dag mee naar morgen.",
    "In het boek van tijd schreef je vandaag een prachtig hoofdstuk vol leven en beweging.",
    "De dag sloot zich als een bloem die zijn verhaal heeft verteld aan de zon."
  ],
  
  [NARRATIVE_STYLES.STANDARD]: [
    "Het was een mooie, complete dag.",
    "Je hebt een goede dag gehad met verschillende activiteiten.",
    "Een dag om tevreden op terug te kijken.",
    "Zo eindigde je dag vol verschillende ervaringen."
  ]
};

// Enhanced conclusion generator
export const generateEnhancedConclusion = (narrativeStyle = NARRATIVE_STYLES.STANDAARD) => {
  const conclusions = ENHANCED_CONCLUSIONS[narrativeStyle] || ENHANCED_CONCLUSIONS[NARRATIVE_STYLES.STANDAARD];
  return conclusions[Math.floor(Math.random() * conclusions.length)];
};

// Export enhanced template system
export const enhancedTemplateSystem = {
  generateEnhancedIntroduction,
  generateEnhancedActivityNarrative,
  generateEnhancedLocationNarrative,
  generateEnhancedCallsNarrative,
  generateEnhancedConclusion,
  categorizeActivityLevel,
  getTimeContext
};

export default enhancedTemplateSystem;
// utils/narrativeStyles.js - Helper functions for narrative styling
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nederlandse story styles voor persoonlijke dagboeken
export const NARRATIVE_STYLES = {
  STANDAARD: 'standaard',
  GEDETAILLEERD: 'gedetailleerd', 
  CASUAL: 'casual',
  PROFESSIONEEL: 'professioneel',
  POETISCH: 'poetisch'
};

// Enhanced style configurations met Nederlandse templates
export const STORY_STYLE_CONFIG = {
  [NARRATIVE_STYLES.STANDAARD]: {
    key: 'standaard',
    name: 'Standaard',
    description: 'Heldere, directe verhalen - kort en bondig',
    maxTokens: 600,
    temperature: 0.2,
    systemPrompt: 'Je bent een beknopte verhaalschrijver die persoonlijke dagboeken creëert. Schrijf heldere, directe verhalen in de tweede persoon ("jij"). Houd het kort maar informatief. BELANGRIJK: Verzin NOOIT details die niet in de data staan.',
    promptSuffix: 'Schrijf een helder, direct verhaal van ongeveer 3-4 alinea\'s. Focus ALLEEN op de hoofdpunten en feiten van de dag. Voeg GEEN verzonnen details toe.',
    tone: 'factual',
    length: 'kort',
    examples: [
      'Vandaag bezocht je 3 verschillende locaties en maakte je 2 belangrijke telefoontjes.',
      'Je liep vandaag 8.500 stappen en was actief gedurende 45 minuten.'
    ]
  },
  
  [NARRATIVE_STYLES.CASUAL]: {
    key: 'casual',
    name: 'Casual',
    description: 'Vriendelijk en ontspannen - alsof je tegen een goede vriend praat',
    maxTokens: 800,
    temperature: 0.2,
    systemPrompt: 'Je bent een vriendelijke verhaalschrijver die persoonlijke dagboeken creëert alsof je tegen een goede vriend praat. Gebruik een relaxte, warme toon in de tweede persoon ("jij"). Maak het verhaal persoonlijk en bemoedigend. BELANGRIJK: Verzin NOOIT details die niet in de data staan.',
    promptSuffix: 'Schrijf een vriendelijk, relaxed verhaal alsof je tegen een goede vriend praat. Gebruik een warme toon en bemoedigende woorden. Baseer alles ALLEEN op de gegeven feiten.',
    tone: 'vriendelijk',
    length: 'medium',
    examples: [
      'Hey! Het was weer zo\'n dag waarbij je lekker relaxed door je routine ging...',
      'Wow, wat een actieve dag had je vandaag! Je bent echt goed bezig met die 10.000 stappen.'
    ]
  },
  
  [NARRATIVE_STYLES.GEDETAILLEERD]: {
    key: 'gedetailleerd',
    name: 'Gedetailleerd', 
    description: 'Uitgebreid en analytisch - complete context en verbanden',
    maxTokens: 1200,
    temperature: 0.2,
    systemPrompt: 'Je bent een analytische verhaalschrijver die uitgebreide, gedetailleerde dagboeken creëert. Leg verbanden tussen activiteiten, analyseer patronen en geef volledige context in de tweede persoon ("jij"). BELANGRIJK: Verzin NOOIT details die niet in de data staan.',
    promptSuffix: 'Schrijf een uitgebreid, analytisch verhaal van 5-6 alinea\'s. Leg verbanden tussen activiteiten, analyseer patronen en geef volledige context over de dag. Baseer alle analyses ALLEEN op de gegeven feiten.',
    tone: 'analytisch',
    length: 'lang',
    examples: [
      'Je dag begon om 07:30 toen je eerste app-interactie plaatsvond, wat wijst op een consistent ochtendritueel...',
      'De combinatie van je 12.000 stappen en 3 verschillende locaties suggereert een zeer actieve en gevarieerde dag.'
    ]
  },
  
  [NARRATIVE_STYLES.PROFESSIONEEL]: {
    key: 'professioneel',
    name: 'Professioneel',
    description: 'Formeel en rapport-achtig - gestructureerd met resultaten en prestaties', 
    maxTokens: 900,
    temperature: 0.1,
    systemPrompt: 'Je bent een professionele rapportschrijver die formele dagelijkse activiteitenrapporten creëert. Gebruik zakelijke taal, structuur met secties en focus op meetbare resultaten en prestaties. BELANGRIJK: Verzin NOOIT details die niet in de data staan.',
    promptSuffix: 'Schrijf een professioneel, gestructureerd rapport met duidelijke secties. Focus op meetbare resultaten, prestaties en productiviteit. Gebruik ALLEEN de gegeven feiten.',
    tone: 'formeel',
    length: 'gestructureerd',
    examples: [
      '**Dagrapport**: Productiviteitsscore 85%. Belangrijkste activiteiten omvatten...',
      '**Samenvatting**: Dagelijkse doelstellingen succesvol behaald met overschrijding van stappendoel met 15%.'
    ]
  },
  
  [NARRATIVE_STYLES.POETISCH]: {
    key: 'poetisch', 
    name: 'Poëtisch',
    description: 'Creatief met mooie beeldspraak - emoties, sfeer en verhaal-elementen',
    maxTokens: 1000,
    temperature: 0.2,
    systemPrompt: 'Je bent een creatieve, poëtische schrijver die dagboeken transformeert tot mooie verhalen vol beeldspraak. Gebruik metaforen, creatieve taal en focus op emoties en sfeer in de tweede persoon ("jij"). BELANGRIJK: Verzin NOOIT details die niet in de data staan.',
    promptSuffix: 'Schrijf een creatief, poëtisch verhaal met mooie beeldspraak, metaforen en aandacht voor emoties en sfeer. Maak er een verhaal van dat de ziel raakt. Baseer alle poëtische elementen ALLEEN op de gegeven feiten.',
    tone: 'creatief',
    length: 'artistiek',
    examples: [
      'Als de ochtendzon door je raam gluurde, begon jouw verhaal van vandaag...',
      'Je voeten tekenden vandaag 9.500 kleine verhalen op de aarde, elk stapje een noot in de melodie van je dag.'
    ]
  }
};

/**
 * Get the current narrative style preference
 * @returns {Promise<string>} The narrative style
 */
export const getNarrativeStyle = async () => {
  try {
    const style = await AsyncStorage.getItem('narrativeStyle');
    return style || NARRATIVE_STYLES.STANDAARD;
  } catch (error) {
    console.error('Error getting narrative style:', error);
    return NARRATIVE_STYLES.STANDAARD;
  }
};

/**
 * Set the user's preferred narrative style
 * @param {string} style - The narrative style to set
 * @returns {Promise<boolean>} Success status
 */
export const setNarrativeStyle = async (style) => {
  try {
    // Valideer of de style bestaat
    const validStyles = Object.values(NARRATIVE_STYLES);
    if (!validStyles.includes(style)) {
      if (__DEV__) console.warn(`Ongeldige narrative style: ${style}. Fallback naar standaard.`);
      style = NARRATIVE_STYLES.STANDAARD;
    }
    
    await AsyncStorage.setItem('narrativeStyle', style);
    if (__DEV__) console.log(`✅ Narrative style ingesteld: ${style}`);
    return true;
  } catch (error) {
    console.error('Error setting narrative style:', error);
    return false;
  }
};

/**
 * Get style configuration for a specific style
 * @param {string} style - The narrative style
 * @returns {Object} Style configuration object
 */
export const getStyleConfig = (style = NARRATIVE_STYLES.STANDAARD) => {
  const normalizedStyle = style.toLowerCase();
  
  // Map old style names to new ones for backward compatibility
  const styleMapping = {
    'standard': NARRATIVE_STYLES.STANDAARD,
    'detailed': NARRATIVE_STYLES.GEDETAILLEERD,
    'casual': NARRATIVE_STYLES.CASUAL,
    'professional': NARRATIVE_STYLES.PROFESSIONEEL,
    'poetic': NARRATIVE_STYLES.POETISCH
  };
  
  const mappedStyle = styleMapping[normalizedStyle] || normalizedStyle;
  return STORY_STYLE_CONFIG[mappedStyle] || STORY_STYLE_CONFIG[NARRATIVE_STYLES.STANDAARD];
};

/**
 * Get all available story styles with their configurations
 * @returns {Object} All style configurations
 */
export const getAllStyleConfigs = () => {
  return STORY_STYLE_CONFIG;
};

/**
 * Apply style-specific formatting to narrative text
 * @param {string} baseText - The base narrative text
 * @param {string} style - The narrative style to apply
 * @returns {string} The styled narrative text
 */
export const applyNarrativeStyle = (baseText, style = NARRATIVE_STYLES.STANDARD) => {
  if (!baseText) return baseText;

  switch (style) {
    case NARRATIVE_STYLES.CASUAL:
      return applyCasualStyle(baseText);
    
    case NARRATIVE_STYLES.DETAILED:
      return applyDetailedStyle(baseText);
    
    case NARRATIVE_STYLES.PROFESSIONAL:
      return applyProfessionalStyle(baseText);
    
    case NARRATIVE_STYLES.POETIC:
      return applyPoeticStyle(baseText);
    
    case NARRATIVE_STYLES.STANDARD:
    default:
      return baseText; // Keep original for standard style
  }
};

/**
 * Style-specific transformations
 */
const applyCasualStyle = (text) => {
  // Add casual greetings and friendly tone
  let styledText = text;
  
  // Replace formal beginnings
  styledText = styledText.replace(/^Vandaag/, 'Hey! Vandaag');
  styledText = styledText.replace(/Je hebt/, 'Je hebt lekker');
  styledText = styledText.replace(/Er waren/, 'Wow, er waren');
  
  // Add casual transitions
  styledText = styledText.replace(/\. Je/, '. Trouwens, je');
  styledText = styledText.replace(/\. Er/, '. En er');
  
  // Add encouraging endings
  if (!styledText.includes('Goed bezig') && !styledText.includes('geweldig')) {
    styledText += ' Goed bezig!';
  }
  
  return styledText;
};

const applyDetailedStyle = (text) => {
  // Add more context and analytical language
  let styledText = text;
  
  // Enhance activity descriptions
  styledText = styledText.replace(/Je liep (\d+) stappen/, 'Je legde een indrukwekkende $1 stappen af');
  styledText = styledText.replace(/Je bezocht/, 'Gedurende de dag bezocht je');
  styledText = styledText.replace(/Er waren (\d+) gesprekken/, 'Je sociale dag omvatte $1 telefonische contacten');
  
  // Add analytical transitions
  styledText = styledText.replace(/\. /, '. Dit toont aan dat ');
  styledText = styledText.replace(/Dit toont aan dat Dit toont aan dat/, 'Dit toont aan dat'); // Fix double replacement
  
  return styledText;
};

const applyProfessionalStyle = (text) => {
  // Formal, report-like language
  let styledText = text;
  
  // Professional headers
  styledText = `**Dagelijkse Activiteitenrapport**\n\n${styledText}`;
  
  // Formal language
  styledText = styledText.replace(/Vandaag/, 'Op deze datum');
  styledText = styledText.replace(/Je/, 'Gebruiker');
  styledText = styledText.replace(/je/, 'gebruiker');
  
  // Professional metrics
  styledText = styledText.replace(/(\d+) stappen/, '$1 stappen geregistreerd');
  styledText = styledText.replace(/(\d+) gesprekken/, '$1 communicatie-interacties gedocumenteerd');
  
  // Add summary conclusion
  styledText += '\n\n**Samenvatting**: Dagelijkse doelstellingen succesvol behaald.';
  
  return styledText;
};

const applyPoeticStyle = (text) => {
  // Creative, metaphorical language
  let styledText = text;
  
  // Poetic beginnings
  styledText = styledText.replace(/^Vandaag/, 'In de dans van deze dag');
  
  // Poetic descriptions
  styledText = styledText.replace(/Je liep (\d+) stappen/, 'Je voeten tekenden $1 kleine verhalen op de aarde');
  styledText = styledText.replace(/Je bezocht/, 'Je reis voerde je langs');
  styledText = styledText.replace(/Er waren (\d+) gesprekken/, 'Stemmen vermengden zich $1 keer in melodieën van verbinding');
  
  // Poetic transitions
  styledText = styledText.replace(/\. /, '... en terwijl de uren voorbijtikten, ');
  styledText = styledText.replace(/en terwijl de uren voorbijtikten, en terwijl de uren voorbijtikten,/, 'en terwijl de uren voorbijtikten,'); // Fix double
  
  // Poetic ending
  styledText += ' Zo vloeide jouw dag voorbij als een rivier vol verhalen.';
  
  return styledText;
};

/**
 * Get style-specific AI prompt modifications with enhanced Dutch templates
 * @param {string} basePrompt - The base AI prompt
 * @param {string} style - The narrative style
 * @returns {string} The enhanced prompt with Dutch system prompt
 */
export const getStyledAIPrompt = (basePrompt, style = NARRATIVE_STYLES.STANDAARD) => {
  const styleConfig = getStyleConfig(style);
  
  // Combineer system prompt met base prompt en style-specifieke instructies
  const enhancedPrompt = `${styleConfig.systemPrompt}

${basePrompt}

${styleConfig.promptSuffix}

Belangrijke richtlijnen:
- Schrijf altijd in het Nederlands
- Gebruik de tweede persoon ("jij", "je")
- Houd de toon ${styleConfig.tone}
- Streef naar een ${styleConfig.length} verhaal
- Maak het verhaal persoonlijk en relevant
- Gebruik alleen de verstrekte data, verzin geen extra informatie`;

  return enhancedPrompt;
};

/**
 * Get simplified style instruction for backward compatibility
 * @param {string} basePrompt - The base AI prompt  
 * @param {string} style - The narrative style
 * @returns {string} The modified prompt with basic style instruction
 */
export const getBasicStyledAIPrompt = (basePrompt, style = NARRATIVE_STYLES.STANDAARD) => {
  const basicStyleInstructions = {
    [NARRATIVE_STYLES.CASUAL]: 'Schrijf in een casual, vriendelijke toon alsof je tegen een goede vriend praat. Gebruik informele taal en bemoedigende zinnen.',
    [NARRATIVE_STYLES.GEDETAILLEERD]: 'Schrijf een gedetailleerd, analytisch verhaal met rijke context en inzichten over de activiteiten en hun betekenis.',
    [NARRATIVE_STYLES.PROFESSIONEEL]: 'Schrijf in een formele, professionele rapportstijl met gestructureerde taal en objectieve observaties.',
    [NARRATIVE_STYLES.POETISCH]: 'Schrijf in een creatieve, poëtische stijl met metaforen en mooie beeldspraak om de dag te beschrijven.',
    [NARRATIVE_STYLES.STANDAARD]: 'Schrijf in een heldere, directe vertelstijl.'
  };

  const instruction = basicStyleInstructions[style] || basicStyleInstructions[NARRATIVE_STYLES.STANDAARD];
  return `${basePrompt}\n\nStijl instructie: ${instruction}`;
};

export default {
  NARRATIVE_STYLES,
  STORY_STYLE_CONFIG,
  getNarrativeStyle,
  setNarrativeStyle,
  getStyleConfig,
  getAllStyleConfigs,
  applyNarrativeStyle,
  getStyledAIPrompt,
  getBasicStyledAIPrompt
};
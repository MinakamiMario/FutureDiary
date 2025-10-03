import { OnboardingStep } from '../types/onboarding.types';
import { AI_MODEL_TYPES } from '../../../services/aiNarrativeService';
import { NARRATIVE_STYLES } from '../../../utils/narrativeStyles';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'info',
    title: 'Welkom bij Minakami',
    subtitle: 'Je persoonlijke leven & activiteiten tracker',
    description: 'Minakami helpt je jouw dagelijkse activiteiten, gezondheid en levenspatronen bij te houden met AI-gegenereerde dagboeken.',
    icon: 'analytics-outline',
    iconColor: '#4a90e2',
    key: 'onboarding_welcome'
  },
  {
    id: 'ai_model',
    type: 'selection',
    title: 'Kies je AI Model',
    subtitle: 'Hoe wil je je dagboeken gegenereerd hebben?',
    description: 'Selecteer het AI model dat je dagboeken gaat schrijven. Dit kun je later altijd aanpassen.',
    icon: 'sparkles-outline',
    iconColor: '#9C27B0',
    key: 'preferredAIModel',
    options: [
      {
        id: AI_MODEL_TYPES.CHATGPT,
        title: 'ChatGPT (GPT-4o)',
        subtitle: 'Jouw Werkende API',
        description: 'Gebruik je eigen OpenAI API key voor dagboeken',
        icon: 'flash-outline',
        recommended: true,
        badge: 'Configured'
      },
      {
        id: AI_MODEL_TYPES.CLAUDE,
        title: 'Claude AI',
        subtitle: 'Alternatief AI Model',
        description: 'Natuurlijk schrijvende AI (vereist Claude API key)',
        icon: 'document-text-outline',
        recommended: false
      },
      {
        id: AI_MODEL_TYPES.TEMPLATE,
        title: 'Template Modus',
        subtitle: 'Geen AI - Gratis',
        description: 'Gebruik vaste templates zonder API kosten',
        icon: 'list-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'narrative_style',
    type: 'selection',
    title: 'Schrijfstijl',
    subtitle: 'In welke stijl wil je je dagboeken?',
    description: 'Kies de schrijfstijl die het beste bij jou past.',
    icon: 'create-outline',
    iconColor: '#FF5722',
    key: 'narrativeStyle',
    options: [
      {
        id: NARRATIVE_STYLES.STANDAARD,
        title: 'Standaard',
        subtitle: 'Neutrale beschrijving',
        description: 'Objectieve beschrijving van je dag',
        icon: 'document-outline',
        recommended: true
      },
      {
        id: NARRATIVE_STYLES.PROFESSIONEEL,
        title: 'Professioneel',
        subtitle: 'Zakelijke toon',
        description: 'Formele en gestructureerde dagboeken',
        icon: 'briefcase-outline',
        recommended: false
      },
      {
        id: NARRATIVE_STYLES.CASUAL,
        title: 'Casual',
        subtitle: 'Relaxed schrijven',
        description: 'Informele en persoonlijke stijl',
        icon: 'happy-outline',
        recommended: false
      },
      {
        id: NARRATIVE_STYLES.POETIC,
        title: 'Poëtisch',
        subtitle: 'Creatief & Beeldend',
        description: 'Artistieke en beeldende beschrijvingen',
        icon: 'color-palette-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'tracking_goals',
    type: 'selection',
    title: 'Wat wil je bijhouden?',
    subtitle: 'Kies je tracking doelen',
    description: 'We passen de app aan op basis van wat jij belangrijk vindt.',
    icon: 'checkmark-done-outline',
    iconColor: '#2196F3',
    key: 'tracking_goals',
    options: [
      {
        id: 'health_fitness',
        title: 'Gezondheid & Fitness',
        subtitle: 'Stappen, workouts, gezondheid',
        description: 'Volg je dagelijkse activiteit en sportprestaties',
        icon: 'fitness-outline',
        recommended: true,
        badge: 'Populair'
      },
      {
        id: 'life_patterns',
        title: 'Levenspatronen',
        subtitle: 'Locaties en dagelijkse routines',
        description: 'Ontdek patronen in je dagelijkse leven',
        icon: 'location-outline',
        recommended: false
      },
      {
        id: 'digital_wellness',
        title: 'Digital Wellness',
        subtitle: 'App gebruik tracking',
        description: 'Begrijp je telefoongebruik en schermtijd',
        icon: 'phone-portrait-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'permissions',
    type: 'permission',
    title: 'Toestemmingen',
    subtitle: 'Geef de app toegang tot belangrijke functies',
    description: 'Deze toestemmingen helpen ons je activiteiten nauwkeurig bij te houden en persoonlijke inzichten te geven.',
    icon: 'shield-checkmark-outline',
    iconColor: '#4CAF50',
    key: 'permissions',
    required: false,
    permissions: [
      {
        permission: 'android.permission.ACTIVITY_RECOGNITION',
        title: 'Activiteit Herkenning',
        subtitle: 'Detecteer beweging en activiteit',
        description: 'Herkent automatisch lopen, fietsen en andere activiteiten',
        icon: 'walk-outline',
        required: false,
        androidOnly: true
      },
      {
        permission: 'android.permission.ACCESS_FINE_LOCATION',
        title: 'Locatie',
        subtitle: 'Bezochte plaatsen bijhouden',
        description: 'Houd bezochte locaties bij voor je dagboek',
        icon: 'location-outline',
        required: false
      },
      {
        permission: 'android.permission.READ_CALL_LOG',
        title: 'Telefoongeschiedenis',
        subtitle: 'Optioneel voor dagboek context',
        description: 'Voeg telefoonactiviteit toe aan je dagelijkse verhaal',
        icon: 'call-outline',
        required: false
      },
      {
        permission: 'android.permission.POST_NOTIFICATIONS',
        title: 'Notificaties',
        subtitle: 'Dagelijkse herinneringen',
        description: 'Ontvang herinneringen voor je dagboek',
        icon: 'notifications-outline',
        required: false
      },
      {
        permission: 'android.permission.health.READ_STEPS',
        title: 'Health Connect - Stappen',
        subtitle: 'Stappen data lezen',
        description: 'Lees je stappen van Health Connect',
        icon: 'footsteps-outline',
        required: false,
        androidOnly: true
      },
      {
        permission: 'android.permission.health.READ_DISTANCE',
        title: 'Health Connect - Afstand',
        subtitle: 'Afstand data lezen',
        description: 'Lees afgelegde afstand van Health Connect',
        icon: 'map-outline',
        required: false,
        androidOnly: true
      },
      {
        permission: 'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
        title: 'Health Connect - Calorieën',
        subtitle: 'Verbrande calorieën',
        description: 'Lees verbrande calorieën van Health Connect',
        icon: 'flame-outline',
        required: false,
        androidOnly: true
      }
    ]
  },
  {
    id: 'complete',
    type: 'info',
    title: 'Je bent klaar!',
    subtitle: 'Welkom bij Minakami',
    description: 'Je hebt de onboarding voltooid. Begin vandaag nog met het automatisch genereren van je persoonlijke dagboeken!',
    icon: 'checkmark-circle-outline',
    iconColor: '#4CAF50',
    key: 'onboarding_completed'
  }
];

import { OnboardingStep } from '../types/onboarding.types';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    type: 'info',
    title: 'Welkom bij Minakami',
    subtitle: 'Je persoonlijke menstruatie- en vruchtbaarheids tracker',
    description: 'Minakami helpt je bij het bijhouden van je menstruatiecyclus, het voorspellen van je vruchtbare dagen en het begrijpen van je lichaam.',
    icon: 'heart-outline',
    iconColor: '#E91E63',
    key: 'onboarding_completed'
  },
  {
    id: 'cycle_length',
    type: 'selection',
    title: 'Hoe lang is je cyclus?',
    subtitle: 'Dit helpt ons je voorspellingen nauwkeuriger te maken',
    description: 'Selecteer de lengte die het dichtst bij jouw cyclus komt. Je kunt dit later altijd aanpassen.',
    icon: 'calendar-outline',
    iconColor: '#9C27B0',
    key: 'cycle_length',
    options: [
      {
        id: '21-25',
        title: '21-25 dagen',
        subtitle: 'Korte cyclus',
        description: 'Je cyclus duurt tussen de 21 en 25 dagen',
        icon: 'trending-down-outline',
        recommended: false
      },
      {
        id: '26-30',
        title: '26-30 dagen',
        subtitle: 'Normale cyclus',
        description: 'Je cyclus duurt tussen de 26 en 30 dagen',
        icon: 'remove-outline',
        recommended: true
      },
      {
        id: '31-35',
        title: '31-35 dagen',
        subtitle: 'Lange cyclus',
        description: 'Je cyclus duurt tussen de 31 en 35 dagen',
        icon: 'trending-up-outline',
        recommended: false
      },
      {
        id: 'irregular',
        title: 'Onregelmatig',
        subtitle: 'Wisselende lengte',
        description: 'Je cyclus varieert sterk in lengte',
        icon: 'shuffle-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'period_duration',
    type: 'selection',
    title: 'Hoe lang duurt je menstruatie?',
    subtitle: 'Gemiddelde duur van je onttrekking',
    description: 'Hoeveel dagen bloed je meestal tijdens je menstruatie.',
    icon: 'time-outline',
    iconColor: '#FF5722',
    key: 'period_duration',
    options: [
      {
        id: '3-4',
        title: '3-4 dagen',
        subtitle: 'Kort',
        description: 'Je menstruatie duurt 3 tot 4 dagen',
        icon: 'trending-down-outline',
        recommended: false
      },
      {
        id: '5-6',
        title: '5-6 dagen',
        subtitle: 'Gemiddeld',
        description: 'Je menstruatie duurt 5 tot 6 dagen',
        icon: 'remove-outline',
        recommended: true
      },
      {
        id: '7-8',
        title: '7-8 dagen',
        subtitle: 'Lang',
        description: 'Je menstruatie duurt 7 tot 8 dagen',
        icon: 'trending-up-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'tracking_goals',
    type: 'selection',
    title: 'Wat wil je bijhouden?',
    subtitle: 'Kies je tracking doelen',
    description: 'We passen de app aan op basis van wat jij belangrijk vindt om bij te houden.',
    icon: 'target-outline',
    iconColor: '#2196F3',
    key: 'tracking_goals',
    options: [
      {
        id: 'period_prediction',
        title: 'Menstruatie voorspelling',
        subtitle: 'Voor je volgende cyclus',
        description: 'Ontvang meldingen voordat je menstruatie begint',
        icon: 'calendar-outline',
        recommended: true
      },
      {
        id: 'fertility_tracking',
        title: 'Vruchtbaarheid volgen',
        subtitle: 'Voor zwangerschap of anticonceptie',
        description: 'Identificeer je meest vruchtbare dagen',
        icon: 'heart-outline',
        recommended: false
      },
      {
        id: 'symptom_tracking',
        title: 'Symptomen registreren',
        subtitle: 'Stemming, pijn en klachten',
        description: 'Houd fysieke en emotionele symptomen bij',
        icon: 'medkit-outline',
        recommended: false
      }
    ]
  },
  {
    id: 'permissions',
    type: 'permission',
    title: 'Toestemmingen',
    subtitle: 'Laat ons je helpen met meldingen en locatie',
    description: 'Deze toestemmingen helpen ons je beter te ondersteunen met accurate voorspellingen en tijdige meldingen.',
    icon: 'shield-checkmark-outline',
    iconColor: '#4CAF50',
    key: 'permissions',
    required: true,
    permissions: [
      {
        permission: 'notifications',
        title: 'Meldingen',
        subtitle: 'Herinneringen voor je cyclus',
        description: 'Stuur je herinneringen voor je menstruatie en vruchtbare dagen',
        icon: 'notifications-outline',
        required: true
      },
      {
        permission: 'location',
        title: 'Locatie',
        subtitle: 'Verbeterde voorspellingen',
        description: 'Gebruik je locatie voor nauwkeurigere voorspellingen op basis van weer en locatie',
        icon: 'location-outline',
        required: false
      },
      {
        permission: 'health',
        title: 'Gezondheidsdata',
        subtitle: 'Gegevens synchronisatie',
        description: 'Synchroniseer met Apple Health of Google Fit',
        icon: 'heart-pulse-outline',
        required: false
      }
    ]
  },
  {
    id: 'complete',
    type: 'info',
    title: 'Je bent klaar!',
    subtitle: 'Welkom bij Minakami',
    description: 'Je hebt de onboarding voltooid. We gaan je helpen je cyclus beter te begrijpen en je gezondheid te optimaliseren.',
    icon: 'checkmark-circle-outline',
    iconColor: '#4CAF50',
    key: 'onboarding_completed'
  }
];
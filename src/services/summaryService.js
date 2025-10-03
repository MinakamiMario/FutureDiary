// summaryService.js - Met verhalende samenvattingsfunctionaliteit

// Import services om data op te halen
import activityService from './activityService';
import locationService from './locationService';
import callLogService from './callLogService';
// import appUsageService from './appUsageService'; // TEMPORARILY DISABLED - causes import error
import databaseService from './database';
// import samsungHealthService from './samsungHealthService'; // REMOVED - Only using Health Connect
import { getContactName } from '../utils/contactsHelper';
import { formatDuration, formatHours } from '../utils/formatters';
import {
  generateNarrativeWithAI,
  getPreferredAIModel,
  AI_MODEL_TYPES
} from './aiNarrativeService';
import {
  getNarrativeStyle,
  applyNarrativeStyle,
  getStyledAIPrompt
} from '../utils/narrativeStyles';
import {
  generateEnhancedIntroduction,
  generateEnhancedLocationNarrative,
  generateEnhancedCallsNarrative,
  generateEnhancedConclusion
} from '../utils/enhancedTemplates';
import errorHandler from './errorLogger';
import { getHealthContextForDate, createHealthAIContext } from '../utils/healthNarrativeIntegration';

// Helper functie om demo/mock data te detecteren
const isLikelyDemoData = (steps) => {
  if (steps === 0) return false;
  
  // Demo data patronen detecteren
  const commonDemoValues = [8500, 9000, 10000, 12000, 7500, 8750];
  const isDemoValue = commonDemoValues.some(demo => Math.abs(steps - demo) < 1000);
  
  // Typische demo stappen patterns (rond getallen of te perfecte variaties)
  const isRoundNumber = steps % 500 === 0 || steps % 250 === 0;
  const isInDemoRange = steps >= 7000 && steps <= 13000;
  
  return isDemoValue || (isRoundNumber && isInDemoRange);
};

// Helper functies om dagelijkse data op te halen
const getDailyActivities = async (date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    // Get activities from database (includes Health Connect data)
    let activities = await databaseService.getActivities(startTimestamp, endTimestamp);
    
    // Samsung Health integration removed - now using Health Connect only
    // Health data will be collected through healthDataService and stored in database
    
    return activities;
  } catch (error) {
    console.error('Error getting daily activities:', error);
    return [];
  }
};

const getDailyLocations = async (date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    return await locationService.getVisitedPlaces(startTimestamp, endTimestamp);
  } catch (error) {
    console.error('Error getting daily locations:', error);
    return [];
  }
};

const getDailyCallLogs = async (date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();
    
    // Controleer of callLogService beschikbaar is (alleen Android)
    if (callLogService && callLogService.isAvailable) {
      const result = await callLogService.getCallAnalytics(startTimestamp, endTimestamp);
      return Array.isArray(result) ? result : [];
    }
    return [];
  } catch (error) {
    console.error('Error getting daily call logs:', error);
    return [];
  }
};

const getDailyAppUsage = async (date) => {
  try {
    const dateString = date.toISOString().split('T')[0];
    
    // Haal app usage data op voor deze dag
    const appUsageData = await databaseService.getAppUsageByDate(dateString);
    
    if (!appUsageData || appUsageData.length === 0) {
      return {
        totalScreenTime: 0,
        topApps: [],
        categories: {},
        appCount: 0
      };
    }

    // Bereken totale schermtijd
    const totalScreenTime = appUsageData.reduce((sum, app) => sum + (app.duration || 0), 0);
    
    // Top 3 apps voor verhaal
    const sortedApps = [...appUsageData]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 3);

    // Groepeer per categorie
    const categories = {};
    appUsageData.forEach(app => {
      const category = app.category || 'Overig';
      if (!categories[category]) {
        categories[category] = { totalTime: 0, apps: [] };
      }
      categories[category].totalTime += (app.duration || 0);
      categories[category].apps.push(app);
    });

    return {
      totalScreenTime,
      topApps: sortedApps,
      categories,
      appCount: appUsageData.length
    };
  } catch (error) {
    console.error('Error getting daily app usage:', error);
    return {
      totalScreenTime: 0,
      topApps: [],
      categories: {},
      appCount: 0
    };
  }
};

// Zorg ervoor dat de database geïnitialiseerd is voordat we queries uitvoeren
export const getDailySummary = async (date) => {
  try {
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    // Gebruik databaseService om de dagelijkse samenvatting op te halen
    return await databaseService.getDailySummary(date);
  } catch (error) {
    console.error('Error retrieving daily summary:', error);
    throw error;
  }
};

// Bestaande functie voor dagelijkse samenvattingen
export const generateDailySummary = async (date) => {
  try {
    // Valideer dat de datum niet in de toekomst ligt
    const today = new Date();
    const selectedDate = new Date(date);
    
    // Reset tijd naar middernacht voor vergelijking
    today.setHours(23, 59, 59, 999);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      return {
        success: false,
        error: 'FUTURE_DATE',
        message: 'Kan geen dagboek genereren voor een toekomstige datum. Selecteer een datum van vandaag of eerder.',
        date: date
      };
    }
    
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    
    const activities = await getDailyActivities(date);
    const locations = await getDailyLocations(date);
    const calls = await getDailyCallLogs(date);
    const appUsage = await getDailyAppUsage(date);
    
    // Genereer statistieken zoals voorheen
    const summary = {
      date,
      totalSteps: calculateTotalSteps(activities),
      activeMinutes: calculateActiveMinutes(activities),
      locationsVisited: locations.length,
      callsMade: calls.filter(call => call.type === 'outgoing').length,
      callsReceived: calls.filter(call => call.type === 'incoming').length,
      // Overige statistieken...
    };
    
    // Nieuwe functionaliteit: genereer verhalende samenvatting (met mogelijke AI ondersteuning)
    const narrativeSummary = await generateNarrativeSummary(activities, locations, calls, appUsage, date);
    summary.narrative = narrativeSummary;
    
    // Sla samenvatting op in database
    await databaseService.saveNarrativeSummary(date, narrativeSummary);
    
    return summary;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    throw error;
  }
};

// Nieuwe functie voor het genereren van een verhalend verhaal
export const generateNarrativeSummary = async (activities, locations, calls, appUsage, date) => {
  try {
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    
    // Haal de gewenste narrative style op
    const narrativeStyle = await getNarrativeStyle();
    
    // Haal gebruiker notities op voor deze datum
    const userNotes = await databaseService.getUserNotesForDate(date);
    
    // Probeer eerst het verhaal met AI te genereren als dat de voorkeur heeft
    const preferredAIModel = await getPreferredAIModel();
    if (preferredAIModel !== AI_MODEL_TYPES.TEMPLATE) {
      const aiNarrative = await generateNarrativeWithAI(activities, locations, calls, appUsage, date, null, narrativeStyle, userNotes);
      
      // Als AI-generatie succesvol was, gebruik het AI-verhaal
      if (aiNarrative) {
        await errorHandler.info(`Narrative generated using ${preferredAIModel} with ${narrativeStyle} style`);
        return aiNarrative;
      }
      
      // Als AI-generatie mislukt, val terug op de sjabloonmethode
      await errorHandler.info(`Falling back to template method after failed ${preferredAIModel} generation`);
    }
    
    // Sjabloonmethode als AI niet geselecteerd is of mislukt is
    // 1. Activiteiten analyseren en groeperen
    const activityGroups = groupActivitiesByType(activities);
    
    // 2. Locaties verwerken
    const processedLocations = processLocations(locations);
    
    // 3. Gesprekken verwerken
    const processedCalls = processCalls(calls);
    
    // 4. App usage verwerken
    const processedAppUsage = processAppUsage(appUsage);
    
    // 5. Compacte dagboek format
    return generateCompactDailyReport(
      date,
      activityGroups,
      processedLocations,
      processedCalls,
      processedAppUsage,
      narrativeStyle,
      userNotes
    );
  } catch (error) {
    console.error('Error generating narrative summary:', error);
    return 'Er kon geen verhalende samenvatting worden gegenereerd voor vandaag.';
  }
};

// Nieuwe compacte dagboek format implementatie
const generateCompactDailyReport = (date, activityGroups, processedLocations, processedCalls, processedAppUsage, narrativeStyle, userNotes = []) => {
  try {
    // Bereken key metrics
    const steps = activityGroups.totalSteps || 0;
    const locations = processedLocations.visited ? processedLocations.visited.length : 0;
    const calls = processedCalls.totalCalls || 0;
    
    // Format datum in Nederlands
    const formattedDate = new Date(date).toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    
    // Header met chips (eenvoudig en clean)
    const chips = `${steps.toLocaleString('nl-NL')} stappen • ${locations} plekken • ${calls} gesprekken`;
    
    // Genereer verhaal in natuurlijke taal
    const story = generatePersonalStory(steps, locations, calls, processedLocations, processedAppUsage, activityGroups, userNotes);
    
    // Combineer alles tot een persoonlijk verhaal
    const report = [
      `**${formattedDate}**`,
      '',
      chips,
      '',
      story
    ].join('\n');
    
    return report;
    
  } catch (error) {
    console.error('Error generating compact daily report:', error);
    // Fallback naar simpele format
    return `**${new Date(date).toLocaleDateString('nl-NL')}**\n\nEr kon geen verhaal worden gegenereerd voor vandaag.`;
  }
};

// Genereer persoonlijk verhaal in natuurlijke taal
const generatePersonalStory = (steps, locations, calls, processedLocations, processedAppUsage, activityGroups, userNotes = []) => {
  const stories = [];
  
  // Detecteer of we echte data hebben vs mock/demo data
  const hasRealSteps = steps > 0 && !isLikelyDemoData(steps);
  const hasRealLocations = processedLocations && processedLocations.length > 0;
  const hasRealCalls = calls > 0;
  const hasRealData = hasRealSteps || hasRealLocations || hasRealCalls;
  
  // Als er gebruiker notities zijn, maak deze de hoofdfocus
  if (userNotes.length > 0) {
    const userStory = getUserNotesStory(userNotes, steps, locations, calls);
    stories.push(userStory);
    
    // Voeg relevante tracking data toe als context
    const contextStory = getTrackingContext(steps, processedLocations, calls, processedAppUsage, activityGroups);
    if (contextStory) stories.push(contextStory);
  } else {
    // Geen notities: gebruik standaard verhaal gebaseerd op tracking data
    
    // Start met een persoonlijke opening
    const opener = getPersonalOpener(steps, locations, calls, hasRealData);
    stories.push(opener);
    
    // Voeg beweging toe op een natuurlijke manier
    const movementStory = getMovementStory(steps, activityGroups);
    if (movementStory) stories.push(movementStory);
    
    // Voeg locaties toe zonder technische details
    const locationStory = getLocationStory(processedLocations);
    if (locationStory) stories.push(locationStory);
    
    // Voeg communicatie toe indien relevant
    const communicationStory = getCommunicationStory(calls, processedAppUsage);
    if (communicationStory) stories.push(communicationStory);
    
    // Voeg health stats toe op natuurlijke manier
    const healthStory = getHealthStory(activityGroups);
    if (healthStory) stories.push(healthStory);
  }
  
  return stories.join(' ');
};

// Verwerk gebruiker notities tot een natuurlijk verhaal
const getUserNotesStory = (userNotes, steps, locations, calls) => {
  if (userNotes.length === 0) return '';
  
  // Combineer notities in chronologische volgorde
  const sortedNotes = userNotes.sort((a, b) => a.timestamp - b.timestamp);
  
  if (sortedNotes.length === 1) {
    return `Vandaag noteerde je: "${sortedNotes[0].text}"`;
  } else if (sortedNotes.length === 2) {
    return `Vandaag noteerde je: "${sortedNotes[0].text}" Later voegde je toe: "${sortedNotes[1].text}"`;
  } else {
    // Meer dan 2 notities - maak een samenhangende verhaal
    const firstNote = sortedNotes[0];
    const lastNote = sortedNotes[sortedNotes.length - 1];
    const middleCount = sortedNotes.length - 2;
    
    if (middleCount === 1) {
      return `Vandaag noteerde je: "${firstNote.text}" Tijdens de dag voegde je toe: "${sortedNotes[1].text}" En tot slot: "${lastNote.text}"`;
    } else {
      return `Vandaag noteerde je: "${firstNote.text}" Je voegde nog ${middleCount} andere momenten toe, en eindigde met: "${lastNote.text}"`;
    }
  }
};

// Geef tracking context rond gebruiker notities
const getTrackingContext = (steps, processedLocations, calls, processedAppUsage, activityGroups) => {
  const contextParts = [];
  
  // Korte bewegingscontext
  if (steps > 0) {
    if (steps > 10000) {
      contextParts.push(`een actieve dag met ${Math.round(steps/1000)}k stappen`);
    } else if (steps > 5000) {
      contextParts.push(`${Math.round(steps/1000)}k stappen`);
    }
  }
  
  // Korte locatiecontext
  if (processedLocations.visited && processedLocations.visited.length > 1) {
    contextParts.push(`${processedLocations.visited.length} verschillende plekken bezocht`);
  }
  
  // Belangrijke health data
  if (activityGroups.workouts && activityGroups.workouts.length > 0) {
    const totalWorkoutMinutes = activityGroups.workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    if (totalWorkoutMinutes > 30) {
      contextParts.push(`een workout van ${totalWorkoutMinutes} minuten`);
    }
  }
  
  if (contextParts.length === 0) return null;
  
  return `Daarbij had je ${contextParts.join(' en ')}.`;
};

// Persoonlijke opening gebaseerd op de dag - intelligente fallback voor real data
const getPersonalOpener = (steps, locations, calls, hasRealData = false) => {
  // Als we geen echte data hebben, gebruik een neutralere opening
  if (!hasRealData || (steps === 0 && locations === 0 && calls === 0)) {
    return "Vandaag heb je je dagelijkse routine gevolgd.";
  }
  
  // Bepaal het karakter van de dag met echte data
  const isActive = steps > 7500;
  const isMobile = locations > 2;
  const isSocial = calls > 2;
  
  if (isActive && isMobile) {
    return "Een dynamische dag vol beweging en nieuwe plekken.";
  } else if (isActive) {
    return "Een actieve dag, lekker in beweging geweest.";
  } else if (isMobile) {
    return "Je was vandaag onderweg naar verschillende plekken.";
  } else if (isSocial) {
    return "Een sociale dag met veel contact met anderen.";
  } else if (steps > 0 || locations > 0) {
    return "Een rustige dag, vooral dichtbij huis gebleven.";
  } else {
    return "Vandaag was een rustige dag zonder veel gemeten activiteit.";
  }
};

// Bewegingsverhaal zonder robotachtige data
const getMovementStory = (steps, activityGroups) => {
  if (steps === 0) {
    return "Je hebt vandaag vooral binnen doorgebracht.";
  } else if (steps < 3000) {
    return "Je bent niet veel gelopen vandaag.";
  } else if (steps < 7500) {
    return `Met ${Math.round(steps/1000)}k stappen had je een gemiddeld actieve dag.`;
  } else if (steps < 12000) {
    return `Lekker actief geweest met ${Math.round(steps/1000)}k stappen!`;
  } else {
    return `Wow, ${Math.round(steps/1000)}k stappen - dat was een super actieve dag!`;
  }
};

// Locatieverhaal zonder GPS coördinaten
const getLocationStory = (processedLocations) => {
  if (!processedLocations.visited || processedLocations.visited.length === 0) {
    return null;
  }
  
  const locations = processedLocations.visited;
  const hasHome = locations.some(l => l.label === 'home');
  const hasWork = locations.some(l => l.label === 'work');
  
  if (locations.length === 1) {
    return "Je bent op één plek geweest vandaag.";
  } else if (locations.length === 2 && hasHome && hasWork) {
    return "Het klassieke heen-en-weer tussen thuis en werk.";
  } else if (locations.length <= 3) {
    return "Je hebt een paar verschillende plekken bezocht.";
  } else {
    return `Je was druk bezig met ${locations.length} verschillende plekken op je route.`;
  }
};

// Communicatieverhaal inclusief screen time
const getCommunicationStory = (calls, processedAppUsage) => {
  const stories = [];
  
  // Telefoonverhaal
  if (calls === 0) {
    stories.push("Geen telefoongesprekken vandaag");
  } else if (calls === 1) {
    stories.push("Eén telefoongesprek gehad");
  } else if (calls <= 3) {
    stories.push(`${calls} gesprekken gevoerd`);
  } else {
    stories.push(`Druk aan de telefoon geweest met ${calls} gesprekken`);
  }
  
  // Screen time verhaal (alleen als significant)
  if (processedAppUsage.totalMinutes > 120) { // Meer dan 2 uur
    const hours = Math.round(processedAppUsage.totalMinutes / 60);
    if (hours >= 5) {
      stories.push(`en behoorlijk wat tijd op je telefoon besteed (${hours}u)`);
    } else if (hours >= 3) {
      stories.push(`met ${hours}u schermtijd`);
    }
    
    // Voeg top app toe als het interessant is
    if (processedAppUsage.topApps && processedAppUsage.topApps.length > 0) {
      const topApp = processedAppUsage.topApps[0];
      const appName = topApp.appName || topApp.app_name;
      const minutes = Math.floor((topApp.totalTime || topApp.duration || 0) / (1000 * 60));
      
      // Alleen vermelden als de app meer dan 30 minuten gebruikt is
      if (minutes > 30 && !appName.toLowerCase().includes('system')) {
        stories.push(`vooral ${appName}`);
      }
    }
  }
  
  if (stories.length === 0) return null;
  return stories.join(', ') + '.';
};

// Health stats verhaal in menselijke taal
const getHealthStory = (activityGroups) => {
  if (!activityGroups.healthData) return null;
  
  const healthParts = [];
  
  // Calorieën op een persoonlijke manier
  if (activityGroups.healthData.calories && activityGroups.healthData.calories.length > 0) {
    const totalCalories = activityGroups.healthData.calories.reduce((sum, cal) => sum + (cal.value || 0), 0);
    if (totalCalories > 0) {
      if (totalCalories > 2800) {
        healthParts.push(`Je hebt flink wat energie verbrand vandaag (${Math.round(totalCalories)} calorieën)!`);
      } else if (totalCalories > 2000) {
        healthParts.push(`${Math.round(totalCalories)} calorieën verbrand`);
      } else if (totalCalories > 1200) {
        healthParts.push(`Een rustige dag qua energieverbruik (${Math.round(totalCalories)} cal)`);
      }
    }
  }
  
  // Hartslag op een begrijpelijke manier
  if (activityGroups.healthData.heartRate && activityGroups.healthData.heartRate.length > 0) {
    const avgHeartRate = Math.round(
      activityGroups.healthData.heartRate.reduce((sum, hr) => sum + (hr.value || 0), 0) / 
      activityGroups.healthData.heartRate.length
    );
    if (avgHeartRate > 0) {
      if (avgHeartRate > 85) {
        healthParts.push(`je hart ging lekker tekeer vandaag (${avgHeartRate} bpm gemiddeld)`);
      } else if (avgHeartRate > 75) {
        healthParts.push(`een actieve hartslag van ${avgHeartRate} bpm`);
      } else if (avgHeartRate > 60) {
        healthParts.push(`rustige ${avgHeartRate} bpm hartslag`);
      }
    }
  }
  
  // Slaap van vorige nacht
  if (activityGroups.healthData.sleep && activityGroups.healthData.sleep.length > 0) {
    const totalSleepMinutes = activityGroups.healthData.sleep.reduce((sum, sleep) => sum + (sleep.duration || 0), 0);
    const sleepHours = Math.round(totalSleepMinutes / 60 * 10) / 10;
    if (sleepHours > 0) {
      if (sleepHours >= 8.5) {
        healthParts.push(`heerlijk uitgeslapen met ${sleepHours}u rust`);
      } else if (sleepHours >= 7) {
        healthParts.push(`goed geslapen (${sleepHours}u)`);
      } else if (sleepHours >= 5) {
        healthParts.push(`helaas maar ${sleepHours}u kunnen slapen`);
      } else if (sleepHours >= 3) {
        healthParts.push(`een korte nacht gehad (${sleepHours}u)`);
      }
    }
  }
  
  // Workouts op een enthousiaste manier
  if (activityGroups.workouts && activityGroups.workouts.length > 0) {
    const totalWorkoutMinutes = activityGroups.workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const workoutTypes = [...new Set(activityGroups.workouts.map(w => w.sport_type).filter(Boolean))];
    
    if (totalWorkoutMinutes > 0) {
      if (activityGroups.workouts.length === 1) {
        const workoutType = workoutTypes[0] || 'training';
        if (totalWorkoutMinutes > 60) {
          healthParts.push(`een uitgebreide ${workoutType} sessie van ${totalWorkoutMinutes} minuten`);
        } else {
          healthParts.push(`een goede ${workoutType} van ${totalWorkoutMinutes} min`);
        }
      } else {
        healthParts.push(`${activityGroups.workouts.length} verschillende workouts gedaan (${totalWorkoutMinutes} min totaal)`);
      }
    }
  }
  
  if (healthParts.length === 0) return null;
  
  // Combineer health parts op een natuurlijke manier
  if (healthParts.length === 1) {
    return healthParts[0];
  } else if (healthParts.length === 2) {
    return healthParts.join(' en ');
  } else {
    const lastPart = healthParts.pop();
    return healthParts.join(', ') + ' en ' + lastPart;
  }
};

// Helper functies voor het genereren van het verhaal
const groupActivitiesByType = (activities) => {
  // Validatie: zorg dat activities een array is
  if (!Array.isArray(activities)) {
    activities = [];
  }

  const groups = {
    walking: [],
    running: [],
    cycling: [],
    stillness: [],
    inVehicle: [],
    unknown: [],
    totalSteps: 0,
    activeMinutes: 0,
    // Add new health data categories
    workouts: [],
    healthData: {
      steps: [],
      calories: [],
      heartRate: [],
      sleep: []
    }
  };
  
  activities.forEach(activity => {
    if (!activity || !activity.type) return;
    
    // Handle health data types
    switch (activity.type) {
      case 'steps':
        groups.healthData.steps.push(activity);
        groups.totalSteps += (activity.value || 0);
        break;
      case 'calories':
        groups.healthData.calories.push(activity);
        break;
      case 'heart_rate':
        groups.healthData.heartRate.push(activity);
        break;
      case 'sleep':
        groups.healthData.sleep.push(activity);
        break;
      case 'workout':
        groups.workouts.push(activity);
        // Also add to specific sport categories if available
        if (activity.sport_type && groups[activity.sport_type]) {
          groups[activity.sport_type].push(activity);
        }
        groups.activeMinutes += (activity.duration || 0);
        break;
      default:
        // Handle legacy activity types
        if (groups[activity.type]) {
          groups[activity.type].push(activity);
          groups.unknown.push(activity);
        }
        break;
    }
    
    // Handle legacy steps format
    if (activity && activity.steps && typeof activity.steps === 'number') {
      groups.totalSteps += activity.steps;
    }
    
    // Handle legacy active minutes calculation
    if (activity && activity.type && ['walking', 'running', 'cycling'].includes(activity.type)) {
      groups.activeMinutes += activity.durationMinutes || 0;
    }
  });
  
  return groups;
};

const processLocations = (locations) => {
  // Validatie: zorg dat locations een array is
  if (!Array.isArray(locations)) {
    locations = [];
  }

  // Groepeer en verwerk locaties - ondersteuning voor beide oude en nieuwe data formats
  const homeLocation = locations.find(l => l && (l.label === 'home' || (l.name && l.name.toLowerCase().includes('thuis'))));
  const workLocation = locations.find(l => l && (l.label === 'work' || (l.name && l.name.toLowerCase().includes('kantoor'))));
  
  // Bereken geschatte tijd per locatie (voor nieuwe format)
  const locationStats = {};
  locations.forEach(location => {
    if (!location) return;
    
    const locationId = location.placeId || location.id || location.name;
    if (!locationId) return;
    
    if (!locationStats[locationId]) {
      locationStats[locationId] = {
        location: location,
        visits: 0,
        estimatedMinutes: 0
      };
    }
    
    locationStats[locationId].visits++;
    
    // Schat tijd op basis van visits (oude format gebruikt durationMinutes)
    if (location.durationMinutes) {
      locationStats[locationId].estimatedMinutes += location.durationMinutes;
    } else {
      // Geschatte tijd: 30-120 minuten per bezoek afhankelijk van locatie type
      const baseTime = location.label === 'home' ? 120 : 
                      location.label === 'work' ? 480 : 
                      location.label === 'shopping' ? 45 :
                      location.label === 'fitness' ? 90 : 60;
      locationStats[locationId].estimatedMinutes += baseTime;
    }
  });
  
  // Vind de locatie waar de meeste tijd is doorgebracht
  let mostTimeSpentLocation = null;
  let maxTime = 0;
  
  Object.values(locationStats).forEach(stat => {
    if (stat.estimatedMinutes > maxTime) {
      maxTime = stat.estimatedMinutes;
      mostTimeSpentLocation = stat.location;
    }
  });
  
  // Legacy timeSpent object voor backwards compatibility
  const timeSpent = {};
  Object.keys(locationStats).forEach(locationId => {
    timeSpent[locationId] = locationStats[locationId].estimatedMinutes;
  });
  
  return {
    visited: locations,
    home: homeLocation,
    work: workLocation,
    mostTimeSpent: mostTimeSpentLocation,
    timeSpent
  };
};

const processCalls = (calls) => {
  // Validatie: zorg dat calls een array is
  if (!Array.isArray(calls)) {
    calls = [];
  }

  const incoming = calls.filter(call => call && call.call_type === 'incoming');
  const outgoing = calls.filter(call => call && call.call_type === 'outgoing');
  const missed = calls.filter(call => call && call.call_type === 'missed');
  
  // Vind het meest gebelde contact
  const contactFrequency = {};
  calls.forEach(call => {
    if (call && call.phoneNumber) {
      contactFrequency[call.phoneNumber] = (contactFrequency[call.phoneNumber] || 0) + 1;
    }
  });
  
  let mostFrequentContact = null;
  let maxFrequency = 0;
  
  Object.keys(contactFrequency).forEach(phoneNumber => {
    if (contactFrequency[phoneNumber] > maxFrequency) {
      maxFrequency = contactFrequency[phoneNumber];
      mostFrequentContact = {
        phoneNumber,
        name: getContactName(phoneNumber) || 'Onbekend contact',
        frequency: maxFrequency
      };
    }
  });
  
  // Bereken totale gesprekstijd
  const totalCallDuration = calls.reduce((total, call) => {
    return total + (call.durationSeconds || 0);
  }, 0);
  
  return {
    incoming,
    outgoing,
    missed,
    totalCalls: calls.length,
    mostFrequentContact,
    totalCallDuration
  };
};

// Sjabloonfuncties voor verschillende delen van het verhaal
const generateIntroduction = (date, steps) => {
  const formattedDate = new Date(date).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const intros = [
    `Je dag op ${formattedDate} begon vol energie.`,
    `Op ${formattedDate} heb je een behoorlijk actieve dag gehad.`,
    `${formattedDate} was een interessante dag voor je.`
  ];
  
  const stepsComment = steps > 10000
    ? `Je hebt indrukwekkende ${steps} stappen gezet vandaag!`
    : steps > 5000
      ? `Je hebt een gezonde ${steps} stappen gezet vandaag.`
      : `Je hebt ${steps} stappen gezet vandaag.`;
  
  return `${intros[Math.floor(Math.random() * intros.length)]} ${stepsComment}`;
};

const generateActivityNarrative = (activityGroups) => {
  const narratives = [];
  
  if (activityGroups.walking.length > 0) {
    const totalWalkingMinutes = activityGroups.walking.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    
    if (totalWalkingMinutes > 60) {
      narratives.push(`Je hebt behoorlijk wat gewandeld vandaag, in totaal zo'n ${formatDuration(totalWalkingMinutes)}.`);
    } else if (totalWalkingMinutes > 30) {
      narratives.push(`Je hebt een fijne wandeling gemaakt van ongeveer ${formatDuration(totalWalkingMinutes)}.`);
    } else if (totalWalkingMinutes > 0) {
      narratives.push(`Je hebt wat korte wandelingen gemaakt, in totaal ongeveer ${formatDuration(totalWalkingMinutes)}.`);
    }
  }
  
  if (activityGroups.running.length > 0) {
    const totalRunningMinutes = activityGroups.running.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    
    narratives.push(`Je hebt vandaag ${formatDuration(totalRunningMinutes)} hardgelopen. Goed bezig!`);
  }
  
  if (activityGroups.cycling.length > 0) {
    const totalCyclingMinutes = activityGroups.cycling.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    
    narratives.push(`Je bent ${formatDuration(totalCyclingMinutes)} op de fiets geweest.`);
  }
  
  if (activityGroups.inVehicle.length > 0) {
    const totalDriveMinutes = activityGroups.inVehicle.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    
    narratives.push(`Je hebt ongeveer ${formatDuration(totalDriveMinutes)} in een voertuig doorgebracht.`);
  }
  
  if (activityGroups.stillness.length > 0 && activityGroups.stillness[0].durationMinutes > 120) {
    narratives.push('Je hebt ook behoorlijk wat tijd stilgezeten vandaag, mogelijk aan het werk of aan het ontspannen.');
  }
  
  if (narratives.length === 0) {
    narratives.push('Je lijkt vandaag een rustige dag te hebben gehad qua activiteiten.');
  }
  
  return narratives.join(' ');
};

const generateLocationNarrative = (processedLocations) => {
  const { visited, home, work, mostTimeSpent, timeSpent } = processedLocations;
  const narratives = [];
  
  if (visited.length === 1) {
    const location = visited[0];
    narratives.push(`Je bent vandaag op slechts één plek geweest: ${location.name || location.label || 'een locatie'}.`);
  } else {
    narratives.push(`Je hebt vandaag ${visited.length} verschillende locaties bezocht.`);
    
    if (mostTimeSpent) {
      const locationId = mostTimeSpent.placeId || mostTimeSpent.id || mostTimeSpent.name;
      const timeSpentHours = timeSpent[locationId] / 60;
      narratives.push(`De meeste tijd, ongeveer ${formatHours(timeSpentHours)}, bracht je door bij ${mostTimeSpent.name || mostTimeSpent.label || 'een locatie'}.`);
    }
    
    if (home) {
      const homeId = home.placeId || home.id || home.name;
      if (timeSpent[homeId]) {
        const homeHours = timeSpent[homeId] / 60;
        narratives.push(`Je was ongeveer ${formatHours(homeHours)} thuis.`);
      }
    }
    
    if (work) {
      const workId = work.placeId || work.id || work.name;
      if (timeSpent[workId]) {
        const workHours = timeSpent[workId] / 60;
        if (workHours > 5) {
          narratives.push(`Je hebt een productieve werkdag gehad van ongeveer ${formatHours(workHours)}.`);
        } else if (workHours > 0) {
          narratives.push(`Je was kort op je werk, ongeveer ${formatHours(workHours)}.`);
        }
      }
    }
  }
  
  // Voeg interessante locaties toe (niet thuis of werk)
  const interestingLocations = visited.filter(loc => {
    const homeId = home ? (home.placeId || home.id || home.name) : null;
    const workId = work ? (work.placeId || work.id || work.name) : null;
    const locId = loc.placeId || loc.id || loc.name;
    
    return (!homeId || locId !== homeId) &&
           (!workId || locId !== workId) &&
           loc.name && // Alleen locaties met een naam
           loc.label !== 'home' && loc.label !== 'work'; // Extra check op label
  });
  
  if (interestingLocations.length > 0 && interestingLocations.length <= 3) {
    const locationNames = interestingLocations
      .map(loc => loc.name || 'een locatie')
      .join(', ');
    narratives.push(`Je hebt ook ${locationNames} bezocht.`);
  } else if (interestingLocations.length > 3) {
    narratives.push(`Je hebt ook verschillende andere plekken bezocht, waaronder ${
      interestingLocations.slice(0, 3)
        .map(loc => loc.name || 'een locatie')
        .join(', ')
    } en nog ${interestingLocations.length - 3} andere locaties.`);
  }
  
  return narratives.join(' ');
};

const generateCallsNarrative = (processedCalls) => {
  const { incoming, outgoing, missed, totalCalls, mostFrequentContact, totalCallDuration } = processedCalls;
  const narratives = [];
  
  if (totalCalls === 0) {
    return 'Je hebt vandaag geen telefoongesprekken gevoerd.';
  }
  
  if (incoming.length > 0 || outgoing.length > 0) {
    narratives.push(`Je hebt vandaag in totaal ${totalCalls} telefoongesprekken gehad.`);
    
    if (outgoing.length > 0) {
      narratives.push(`Je hebt ${outgoing.length} uitgaande gesprekken gevoerd.`);
    }
    
    if (incoming.length > 0) {
      narratives.push(`Je hebt ${incoming.length} inkomende gesprekken ontvangen.`);
    }
    
    if (missed.length > 0) {
      narratives.push(`Je hebt ${missed.length} gemiste oproepen.`);
    }
    
    if (totalCallDuration > 0) {
      const hours = Math.floor(totalCallDuration / 3600);
      const minutes = Math.floor((totalCallDuration % 3600) / 60);
      
      if (hours > 0) {
        narratives.push(`In totaal heb je ${hours} uur en ${minutes} minuten aan de telefoon besteed.`);
      } else {
        narratives.push(`In totaal heb je ${minutes} minuten aan de telefoon besteed.`);
      }
    }
    
    if (mostFrequentContact) {
      narratives.push(`Je hebt het meest contact gehad met ${mostFrequentContact.name}, in totaal ${mostFrequentContact.frequency} keer.`);
    }
  }
  
  return narratives.join(' ');
};

const generateConclusion = (activityGroups, processedLocations, processedCalls, processedAppUsage) => {
  const conclusions = [];
  
  // Activiteitenconclusie
  if (activityGroups.totalSteps > 10000) {
    conclusions.push('Je hebt vandaag je stappendoel ruimschoots gehaald. Uitstekend werk!');
  } else if (activityGroups.totalSteps > 7500) {
    conclusions.push('Je was vandaag goed actief en hebt bijna je stappendoel bereikt.');
  } else if (activityGroups.totalSteps > 5000) {
    conclusions.push('Je hebt een redelijk actieve dag gehad, maar er is nog ruimte voor verbetering qua beweging.');
  } else {
    conclusions.push('Vandaag was relatief rustig qua activiteit. Misschien kun je morgen wat meer bewegen?');
  }
  
  // Vrijetijdsanalyse
  if (activityGroups.activeMinutes > 60) {
    conclusions.push('Je hebt vandaag voldoende tijd besteed aan actieve beweging, wat goed is voor je gezondheid.');
  }
  
  // Sociale conclusie
  if (processedCalls.totalCalls > 5) {
    conclusions.push('Je was sociaal actief vandaag met meerdere telefoongesprekken.');
  }
  
  // Locatieconclusie
  if (processedLocations.visited.length > 5) {
    conclusions.push('Je bent op veel verschillende plaatsen geweest vandaag, het was duidelijk een drukke dag.');
  }
  
  // Algemene conclusie
  const generalConclusions = [
    'Al met al was het een productieve dag.',
    'Het was een gevarieerde dag met verschillende activiteiten.',
    'Je dag was gevuld met interessante momenten.',
    'Alles bij elkaar was het een dag die de moeite waard was.'
  ];
  
  conclusions.push(generalConclusions[Math.floor(Math.random() * generalConclusions.length)]);
  
  return conclusions.join(' ');
};

// Helper functies voor berekeningen
const calculateTotalSteps = (activities) => {
  return activities.reduce((total, activity) => {
    // Handle legacy format (activity.steps)
    if (activity.steps) {
      return total + activity.steps;
    }
    
    // Handle new health data format (type: 'steps', value: number)
    if (activity.type === 'steps' && activity.value) {
      return total + activity.value;
    }
    
    return total;
  }, 0);
};

const calculateActiveMinutes = (activities) => {
  return activities
    .filter(activity => ['walking', 'running', 'cycling'].includes(activity.type))
    .reduce((total, activity) => total + (activity.duration ? Math.floor(activity.duration / 60000) : 0), 0);
};

// Functie om eerder gegenereerde verhalen op te halen
export const getNarrativeSummaries = async (startDate, endDate) => {
  try {
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    return await databaseService.getSavedNarrativeSummaries(startDate, endDate);
  } catch (error) {
    console.error('Error retrieving narrative summaries:', error);
    throw error;
  }
};

// Genereer wekelijkse samenvatting van alle dagen in een week
export const generateWeeklySummary = async (weekStartDate) => {
  try {
    // Bereken start en eind van de week
    const startDate = new Date(weekStartDate);
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Maandag als start van week
    
    startDate.setDate(startDate.getDate() + mondayOffset);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    // Controleer dat we geen toekomstige week proberen samen te vatten
    const today = new Date();
    if (startDate > today) {
      return {
        success: false,
        error: 'FUTURE_PERIOD',
        message: 'Kan geen wekelijkse samenvatting maken voor een toekomstige week.'
      };
    }
    
    // Haal alle dagelijkse samenvattingen op voor deze week
    const dailySummaries = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate && currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      try {
        const dailySummary = await databaseService.getDailySummary(dateStr);
        if (dailySummary && dailySummary.narrative) {
          dailySummaries.push({
            date: dateStr,
            dayName: currentDate.toLocaleDateString('nl-NL', { weekday: 'long' }),
            narrative: dailySummary.narrative,
            stats: dailySummary
          });
        }
      } catch (error) {
        if (__DEV__) console.warn(`Could not load summary for ${dateStr}:`, error);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (dailySummaries.length === 0) {
      return {
        success: false,
        message: 'Geen dagelijkse samenvattingen gevonden voor deze week. Genereer eerst dagelijkse verhalen.',
        period: 'week',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    }
    
    // Genereer gecombineerde wekelijkse samenvatting
    const weekSummary = await generateCombinedNarrative(dailySummaries, 'week', startDate, endDate);
    
    return {
      success: true,
      period: 'week',
      startDate: startDate.toISOString().split('T')[0],
      endDate: Math.min(endDate.getTime(), today.getTime()) < endDate.getTime() ? 
        today.toISOString().split('T')[0] : endDate.toISOString().split('T')[0],
      daysIncluded: dailySummaries.length,
      narrative: weekSummary,
      dailySummaries: dailySummaries
    };
    
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    throw error;
  }
};

// Genereer maandelijkse samenvatting van alle dagen in een maand
export const generateMonthlySummary = async (monthDate) => {
  try {
    const targetDate = new Date(monthDate);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Controleer dat we geen toekomstige maand proberen samen te vatten
    const today = new Date();
    if (startDate > today) {
      return {
        success: false,
        error: 'FUTURE_PERIOD',
        message: 'Kan geen maandelijkse samenvatting maken voor een toekomstige maand.'
      };
    }
    
    // Haal alle dagelijkse samenvattingen op voor deze maand
    const dailySummaries = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate && currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      try {
        const dailySummary = await databaseService.getDailySummary(dateStr);
        if (dailySummary && dailySummary.narrative) {
          dailySummaries.push({
            date: dateStr,
            narrative: dailySummary.narrative,
            stats: dailySummary
          });
        }
      } catch (error) {
        if (__DEV__) console.warn(`Could not load summary for ${dateStr}:`, error);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (dailySummaries.length === 0) {
      return {
        success: false,
        message: 'Geen dagelijkse samenvattingen gevonden voor deze maand. Genereer eerst dagelijkse verhalen.',
        period: 'month',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    }
    
    // Genereer gecombineerde maandelijkse samenvatting
    const monthSummary = await generateCombinedNarrative(dailySummaries, 'month', startDate, endDate);
    
    return {
      success: true,
      period: 'month',
      monthName: startDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }),
      startDate: startDate.toISOString().split('T')[0],
      endDate: Math.min(endDate.getTime(), today.getTime()) < endDate.getTime() ? 
        today.toISOString().split('T')[0] : endDate.toISOString().split('T')[0],
      daysIncluded: dailySummaries.length,
      narrative: monthSummary,
      dailySummaries: dailySummaries
    };
    
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    throw error;
  }
};

// Helper functie om dagelijkse verhalen te combineren tot week/maand samenvatting
const generateCombinedNarrative = async (dailySummaries, period, startDate, endDate) => {
  if (dailySummaries.length === 0) {
    return `Er zijn geen dagelijkse verhalen beschikbaar voor deze ${period === 'week' ? 'week' : 'maand'}.`;
  }
  
  const periodName = period === 'week' ? 
    `week van ${startDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })} tot ${endDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}` :
    startDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    
  // Basis samenvatting zonder AI
  let combinedNarrative = `**${period === 'week' ? 'Wekelijkse' : 'Maandelijkse'} Terugblik: ${periodName}**\n\n`;
  
  if (period === 'week') {
    combinedNarrative += `Deze week had ${dailySummaries.length} dagen met bijzondere momenten:\n\n`;
    
    dailySummaries.forEach(day => {
      combinedNarrative += `**${day.dayName} (${new Date(day.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })})**\n`;
      // Neem eerste paar zinnen van het dagelijkse verhaal
      const preview = day.narrative.split('.').slice(0, 2).join('.') + (day.narrative.split('.').length > 2 ? '...' : '');
      combinedNarrative += `${preview}\n\n`;
    });
    
  } else {
    // Maandelijkse samenvatting - groepeer per week
    const weekGroups = {};
    dailySummaries.forEach(day => {
      const dayDate = new Date(day.date);
      const weekStart = new Date(dayDate);
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = [];
      }
      weekGroups[weekKey].push(day);
    });
    
    combinedNarrative += `Deze maand had ${dailySummaries.length} dagen verspreid over ${Object.keys(weekGroups).length} weken met activiteiten:\n\n`;
    
    Object.keys(weekGroups).sort().forEach((weekKey, index) => {
      const weekDays = weekGroups[weekKey];
      const weekStartDate = new Date(weekKey);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      combinedNarrative += `**Week ${index + 1} (${weekStartDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} - ${weekEndDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })})**\n`;
      combinedNarrative += `${weekDays.length} actieve dagen met hoogtepunten en dagelijkse routine.\n\n`;
    });
  }
  
  // Probeer AI samenvatting te genereren indien beschikbaar
  try {
    const preferredModel = getPreferredAIModel();
    if (preferredModel && preferredModel.type !== AI_MODEL_TYPES.NONE) {
      const dailyTexts = dailySummaries.map(day => `${day.dayName || new Date(day.date).toLocaleDateString('nl-NL', { weekday: 'long' })}: ${day.narrative}`).join('\n\n');
      
      const aiPrompt = period === 'week' ? 
        `Schrijf een samenhangende wekelijkse terugblik op basis van deze dagelijkse verhalen. Zoek naar patronen, hoogtepunten en thema's die de hele week doortrekken. Maak het persoonlijk en reflectief:\n\n${dailyTexts}` :
        `Schrijf een uitgebreide maandelijkse reflectie op basis van deze dagelijkse verhalen. Identificeer trends, groei, uitdagingen en mijlpalen van de hele maand. Focus op de grote lijnen en persoonlijke ontwikkeling:\n\n${dailyTexts}`;
      
      const aiSummary = await generateNarrativeWithAI(aiPrompt, preferredModel);
      if (aiSummary && aiSummary.trim().length > 50) {
        return `**${period === 'week' ? 'Wekelijkse' : 'Maandelijkse'} Reflectie: ${periodName}**\n\n${aiSummary}`;
      }
    }
  } catch (aiError) {
    if (__DEV__) console.warn('AI summary generation failed, using basic summary:', aiError);
  }
  
  return combinedNarrative;
};

// Functie om een specifiek verhaal op te halen
export const getNarrativeSummary = async (date) => {
  try {
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    return await databaseService.getNarrativeSummary(date);
  } catch (error) {
    console.error('Error retrieving narrative summary:', error);
    throw error;
  }
};

// Functie om een verhaal handmatig te regenereren met optionele AI-model selectie
export const regenerateNarrativeSummary = async (date, useAiModel = null) => {
  try {
    // Wacht expliciet tot de database is geïnitialiseerd
    await databaseService.ensureInitialized();
    
    const activities = await getDailyActivities(date);
    const locations = await getDailyLocations(date);
    const calls = await getDailyCallLogs(date);
    const appUsage = await getDailyAppUsage(date);
    
    // Haal de gewenste narrative style op
    const narrativeStyle = await getNarrativeStyle();
    
    let narrativeSummary;
    
    // Als een specifiek AI-model is opgegeven, probeer dat te gebruiken
    if (useAiModel) {
      narrativeSummary = await generateNarrativeWithAI(activities, locations, calls, appUsage, date, useAiModel, narrativeStyle);
      
      // Als AI-generatie mislukt, val terug op de sjabloonmethode
      if (!narrativeSummary) {
        await errorHandler.info(`Falling back to template method after failed ${useAiModel} generation`);
        narrativeSummary = await generateNarrativeSummary(activities, locations, calls, appUsage, date);
      }
    } else {
      // Gebruik normale generatiemethode
      narrativeSummary = await generateNarrativeSummary(activities, locations, calls, appUsage, date);
    }
    
    await databaseService.saveNarrativeSummary(date, narrativeSummary);
    
    return narrativeSummary;
  } catch (error) {
    console.error('Error regenerating narrative summary:', error);
    throw error;
  }
};

// Helper functie om app usage data te verwerken voor narratieve verhalen
const processAppUsage = (appUsage) => {
  if (!appUsage || appUsage.totalScreenTime === 0) {
    return {
      totalScreenTime: 0,
      topApps: [],
      topCategory: null,
      categories: {},
      appCount: 0,
      screenTimeHours: 0,
      screenTimeMinutes: 0
    };
  }

  // Converteer milliseconds naar uren en minuten
  const totalMinutes = Math.floor(appUsage.totalScreenTime / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Vind de top categorie
  const sortedCategories = Object.entries(appUsage.categories)
    .sort(([,a], [,b]) => b.totalTime - a.totalTime);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  return {
    totalScreenTime: appUsage.totalScreenTime,
    topApps: appUsage.topApps || [],
    topCategory,
    categories: appUsage.categories || {},
    appCount: appUsage.appCount || 0,
    screenTimeHours: hours,
    screenTimeMinutes: minutes,
    totalMinutes
  };
};

// Helper functie om app usage narrative te genereren
const generateAppUsageNarrative = (processedAppUsage) => {
  if (!processedAppUsage || processedAppUsage.totalScreenTime === 0) {
    return null;
  }

  const { screenTimeHours, screenTimeMinutes, topApps, topCategory, totalMinutes } = processedAppUsage;
  const narrativeParts = [];

  // Basis schermtijd informatie
  if (screenTimeHours > 0) {
    if (screenTimeMinutes > 0) {
      narrativeParts.push(`Je schermtijd bedroeg ${screenTimeHours} uur en ${screenTimeMinutes} minuten`);
    } else {
      narrativeParts.push(`Je schermtijd bedroeg ${screenTimeHours} uur`);
    }
  } else {
    narrativeParts.push(`Je schermtijd bedroeg ${screenTimeMinutes} minuten`);
  }

  // Beoordeling van schermtijd
  if (totalMinutes > 360) { // Meer dan 6 uur
    narrativeParts.push('wat behoorlijk intensief was');
  } else if (totalMinutes > 240) { // Meer dan 4 uur
    narrativeParts.push('wat een gemiddelde dag was');
  } else if (totalMinutes > 120) { // Meer dan 2 uur
    narrativeParts.push('wat redelijk beperkt was');
  } else {
    narrativeParts.push('wat vrij minimaal was');
  }

  // Top apps informatie
  if (topApps && topApps.length > 0) {
    const topApp = topApps[0];
    const appTime = Math.floor((topApp.totalTime || topApp.duration || 0) / (1000 * 60));
    
    if (appTime > 0) {
      narrativeParts.push(`Je besteedde de meeste tijd aan ${topApp.appName || topApp.app_name} (${appTime} minuten)`);
      
      // Tweede app als die significant is
      if (topApps.length > 1) {
        const secondApp = topApps[1];
        const secondAppTime = Math.floor((secondApp.totalTime || secondApp.duration || 0) / (1000 * 60));
        if (secondAppTime > 10) { // Alleen vermelden als meer dan 10 minuten
          narrativeParts.push(`gevolgd door ${secondApp.appName || secondApp.app_name} (${secondAppTime} minuten)`);
        }
      }
    }
  }

  // Categorie informatie
  if (topCategory && topCategory[0] !== 'Onbekend') {
    const [categoryName, categoryData] = topCategory;
    const categoryTime = Math.floor(categoryData.totalTime / (1000 * 60));
    
    if (categoryTime > 30) { // Alleen vermelden als significant
      let categoryDescription = getCategoryDescription(categoryName);
      narrativeParts.push(`${categoryDescription} nam ${categoryTime} minuten van je tijd in beslag`);
    }
  }

  return narrativeParts.join('. ') + '.';
};

// Helper functie om categorie beschrijvingen te genereren
const getCategoryDescription = (category) => {
  const descriptions = {
    'Social': 'Sociale media',
    'Entertainment': 'Entertainment',
    'Productivity': 'Productiviteit apps',
    'Communication': 'Communicatie',
    'Browser': 'Websites browsen',
    'Music': 'Muziek luisteren',
    'Photography': 'Foto\'s maken en bewerken',
    'Games': 'Gaming',
    'Education': 'Educatieve apps',
    'Shopping': 'Online shopping',
    'Finance': 'Financiële apps',
    'Health': 'Health en fitness apps',
    'Travel': 'Reizen en navigatie',
    'Navigation': 'Navigatie',
    'Utilities': 'Handige tools',
    'System': 'Systeem apps'
  };
  
  return descriptions[category] || category;
};

// Nieuwe functie om health metrics (hartslag, calorieën, slaap) te verwerken
const generateHealthMetricsNarrative = (healthData) => {
  const narratives = [];
  
  // Calorieën
  if (healthData.calories && healthData.calories.length > 0) {
    const totalCalories = healthData.calories.reduce((sum, cal) => sum + (cal.value || 0), 0);
    if (totalCalories > 0) {
      if (totalCalories > 2500) {
        narratives.push(`Je hebt vandaag ${Math.round(totalCalories)} calorieën verbrand, wat bovengemiddeld actief is.`);
      } else if (totalCalories > 1800) {
        narratives.push(`Je hebt ${Math.round(totalCalories)} calorieën verbrand vandaag.`);
      } else if (totalCalories > 1000) {
        narratives.push(`Je hebt vandaag ${Math.round(totalCalories)} calorieën verbrand, wat relatief rustig was.`);
      }
    }
  }
  
  // Hartslag
  if (healthData.heartRate && healthData.heartRate.length > 0) {
    const avgHeartRate = Math.round(
      healthData.heartRate.reduce((sum, hr) => sum + (hr.value || 0), 0) / healthData.heartRate.length
    );
    if (avgHeartRate > 0) {
      if (avgHeartRate > 80) {
        narratives.push(`Je gemiddelde hartslag was ${avgHeartRate} bpm, wat wijst op een actieve dag.`);
      } else if (avgHeartRate > 60) {
        narratives.push(`Je hartslag was gemiddeld ${avgHeartRate} bpm vandaag.`);
      }
    }
  }
  
  // Slaap (van vorige nacht)
  if (healthData.sleep && healthData.sleep.length > 0) {
    const totalSleepMinutes = healthData.sleep.reduce((sum, sleep) => sum + (sleep.duration || 0), 0);
    const sleepHours = totalSleepMinutes / 60;
    if (sleepHours > 0) {
      if (sleepHours >= 8) {
        narratives.push(`Je hebt goed geslapen met ${formatHours(sleepHours)} rust.`);
      } else if (sleepHours >= 6) {
        narratives.push(`Je hebt ${formatHours(sleepHours)} geslapen.`);
      } else if (sleepHours >= 4) {
        narratives.push(`Je hebt maar ${formatHours(sleepHours)} kunnen slapen, wat aan de korte kant is.`);
      }
    }
  }
  
  return narratives.length > 0 ? narratives.join(' ') : null;
};

// Nieuwe functie om workout data te verwerken
const generateWorkoutNarrative = (workouts) => {
  if (!workouts || workouts.length === 0) return null;
  
  const narratives = [];
  
  if (workouts.length === 1) {
    const workout = workouts[0];
    const durationMinutes = workout.duration || 0;
    const sportType = workout.sport_type || 'oefening';
    const calories = workout.calories || 0;
    const distance = workout.distance || 0;
    
    let workoutDescription = `Je hebt een ${sportType}-sessie gedaan`;
    
    if (durationMinutes > 0) {
      workoutDescription += ` van ${durationMinutes} minuten`;
    }
    
    if (distance > 0) {
      workoutDescription += ` waarin je ${distance.toFixed(1)} km aflegde`;
    }
    
    if (calories > 0) {
      workoutDescription += ` en ${Math.round(calories)} calorieën verbrandde`;
    }
    
    workoutDescription += '.';
    
    // Voeg motivationele comment toe
    if (durationMinutes > 60) {
      workoutDescription += ' Dat was een uitgebreide trainingssessie!';
    } else if (durationMinutes > 30) {
      workoutDescription += ' Een goede workout voor je gezondheid.';
    }
    
    narratives.push(workoutDescription);
    
  } else {
    // Meerdere workouts
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const sportsTypes = [...new Set(workouts.map(w => w.sport_type).filter(Boolean))];
    
    narratives.push(`Je hebt vandaag ${workouts.length} verschillende trainingssessies gedaan`);
    
    if (sportsTypes.length <= 3) {
      narratives.push(`waaronder ${sportsTypes.join(', ')}`);
    }
    
    if (totalDuration > 0) {
      narratives.push(`met een totale trainingstijd van ${totalDuration} minuten`);
    }
    
    if (totalCalories > 0) {
      narratives.push(`en ${Math.round(totalCalories)} calorieën verbrand`);
    }
    
    narratives.push('. Een zeer actieve trainingsdag!');
  }
  
  return narratives.join(' ');
};

// Update de bestaande generateActivityNarrative om ook health data te gebruiken
const generateEnhancedActivityNarrative = (activityGroups) => {
  const narratives = [];
  
  // Stappen data
  if (activityGroups.totalSteps > 0) {
    if (activityGroups.totalSteps > 15000) {
      narratives.push(`Met ${activityGroups.totalSteps.toLocaleString()} stappen was het een bijzonder actieve dag!`);
    } else if (activityGroups.totalSteps > 10000) {
      narratives.push(`Je hebt je stappendoel behaald met ${activityGroups.totalSteps.toLocaleString()} stappen.`);
    } else if (activityGroups.totalSteps > 5000) {
      narratives.push(`Je hebt ${activityGroups.totalSteps.toLocaleString()} stappen gezet vandaag.`);
    } else if (activityGroups.totalSteps > 1000) {
      narratives.push(`Het was een rustige dag met ${activityGroups.totalSteps.toLocaleString()} stappen.`);
    } else {
      narratives.push(`Je hebt vandaag weinig stappen gezet, wat wijst op een rustige dag.`);
    }
  }
  
  // Legacy activity types (voor backwards compatibility)
  if (activityGroups.walking.length > 0) {
    const totalWalkingMinutes = activityGroups.walking.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    
    if (totalWalkingMinutes > 60) {
      narratives.push(`Je hebt behoorlijk wat gewandeld vandaag, in totaal zo'n ${formatDuration(totalWalkingMinutes)}.`);
    } else if (totalWalkingMinutes > 30) {
      narratives.push(`Je hebt een fijne wandeling gemaakt van ongeveer ${formatDuration(totalWalkingMinutes)}.`);
    }
  }
  
  if (activityGroups.running.length > 0) {
    const totalRunningMinutes = activityGroups.running.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    narratives.push(`Je hebt vandaag ${formatDuration(totalRunningMinutes)} hardgelopen. Goed bezig!`);
  }
  
  if (activityGroups.cycling.length > 0) {
    const totalCyclingMinutes = activityGroups.cycling.reduce((total, act) =>
      total + (act.durationMinutes || 0), 0);
    narratives.push(`Je bent ${formatDuration(totalCyclingMinutes)} op de fiets geweest.`);
  }
  
  // Actieve minuten samenvatting
  if (activityGroups.activeMinutes > 90) {
    narratives.push(`Met ${activityGroups.activeMinutes} actieve minuten was het een zeer sportieve dag.`);
  } else if (activityGroups.activeMinutes > 60) {
    narratives.push(`Je hebt ${activityGroups.activeMinutes} minuten actief bewogen, wat uitstekend is voor je gezondheid.`);
  } else if (activityGroups.activeMinutes > 30) {
    narratives.push(`Je hebt ${activityGroups.activeMinutes} minuten actief bewogen vandaag.`);
  }
  
  if (narratives.length === 0) {
    narratives.push('Je lijkt vandaag een rustige dag te hebben gehad qua activiteiten.');
  }
  
  return narratives.join(' ');
};
// src/services/eventCorrelationEngine.js
// Advanced event correlation for meaningful narrative generation

// import dataFusionService from './dataFusionService'; // TEMPORARILY DISABLED - circular dependency
import locationService from './locationService';
import databaseService from './database';
import errorHandler from './errorLogger';

class EventCorrelationEngine {
  constructor() {
    this.correlationRules = new Map();
    this.eventPatterns = new Map();
    this.narrativeTemplates = new Map();
    this.timeWindows = {
      immediate: 5 * 60 * 1000,      // 5 minutes
      short: 30 * 60 * 1000,         // 30 minutes  
      medium: 2 * 60 * 60 * 1000,    // 2 hours
      long: 4 * 60 * 60 * 1000       // 4 hours
    };
    
    this.initializeCorrelationRules();
    this.initializeNarrativeTemplates();
  }

  initializeCorrelationRules() {
    // Workout correlation rules
    this.correlationRules.set('workout_location', {
      events: ['workout_start', 'location_change'],
      timeWindow: this.timeWindows.immediate,
      confidence: 0.9,
      narrative: 'workout_at_location'
    });

    this.correlationRules.set('pre_workout_preparation', {
      events: ['app_usage_fitness', 'location_gym', 'workout_start'],
      timeWindow: this.timeWindows.short,
      confidence: 0.8,
      narrative: 'planned_workout'
    });

    // Sleep correlation rules
    this.correlationRules.set('bedtime_routine', {
      events: ['app_usage_decrease', 'location_home', 'sleep_start'],
      timeWindow: this.timeWindows.medium,
      confidence: 0.85,
      narrative: 'bedtime_preparation'
    });

    this.correlationRules.set('sleep_quality_factors', {
      events: ['screen_time_evening', 'step_count_high', 'sleep_quality'],
      timeWindow: this.timeWindows.long,
      confidence: 0.75,
      narrative: 'sleep_factors_analysis'
    });

    // Work-life balance rules
    this.correlationRules.set('work_break_activity', {
      events: ['location_work', 'step_increase', 'call_personal'],
      timeWindow: this.timeWindows.short,
      confidence: 0.7,
      narrative: 'work_break_taken'
    });

    this.correlationRules.set('commute_pattern', {
      events: ['location_home', 'step_increase', 'location_work'],
      timeWindow: this.timeWindows.medium,
      confidence: 0.9,
      narrative: 'daily_commute'
    });

    // Health behavior rules
    this.correlationRules.set('active_recovery', {
      events: ['workout_intense', 'step_low_next_day', 'sleep_increase'],
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      confidence: 0.8,
      narrative: 'recovery_day'
    });

    this.correlationRules.set('social_activity_boost', {
      events: ['call_increase', 'location_social', 'mood_positive_indicators'],
      timeWindow: this.timeWindows.medium,
      confidence: 0.75,
      narrative: 'social_wellness'
    });
  }

  initializeNarrativeTemplates() {
    this.narrativeTemplates.set('workout_at_location', {
      templates: [
        'Je {workout_type} training van {duration} minuten bij {location_name} was een goede keuze.',
        'Bij {location_name} deed je een {workout_intensity} {workout_type} sessie van {duration} minuten.',
        'Je {workout_type} bij {location_name} duurde {duration} minuten en verbrandde {calories} calorieën.'
      ],
      requiredData: ['workout_type', 'duration', 'location_name'],
      optionalData: ['calories', 'workout_intensity']
    });

    this.narrativeTemplates.set('planned_workout', {
      templates: [
        'Je bereidde je training goed voor door {prep_time} minuten eerder fitness apps te checken voordat je naar {location_name} ging.',
        'De {fitness_app} app hielp je voorbereiden op je {workout_type} training bij {location_name}.',
        'Je planmatige aanpak naar je workout bij {location_name} toont je toewijding aan fitness.'
      ],
      requiredData: ['location_name', 'workout_type'],
      optionalData: ['prep_time', 'fitness_app']
    });

    this.narrativeTemplates.set('bedtime_preparation', {
      templates: [
        'Je schermtijd nam af vanaf {wind_down_time} voordat je om {sleep_time} ging slapen.',
        'Een rustige avond thuis bereidde je voor op {sleep_duration} uur slaap.',
        'Je bedtijdroutine begon om {wind_down_time} met minder schermgebruik, wat leidde tot goede slaap van {sleep_duration} uur.'
      ],
      requiredData: ['sleep_time'],
      optionalData: ['wind_down_time', 'sleep_duration', 'screen_reduction']
    });

    this.narrativeTemplates.set('work_break_taken', {
      templates: [
        'Tijdens je werkdag nam je een gezonde pauze met {step_count} extra stappen.',
        'Je {break_duration} minuten pauze op het werk omvatte een wandeling van {step_count} stappen.',
        'Een actieve pauze van {step_count} stappen hielp je werkdag te onderbreken.'
      ],
      requiredData: ['step_count'],
      optionalData: ['break_duration', 'break_type']
    });

    this.narrativeTemplates.set('daily_commute', {
      templates: [
        'Je dagelijkse reis van huis naar werk omvatte {commute_steps} stappen in {commute_duration} minuten.',
        'Een actieve reis naar het werk: {commute_steps} stappen in {commute_duration} minuten.',
        'Je {commute_type} naar werk duurde {commute_duration} minuten met {commute_steps} stappen.'
      ],
      requiredData: ['commute_steps', 'commute_duration'],
      optionalData: ['commute_type']
    });

    this.narrativeTemplates.set('recovery_day', {
      templates: [
        'Na gisteren\'s intensieve training gunde je je lichaam rust met {recovery_steps} stappen en {sleep_hours} uur slaap.',
        'Een verdiende rustdag: slechts {recovery_steps} stappen maar wel {sleep_hours} uur herstellende slaap.',
        'Je lichaam herstelde goed met {sleep_hours} uur slaap na gisteren\'s {previous_workout} training.'
      ],
      requiredData: ['recovery_steps', 'sleep_hours'],
      optionalData: ['previous_workout', 'recovery_quality']
    });

    this.narrativeTemplates.set('social_wellness', {
      templates: [
        'Een sociale dag: {call_count} gesprekken en tijd bij {social_location} boosten je welzijn.',
        'Sociale verbinding via {call_count} telefoongesprekken en bezoek aan {social_location}.',
        'Je sociale batterij werd opgeladen door {call_count} gesprekken en tijd bij {social_location}.'
      ],
      requiredData: ['call_count'],
      optionalData: ['social_location', 'call_duration']
    });
  }

  async analyzeEventCorrelations(date, events) {
    const correlatedEvents = [];
    const narratives = [];

    try {
      // Group events by time windows
      const timeGroupedEvents = this.groupEventsByTime(events);
      
      // Apply correlation rules to each time group
      for (const [timeWindow, groupedEvents] of timeGroupedEvents) {
        const correlations = await this.findCorrelationsInTimeWindow(groupedEvents, timeWindow);
        correlatedEvents.push(...correlations);
      }

      // Generate narratives from correlations
      for (const correlation of correlatedEvents) {
        const narrative = await this.generateNarrativeFromCorrelation(correlation);
        if (narrative) {
          narratives.push(narrative);
        }
      }

      // Rank narratives by confidence and relevance
      const rankedNarratives = this.rankNarratives(narratives);

      return {
        date,
        totalEvents: events.length,
        correlatedEvents: correlatedEvents.length,
        narratives: rankedNarratives,
        confidence: this.calculateOverallConfidence(correlatedEvents),
        processingTime: Date.now()
      };

    } catch (error) {
      errorHandler.error('Event correlation analysis failed', error, 'EventCorrelationEngine');
      return {
        date,
        totalEvents: events.length,
        correlatedEvents: 0,
        narratives: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  groupEventsByTime(events) {
    const timeGroups = new Map();
    
    events.forEach(event => {
      const timeSlot = Math.floor(event.timestamp / this.timeWindows.short) * this.timeWindows.short;
      
      if (!timeGroups.has(timeSlot)) {
        timeGroups.set(timeSlot, []);
      }
      timeGroups.get(timeSlot).push(event);
    });

    return timeGroups;
  }

  async findCorrelationsInTimeWindow(events, timeWindow) {
    const correlations = [];

    for (const [ruleId, rule] of this.correlationRules) {
      const matchingEvents = this.findMatchingEvents(events, rule.events);
      
      if (matchingEvents.length >= rule.events.length) {
        const correlation = {
          ruleId,
          rule,
          events: matchingEvents,
          timeWindow,
          confidence: await this.calculateCorrelationConfidence(matchingEvents, rule),
          strength: this.calculateCorrelationStrength(matchingEvents),
          narrative: rule.narrative
        };
        
        correlations.push(correlation);
      }
    }

    return correlations;
  }

  findMatchingEvents(events, requiredEventTypes) {
    const matchingEvents = [];

    requiredEventTypes.forEach(eventType => {
      const matchingEvent = events.find(event => 
        this.eventMatchesType(event, eventType)
      );
      
      if (matchingEvent) {
        matchingEvents.push(matchingEvent);
      }
    });

    return matchingEvents;
  }

  eventMatchesType(event, eventType) {
    const typeMatchers = {
      'workout_start': event => event.type === 'workout' || event.type === 'exercise',
      'location_change': event => event.type === 'location' && event.isSignificantChange,
      'location_gym': event => event.type === 'location' && this.isGymLocation(event),
      'location_home': event => event.type === 'location' && this.isHomeLocation(event),
      'location_work': event => event.type === 'location' && this.isWorkLocation(event),
      'location_social': event => event.type === 'location' && this.isSocialLocation(event),
      'app_usage_fitness': event => event.type === 'app_usage' && this.isFitnessApp(event),
      'app_usage_decrease': event => event.type === 'app_usage' && event.trend === 'decreasing',
      'sleep_start': event => event.type === 'sleep' && event.phase === 'start',
      'sleep_quality': event => event.type === 'sleep' && event.quality,
      'step_increase': event => event.type === 'steps' && event.trend === 'increasing',
      'step_low_next_day': event => event.type === 'steps' && event.isLowForUser,
      'call_increase': event => event.type === 'calls' && event.trend === 'increasing',
      'call_personal': event => event.type === 'calls' && event.callType === 'personal',
      'workout_intense': event => event.type === 'workout' && event.intensity === 'high',
      'screen_time_evening': event => event.type === 'app_usage' && this.isEveningTime(event.timestamp),
      'step_count_high': event => event.type === 'steps' && event.isHighForUser,
      'sleep_increase': event => event.type === 'sleep' && event.durationIncrease,
      'mood_positive_indicators': event => this.hasMoodPositiveIndicators(event)
    };

    const matcher = typeMatchers[eventType];
    return matcher ? matcher(event) : false;
  }

  async calculateCorrelationConfidence(events, rule) {
    let confidence = rule.confidence;

    // Boost confidence based on event quality
    events.forEach(event => {
      if (event.confidence && event.confidence > 0.8) {
        confidence += 0.05;
      } else if (event.confidence && event.confidence < 0.6) {
        confidence -= 0.1;
      }
    });

    // Boost confidence based on temporal proximity
    const timeSpread = this.calculateTimeSpread(events);
    if (timeSpread < rule.timeWindow * 0.5) {
      confidence += 0.1;
    }

    // Boost confidence based on historical patterns
    const historicalSupport = await this.getHistoricalPatternSupport(rule.ruleId);
    confidence += historicalSupport * 0.15;

    return Math.min(0.99, Math.max(0.1, confidence));
  }

  calculateCorrelationStrength(events) {
    // Calculate strength based on number of events and their individual strengths
    const avgEventStrength = events.reduce((sum, event) => sum + (event.strength || 0.5), 0) / events.length;
    const eventCountFactor = Math.min(1, events.length / 3); // Normalize to max 3 events
    
    return avgEventStrength * eventCountFactor;
  }

  async generateNarrativeFromCorrelation(correlation) {
    const template = this.narrativeTemplates.get(correlation.narrative);
    if (!template) return null;

    try {
      // Extract data from correlated events
      const narrativeData = this.extractNarrativeData(correlation.events);
      
      // Check if we have required data
      const hasRequiredData = template.requiredData.every(field => narrativeData[field]);
      if (!hasRequiredData) {
        if (__DEV__) console.log(`Missing required data for narrative ${correlation.narrative}:`, 
          template.requiredData.filter(field => !narrativeData[field]));
        return null;
      }

      // Select best template based on available data
      const selectedTemplate = this.selectBestTemplate(template, narrativeData);
      
      // Fill template with data
      const narrative = this.fillNarrativeTemplate(selectedTemplate, narrativeData);

      return {
        id: this.generateNarrativeId(correlation),
        type: correlation.narrative,
        text: narrative,
        confidence: correlation.confidence,
        strength: correlation.strength,
        events: correlation.events.map(e => e.id),
        timestamp: Date.now(),
        metadata: {
          ruleId: correlation.ruleId,
          templateUsed: selectedTemplate,
          dataUsed: Object.keys(narrativeData)
        }
      };

    } catch (error) {
      errorHandler.error(`Failed to generate narrative for ${correlation.narrative}`, error, 'EventCorrelationEngine');
      return null;
    }
  }

  extractNarrativeData(events) {
    const data = {};

    events.forEach(event => {
      switch (event.type) {
        case 'workout':
        case 'exercise':
          data.workout_type = this.getWorkoutTypeDisplay(event.workoutType);
          data.duration = Math.round(event.duration / (1000 * 60)); // minutes
          data.calories = event.calories;
          data.workout_intensity = this.getIntensityDisplay(event.intensity);
          break;
          
        case 'location':
          if (this.isGymLocation(event)) data.location_name = event.name || 'de sportschool';
          else if (this.isHomeLocation(event)) data.location_name = 'thuis';
          else if (this.isWorkLocation(event)) data.location_name = 'werk';
          else if (this.isSocialLocation(event)) data.social_location = event.name || 'een sociale locatie';
          else data.location_name = event.name || 'je bestemming';
          break;
          
        case 'sleep':
          data.sleep_time = this.formatTime(event.startTime);
          data.sleep_duration = Math.round(event.duration / (1000 * 60 * 60) * 10) / 10; // hours
          data.sleep_hours = data.sleep_duration;
          break;
          
        case 'steps':
          data.step_count = event.count || event.value;
          data.commute_steps = event.count || event.value;
          data.recovery_steps = event.count || event.value;
          break;
          
        case 'calls':
          data.call_count = event.count;
          data.call_duration = Math.round(event.totalDuration / (1000 * 60)); // minutes
          break;
          
        case 'app_usage':
          if (this.isFitnessApp(event)) {
            data.fitness_app = event.appName;
            data.prep_time = Math.round(event.duration / (1000 * 60));
          }
          break;
      }
    });

    // Calculate derived data
    if (data.sleep_time && events.some(e => e.type === 'app_usage' && e.trend === 'decreasing')) {
      const sleepTime = new Date(data.sleep_time);
      const windDownTime = new Date(sleepTime.getTime() - 60 * 60 * 1000); // 1 hour before
      data.wind_down_time = this.formatTime(windDownTime);
    }

    return data;
  }

  selectBestTemplate(template, narrativeData) {
    // Score templates based on available data
    const templateScores = template.templates.map(tmpl => {
      const placeholders = this.extractPlaceholders(tmpl);
      const availableDataScore = placeholders.filter(ph => narrativeData[ph]).length;
      const totalPlaceholders = placeholders.length;
      
      return {
        template: tmpl,
        score: totalPlaceholders > 0 ? availableDataScore / totalPlaceholders : 0
      };
    });

    // Select template with highest score
    templateScores.sort((a, b) => b.score - a.score);
    return templateScores[0]?.template || template.templates[0];
  }

  extractPlaceholders(template) {
    const matches = template.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  }

  fillNarrativeTemplate(template, data) {
    let filledTemplate = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      filledTemplate = filledTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    // Remove any unfilled placeholders
    filledTemplate = filledTemplate.replace(/\{[^}]+\}/g, '[data niet beschikbaar]');
    
    return filledTemplate;
  }

  rankNarratives(narratives) {
    return narratives
      .sort((a, b) => {
        // Primary sort: confidence
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        // Secondary sort: strength
        return b.strength - a.strength;
      })
      .slice(0, 10); // Limit to top 10 narratives
  }

  calculateOverallConfidence(correlatedEvents) {
    if (correlatedEvents.length === 0) return 0;
    
    const avgConfidence = correlatedEvents.reduce((sum, event) => sum + event.confidence, 0) / correlatedEvents.length;
    const eventCountFactor = Math.min(1, correlatedEvents.length / 5); // Normalize to max 5 events
    
    return avgConfidence * eventCountFactor;
  }

  generateNarrativeId(correlation) {
    return `narrative_${correlation.ruleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods
  calculateTimeSpread(events) {
    if (events.length < 2) return 0;
    
    const timestamps = events.map(e => e.timestamp).sort();
    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  async getHistoricalPatternSupport(ruleId) {
    // This would query historical data to see how often this rule has been successful
    // For now, return a baseline support value
    return 0.5;
  }

  isGymLocation(event) {
    if (!event.name) return false;
    const gymKeywords = ['gym', 'fitness', 'sportschool', 'sport', 'basic-fit', 'anytime'];
    return gymKeywords.some(keyword => event.name.toLowerCase().includes(keyword));
  }

  isHomeLocation(event) {
    return event.type === 'home' || (event.name && event.name.toLowerCase().includes('thuis'));
  }

  isWorkLocation(event) {
    return event.type === 'work' || (event.name && ['werk', 'kantoor', 'office'].some(keyword => 
      event.name.toLowerCase().includes(keyword)));
  }

  isSocialLocation(event) {
    if (!event.name) return false;
    const socialKeywords = ['restaurant', 'café', 'bar', 'cinema', 'theater', 'park', 'friend'];
    return socialKeywords.some(keyword => event.name.toLowerCase().includes(keyword));
  }

  isFitnessApp(event) {
    if (!event.appName) return false;
    const fitnessApps = ['strava', 'nike', 'adidas', 'myfitnesspal', 'fitbit', 'garmin', 'samsung health'];
    return fitnessApps.some(app => event.appName.toLowerCase().includes(app));
  }

  isEveningTime(timestamp) {
    const hour = new Date(timestamp).getHours();
    return hour >= 18 && hour <= 23;
  }

  hasMoodPositiveIndicators(event) {
    // This would analyze various indicators for positive mood
    // For now, simplified implementation
    return event.type === 'calls' && event.duration > 10 * 60 * 1000; // Long calls indicate social connection
  }

  getWorkoutTypeDisplay(type) {
    const typeMap = {
      'running': 'hardloop',
      'walking': 'wandel',
      'cycling': 'fiets',
      'swimming': 'zwem',
      'strength': 'kracht',
      'yoga': 'yoga',
      'cardio': 'cardio'
    };
    return typeMap[type] || type || 'fitness';
  }

  getIntensityDisplay(intensity) {
    const intensityMap = {
      'low': 'lichte',
      'medium': 'gematigde', 
      'high': 'intensieve'
    };
    return intensityMap[intensity] || 'gematigde';
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}

export default new EventCorrelationEngine();
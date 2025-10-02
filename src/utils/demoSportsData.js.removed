// src/utils/demoSportsData.js
// Comprehensive demo data generator for sports and workout activities

const DEMO_SPORTS = [
  'running',
  'cycling',
  'swimming',
  'gym',
  'yoga',
  'tennis',
  'football',
  'basketball',
  'walking',
  'hiking',
  'rowing',
  'crossfit',
  'skiing',
  'snowboarding',
  'surfing',
  'golf'
];

const SPORT_DETAILS = {
  running: {
    baseCalories: 450,
    baseDistance: 8,
    baseDuration: 45,
    description: 'Morning run through the park'
  },
  cycling: {
    baseCalories: 600,
    baseDistance: 25,
    baseDuration: 60,
    description: 'Cycling tour through the city'
  },
  swimming: {
    baseCalories: 350,
    baseDistance: 1.5,
    baseDuration: 30,
    description: 'Laps at the swimming pool'
  },
  gym: {
    baseCalories: 300,
    baseDistance: 0,
    baseDuration: 45,
    description: 'Strength training session'
  },
  yoga: {
    baseCalories: 150,
    baseDistance: 0,
    baseDuration: 60,
    description: 'Relaxing yoga session'
  },
  tennis: {
    baseCalories: 400,
    baseDistance: 3,
    baseDuration: 90,
    description: 'Tennis match with friends'
  },
  football: {
    baseCalories: 500,
    baseDistance: 5,
    baseDuration: 90,
    description: 'Football game with teammates'
  },
  basketball: {
    baseCalories: 450,
    baseDistance: 4,
    baseDuration: 60,
    description: 'Basketball pickup game'
  },
  walking: {
    baseCalories: 200,
    baseDistance: 5,
    baseDuration: 60,
    description: 'Evening walk in the neighborhood'
  },
  hiking: {
    baseCalories: 400,
    baseDistance: 8,
    baseDuration: 120,
    description: 'Mountain hiking adventure'
  },
  rowing: {
    baseCalories: 350,
    baseDistance: 3,
    baseDuration: 45,
    description: 'Rowing machine workout'
  },
  crossfit: {
    baseCalories: 500,
    baseDistance: 0,
    baseDuration: 60,
    description: 'High-intensity CrossFit workout'
  },
  skiing: {
    baseCalories: 400,
    baseDistance: 15,
    baseDuration: 240,
    description: 'Skiing on the slopes'
  },
  snowboarding: {
    baseCalories: 350,
    baseDistance: 12,
    baseDuration: 240,
    description: 'Snowboarding session'
  },
  surfing: {
    baseCalories: 250,
    baseDistance: 2,
    baseDuration: 120,
    description: 'Surfing at the beach'
  },
  golf: {
    baseCalories: 300,
    baseDistance: 8,
    baseDuration: 240,
    description: 'Golf round with friends'
  }
};

/**
 * Generate realistic demo sports data
 * @param {number} daysBack - Number of days to generate data for
 * @param {number} activitiesPerDay - Average activities per day
 * @returns {Array} - Array of sport activities
 */
export const generateDemoSportsData = (daysBack = 30, activitiesPerDay = 0.6) => {
  const activities = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < daysBack; i++) {
    const dayTimestamp = now - (i * oneDay);
    const dayOfWeek = new Date(dayTimestamp).getDay();
    
    // Higher probability on weekends and lower on weekdays
    const activityProbability = (dayOfWeek === 0 || dayOfWeek === 6) ? 
      activitiesPerDay * 1.5 : activitiesPerDay * 0.8;
    
    const dailyActivities = Math.floor(activityProbability + Math.random() * 0.5);
    
    for (let j = 0; j < dailyActivities; j++) {
      const sportType = DEMO_SPORTS[Math.floor(Math.random() * DEMO_SPORTS.length)];
      const sportDetail = SPORT_DETAILS[sportType];
      
      // Generate activity time (morning, afternoon, or evening)
      const hour = 6 + Math.floor(Math.random() * 18); // 6 AM to midnight
      const minute = Math.floor(Math.random() * 60);
      const activityTime = new Date(dayTimestamp);
      activityTime.setHours(hour, minute, 0, 0);
      
      // Add variation to base values
      const durationVariation = Math.random() * 0.4 - 0.2; // -20% to +20%
      const caloriesVariation = Math.random() * 0.3 - 0.15; // -15% to +15%
      const distanceVariation = Math.random() * 0.5 - 0.25; // -25% to +25%
      
      const duration = Math.floor(sportDetail.baseDuration * (1 + durationVariation));
      const calories = Math.floor(sportDetail.baseCalories * (1 + caloriesVariation));
      const distance = parseFloat((sportDetail.baseDistance * (1 + distanceVariation)).toFixed(1));
      
      // Add heart rate data for more realistic data
      const heartRateBase = sportType === 'yoga' ? 100 : 140;
      const heartRateAvg = heartRateBase + Math.floor(Math.random() * 30);
      const heartRateMax = heartRateAvg + 20 + Math.floor(Math.random() * 20);
      
      // Add elevation for outdoor activities
      let elevationGain = 0;
      if (['running', 'cycling', 'hiking', 'skiing', 'snowboarding'].includes(sportType)) {
        elevationGain = Math.floor(Math.random() * 200); // 0-200m elevation
      }
      
      // Determine source (realistic distribution)
      const sourceRoll = Math.random();
      let source;
      if (sourceRoll < 0.4) {
        source = 'apple_health';
      } else if (sourceRoll < 0.7) {
        source = 'samsung_health';
      } else if (sourceRoll < 0.85) {
        source = 'strava';
      } else {
        source = 'manual';
      }
      
      activities.push({
        type: source === 'strava' ? 'strava_workout' : 'workout',
        startTime: activityTime.getTime(),
        endTime: activityTime.getTime() + (duration * 60 * 1000),
        duration: duration,
        details: sportDetail.description,
        source: source,
        calories: calories,
        distance: distance,
        sport_type: sportType,
        heart_rate_avg: heartRateAvg,
        heart_rate_max: heartRateMax,
        elevation_gain: elevationGain,
        metadata: JSON.stringify({
          intensity: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
          weather: ['sunny', 'cloudy', 'rainy', 'windy'][Math.floor(Math.random() * 4)],
          equipment: sportType === 'cycling' ? 'road bike' : 
                    sportType === 'running' ? 'running shoes' : null,
          notes: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} workout completed`
        })
      });
    }
  }
  
  return activities.sort((a, b) => b.startTime - a.startTime);
};

/**
 * Generate Strava-specific demo data with more detailed metrics
 * @param {number} daysBack - Number of days to generate data for
 * @returns {Array} - Array of Strava-like activities
 */
export const generateDemoStravaData = (daysBack = 30) => {
  const activities = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Strava activity types
  const stravaTypes = ['Run', 'Ride', 'Walk', 'Swim', 'WeightTraining', 'Yoga', 'Tennis', 'Hike'];
  
  for (let i = 0; i < daysBack; i++) {
    const dayTimestamp = now - (i * oneDay);
    const dayOfWeek = new Date(dayTimestamp).getDay();
    
    // Strava users are more active
    const activityProbability = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 0.6;
    
    if (Math.random() < activityProbability) {
      const stravaType = stravaTypes[Math.floor(Math.random() * stravaTypes.length)];
      const sportType = stravaType.toLowerCase().replace('rid', 'cycling').replace('walk', 'walking').replace('swim', 'swimming');
      
      const hour = 7 + Math.floor(Math.random() * 12); // 7 AM to 7 PM
      const minute = Math.floor(Math.random() * 60);
      const activityTime = new Date(dayTimestamp);
      activityTime.setHours(hour, minute, 0, 0);
      
      let baseCalories, baseDistance, baseDuration;
      
      switch (stravaType) {
        case 'Run':
          baseDuration = 45;
          baseDistance = 8;
          baseCalories = 450;
          break;
        case 'Ride':
          baseDuration = 90;
          baseDistance = 30;
          baseCalories = 650;
          break;
        case 'Swim':
          baseDuration = 30;
          baseDistance = 1.5;
          baseCalories = 350;
          break;
        case 'Hike':
          baseDuration = 120;
          baseDistance = 10;
          baseCalories = 500;
          break;
        default:
          baseDuration = 60;
          baseDistance = 5;
          baseCalories = 400;
      }
      
      // Add realistic variations
      const duration = Math.floor(baseDuration * (0.8 + Math.random() * 0.4));
      const distance = parseFloat((baseDistance * (0.9 + Math.random() * 0.2)).toFixed(1));
      const calories = Math.floor(baseCalories * (0.9 + Math.random() * 0.2));
      
      // Generate detailed Strava metrics
      const averageSpeed = distance / (duration / 60);
      const maxSpeed = averageSpeed * (1.2 + Math.random() * 0.3);
      const elevationGain = Math.floor(Math.random() * (stravaType === 'Run' || stravaType === 'Ride' ? 300 : 50));
      
      const heartRateAvg = 140 + Math.floor(Math.random() * 40);
      const heartRateMax = heartRateAvg + 30 + Math.floor(Math.random() * 20);
      
      activities.push({
        type: 'strava_workout',
        startTime: activityTime.getTime(),
        endTime: activityTime.getTime() + (duration * 60 * 1000),
        duration: duration,
        details: `${stravaType} activity via Strava`,
        source: 'strava',
        calories: calories,
        distance: distance,
        sport_type: sportType,
        strava_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        heart_rate_avg: heartRateAvg,
        heart_rate_max: heartRateMax,
        elevation_gain: elevationGain,
        metadata: JSON.stringify({
          strava_activity_type: stravaType,
          average_speed: averageSpeed,
          max_speed: maxSpeed,
          gear: stravaType === 'Ride' ? 'Road Bike' : null,
          description: `Demo ${stravaType.toLowerCase()} session`,
          segment_efforts: Math.floor(Math.random() * 5)
        })
      });
    }
  }
  
  return activities.sort((a, b) => b.startTime - a.startTime);
};

/**
 * Generate demo steps data to complement sports activities
 * @param {number} daysBack - Number of days to generate data for
 * @returns {Array} - Array of step activities
 */
export const generateDemoStepsData = (daysBack = 30) => {
  const activities = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < daysBack; i++) {
    const dayTimestamp = now - (i * oneDay);
    const dayOfWeek = new Date(dayTimestamp).getDay();
    
    // Base steps calculation
    const baseSteps = dayOfWeek === 0 || dayOfWeek === 6 ? 8000 : 10000; // Less on weekends
    const variation = Math.random() * 5000 - 2500; // -2500 to +2500
    const hourlyVariation = Math.floor(Math.random() * 3000); // Time-based
    
    const dailySteps = Math.max(2000, Math.floor(baseSteps + variation + hourlyVariation));
    
    activities.push({
      type: 'steps',
      startTime: dayTimestamp,
      endTime: dayTimestamp + oneDay,
      duration: 24 * 60, // 24 hours in minutes
      details: `Daily steps for ${new Date(dayTimestamp).toLocaleDateString()}`,
      source: 'demo_health',
      calories: Math.floor(dailySteps * 0.04), // Approximate calorie calculation
      distance: parseFloat((dailySteps * 0.0008).toFixed(2)), // 0.8m per step
      metadata: JSON.stringify({
        hourly_breakdown: Array.from({length: 24}, (_, i) => ({
          hour: i,
          steps: Math.floor(dailySteps * (0.5 + Math.random()) / 24)
        })),
        goal: 10000,
        percentage: Math.min(100, Math.floor((dailySteps / 10000) * 100))
      })
    });
  }
  
  return activities.sort((a, b) => b.startTime - a.startTime);
};

/**
 * Get summary statistics for demo data
 * @param {Array} activities - Array of activities
 * @returns {Object} - Summary statistics
 */
export const getDemoDataSummary = (activities) => {
  const sportsActivities = activities.filter(a => a.type.includes('workout') || a.sport_type);
  const stepsActivities = activities.filter(a => a.type === 'steps');
  
  const summary = {
    totalActivities: activities.length,
    sportsActivities: sportsActivities.length,
    stepsActivities: stepsActivities.length,
    totalDuration: sportsActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
    totalCalories: activities.reduce((sum, a) => sum + (a.calories || 0), 0),
    totalDistance: activities.reduce((sum, a) => sum + (a.distance || 0), 0),
    sportTypes: [...new Set(sportsActivities.map(a => a.sport_type).filter(Boolean))],
    dateRange: {
      start: activities.length > 0 ? Math.min(...activities.map(a => a.startTime)) : null,
      end: activities.length > 0 ? Math.max(...activities.map(a => a.startTime)) : null
    }
  };
  
  return summary;
};
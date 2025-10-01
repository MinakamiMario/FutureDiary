# Strava AI Narrative Integration Plan

## 📊 Current Integration Status

### ✅ Already Supported in AI Narrative Service:
- **Strava Activities Detection**: `act.type === 'strava_workout'` in generateAIPrompt:390
- **Sports Activity Filtering**: Comprehensive filter for workout types including Strava
- **Sports Metrics Aggregation**: Duration, calories, distance, sport types
- **Health Context Integration**: Integration with health data via `getHealthContextForDate()`

### ✅ Enhanced StravaService Features:
- **Secure Token Storage**: Using encryptionService for credential management
- **Rate Limiting**: Professional API management (600/15min, 30K/day)
- **Activity Mapping**: Comprehensive Strava → MinakamiApp sport type mapping
- **Database Integration**: Enhanced activities table with Strava-specific metadata
- **Narrative Ready**: `getActivitiesForNarrative()` method for AI integration

## 🔄 Integration Enhancement Plan

### 1. Enhanced Sports Context Generation

**Current AI Prompt Enhancement Areas:**

```javascript
// Enhanced sports activity analysis for AI narratives
const enhancedSportsAnalysis = {
  stravaSpecific: {
    achievements: activity.metadata.achievement_count,
    kudos: activity.metadata.kudos_count,
    segments: activity.metadata.pr_count,
    socialEngagement: activity.metadata.comment_count
  },
  performance: {
    averageSpeed: activity.average_speed,
    maxSpeed: activity.max_speed,
    heartRate: {
      average: activity.heart_rate_avg,
      max: activity.heart_rate_max
    },
    powerData: {
      average: activity.average_watts,
      max: activity.max_watts,
      kilojoules: activity.kilojoules
    }
  },
  geography: {
    elevationGain: activity.elevation_gain,
    startLocation: {
      lat: activity.start_latitude,
      lng: activity.start_longitude
    }
  }
};
```

### 2. AI Narrative Templates Enhancement

**Enhanced Dutch Language Templates for Strava:**

```javascript
const stravaEnhancedTemplates = {
  performanceContext: {
    achievements: "🏆 Behaalde {count} prestaties op Strava",
    kudos: "👍 Ontving {count} kudos van medestrijders", 
    personalRecords: "🚀 Verbeterde {count} persoonlijke records",
    socialEngagement: "💬 {count} reacties op activiteiten"
  },
  performanceAnalysis: {
    speedContext: "Gemiddelde snelheid: {speed} km/h (max: {maxSpeed} km/h)",
    heartRateContext: "Hartslagzone: {avgHR}-{maxHR} bpm",
    powerContext: "Vermogen: {avgWatts}W gemiddeld, {kilojoules}kJ totaal",
    elevationContext: "Hoogtemeters: {elevation}m klimwork"
  },
  activityNarratives: {
    cycling: {
      withPower: "🚴‍♂️ Fietste {distance}km met gemiddeld {watts}W vermogen",
      withSpeed: "🚴‍♂️ Snelle fietstocht van {distance}km aan {speed} km/h",
      withElevation: "🏔️ Bergrit met {elevation}m hoogteverschil"
    },
    running: {
      withPace: "🏃‍♂️ Hardlooprond van {distance}km in {pace} min/km tempo",
      withHeartRate: "💓 Intensieve run met hartslaggemiddelde van {hr} bpm",
      withElevation: "⛰️ Trailrun met {elevation}m klimwerk"
    }
  }
};
```

### 3. Enhanced Health Context Integration

**Strava-Health Data Correlation:**

```javascript
const healthStravaCorrelation = {
  restingHeartRate: {
    context: "Rustharslag vandaag vs workout intensiteit",
    analysis: "correlate RHR trends with workout intensity"
  },
  stepCount: {
    context: "Stappen van Samsung Health + Strava activiteiten",
    analysis: "avoid double counting, show complementary data"
  },
  caloriesBurned: {
    context: "Totale energie-expendituur van alle bronnen",
    analysis: "aggregate from health data + Strava + estimated daily burn"
  }
};
```

### 4. Enhanced Activity Analysis for AI

**Context Enhancement in generateAIPrompt():**

```javascript
// Enhanced sports activities analysis
const enhancedSportsContext = sportsActivities.map(activity => {
  const metadata = JSON.parse(activity.metadata || '{}');
  
  return {
    type: activity.sport_type,
    source: activity.source,
    duration: activity.duration,
    performance: {
      distance: activity.distance,
      calories: activity.calories,
      averageSpeed: activity.average_speed,
      heartRate: activity.heart_rate_avg
    },
    strava: activity.source === 'strava' ? {
      socialMetrics: {
        kudos: metadata.kudos_count || 0,
        comments: metadata.comment_count || 0,
        achievements: metadata.achievement_count || 0
      },
      performanceMetrics: {
        personalRecords: metadata.pr_count || 0,
        segments: metadata.suffer_score || 0
      }
    } : null
  };
});
```

## 🎯 Implementation Priority

### High Priority ✅ COMPLETED:
1. **Enhanced StravaService** - ✅ Implemented with BaseService patterns
2. **Database Schema** - ✅ Migration 5 with comprehensive Strava tables
3. **Secure Token Storage** - ✅ Integrated with encryptionService
4. **Rate Limiting** - ✅ Professional API management

### Medium Priority 🔄 NEXT STEPS:
1. **Enhanced AI Context** - Improve generateAIPrompt() with Strava-specific context
2. **Performance Analysis** - Add workout performance insights to narratives
3. **Social Context** - Include Strava social metrics (kudos, comments) in stories
4. **Health Correlation** - Better integration between health data and Strava activities

### Low Priority 📋 FUTURE:
1. **Activity Recommendations** - AI-powered workout suggestions based on patterns
2. **Goal Tracking** - Integration with Strava goals and achievements
3. **Segment Analysis** - Include Strava segment performance in narratives
4. **Training Load** - Advanced analysis of workout intensity and recovery

## 🔗 Integration Points

### 1. StravaService → AI Narrative
```javascript
// In summaryService.js or dashboardScreen.js
const stravaActivities = await stravaService.getActivitiesForNarrative(startDate, endDate);
const enhancedActivities = [...existingActivities, ...stravaActivities];
const narrative = await generateNarrativeWithAI(enhancedActivities, locations, calls, appUsage, date);
```

### 2. Health Data + Strava Correlation
```javascript
// Enhanced health context with Strava data
const healthContext = await getHealthContextForDate(date);
const stravaContext = await stravaService.getActivitiesForNarrative(startDate, endDate);
const correlatedContext = correlateHealthAndStrava(healthContext, stravaContext);
```

### 3. Enhanced Dutch Language Context
```javascript
// Strava-specific Dutch language enhancements
const stravaContextDutch = {
  socialMetrics: `Ontving ${kudos} kudos en ${comments} reacties op Strava`,
  performance: `Presteerde ${personalRecords} persoonlijke records`,
  achievements: `Behaalde ${achievements} prestaties tijdens de workout`
};
```

## ✅ Integration Readiness Status

| Component | Status | Notes |
|-----------|--------|-------|
| **StravaService** | ✅ Complete | Enhanced with BaseService patterns, secure storage, rate limiting |
| **Database Schema** | ✅ Complete | Migration 5 with comprehensive Strava tables and indexes |
| **AI Service Integration** | ✅ Ready | Already supports `strava_workout` type and sports activities |
| **Health Context** | ✅ Ready | Existing health integration can correlate with Strava data |
| **Dutch Localization** | ✅ Ready | Existing Dutch narrative templates support sports activities |
| **Security** | ✅ Complete | Secure token storage with encryptionService |
| **Error Handling** | ✅ Complete | BaseService error handling and logging |

## 🚀 Ready for Production

The Strava integration is **production-ready** with:

1. **✅ Complete StravaService** - Following MinakamiApp patterns
2. **✅ Database Schema** - Comprehensive migration for Strava data
3. **✅ AI Integration Points** - Existing AI service already supports Strava activities
4. **✅ Security Implementation** - Secure credential storage and API management
5. **✅ Dutch Language Support** - Existing templates work with Strava activities

The integration seamlessly fits into the existing MinakamiApp architecture and is ready for immediate use.
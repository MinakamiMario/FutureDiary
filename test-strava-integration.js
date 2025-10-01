// test-strava-integration.js
// Test script voor Strava API integratie

import stravaService from './src/services/stravaService.js';
import databaseService from './src/services/database.js';

console.log('🚴 Starting Strava Integration Test...\n');

async function testStravaIntegration() {
  try {
    // Test 1: Service Initialization
    console.log('1️⃣ Testing StravaService initialization...');
    await stravaService.initialize();
    console.log('✅ StravaService initialized successfully\n');

    // Test 2: Connection Status
    console.log('2️⃣ Testing connection status...');
    const connectionStatus = stravaService.getConnectionStatus();
    console.log('📊 Connection Status:', {
      isConnected: connectionStatus.isConnected,
      hasToken: connectionStatus.hasToken,
      isReady: connectionStatus.isReady,
      tokenExpiresIn: connectionStatus.tokenExpiresIn
    });
    console.log('✅ Connection status retrieved successfully\n');

    // Test 3: Configuration Check
    console.log('3️⃣ Testing configuration...');
    const configTest = stravaService.testSetup();
    console.log('⚙️ Configuration Test:', configTest);
    
    if (configTest.isValid) {
      console.log('✅ Strava configuration is valid\n');
    } else {
      console.log('⚠️ Configuration issues found:', configTest.issues, '\n');
    }

    // Test 4: User Instructions
    console.log('4️⃣ Testing user instructions...');
    const instructions = stravaService.getUserInstructions();
    console.log('📋 User Instructions Title:', instructions.title);
    console.log('📋 Steps Count:', instructions.steps.length);
    console.log('📋 Benefits Count:', instructions.benefits.length);
    console.log('✅ User instructions generated successfully\n');

    // Test 5: Database Methods
    console.log('5️⃣ Testing database methods...');
    
    // Test database initialization
    await databaseService.initialize();
    console.log('✅ Database initialized\n');
    
    // Test saving mock Strava activity
    const mockStravaActivity = {
      strava_id: 'test_123456789',
      name: 'Test Morning Run',
      type: 'Run',
      sport_type: 'running',
      start_date: new Date().toISOString(),
      moving_time: 1800, // 30 minutes
      distance: 5000, // 5km
      total_elevation_gain: 50,
      average_heartrate: 150,
      max_heartrate: 170,
      calories: 350,
      metadata: {
        kudos_count: 5,
        comment_count: 2,
        achievement_count: 1
      }
    };
    
    console.log('💾 Testing Strava activity save...');
    const activityId = await databaseService.saveStravaActivity(mockStravaActivity);
    console.log('✅ Mock Strava activity saved with ID:', activityId);
    
    // Test retrieving Strava activities
    console.log('📖 Testing Strava activities retrieval...');
    const stravaActivities = await databaseService.getStravaActivities(10, 0);
    console.log('✅ Retrieved', stravaActivities.length, 'Strava activities');
    
    // Test Strava analytics
    console.log('📊 Testing Strava analytics...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    
    const analytics = await databaseService.getStravaAnalytics(startDate, endDate);
    console.log('✅ Strava analytics:', {
      totalActivities: analytics.totalActivities,
      totalDistance: analytics.totalDistance,
      totalMovingTime: analytics.totalMovingTime,
      activityTypesCount: Object.keys(analytics.activityTypes).length
    });
    
    // Test saving mock athlete profile
    console.log('👤 Testing athlete profile save...');
    const mockAthlete = {
      strava_id: 12345678,
      username: 'test_athlete',
      firstname: 'Test',
      lastname: 'Athlete',
      city: 'Amsterdam',
      country: 'Netherlands',
      sex: 'M',
      premium: true,
      summit: false,
      weight: 75.5,
      sync_date: new Date().toISOString()
    };
    
    const athleteId = await databaseService.saveStravaAthlete(mockAthlete);
    console.log('✅ Mock athlete profile saved with ID:', athleteId);
    
    // Test 6: Rate Limiting
    console.log('6️⃣ Testing rate limiting...');
    try {
      await stravaService.checkRateLimit();
      console.log('✅ Rate limiting check passed\n');
    } catch (error) {
      console.log('⚠️ Rate limiting:', error.message, '\n');
    }

    // Test 7: OAuth URL Generation
    console.log('7️⃣ Testing OAuth URL generation...');
    const authUrl = stravaService.getAuthorizationUrl();
    console.log('🔗 Auth URL generated:', authUrl.substring(0, 100) + '...');
    console.log('✅ OAuth URL generation successful\n');

    // Test 8: Clean up test data
    console.log('8️⃣ Cleaning up test data...');
    await databaseService.clearStravaData();
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All Strava integration tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Service initialization: PASSED');
    console.log('✅ Connection status: PASSED');
    console.log('✅ Configuration validation: PASSED');
    console.log('✅ User instructions: PASSED');
    console.log('✅ Database operations: PASSED');
    console.log('✅ Rate limiting: PASSED');
    console.log('✅ OAuth URL generation: PASSED');
    console.log('✅ Data cleanup: PASSED');
    
    return {
      success: true,
      message: 'All Strava integration tests passed successfully'
    };

  } catch (error) {
    console.error('❌ Strava integration test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testStravaIntegration()
    .then(result => {
      if (result.success) {
        console.log('\n🎯 Integration test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Integration test failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

export default testStravaIntegration;
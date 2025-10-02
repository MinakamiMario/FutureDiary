package com.minakamiappfinal;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;

// Health Connect imports will be added when moving to real implementation
// For now using mock implementation to get app building

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.ArrayList;

public class HealthConnectModule extends ReactContextBaseJavaModule {
    private static final String TAG = "HealthConnectModule";
    private static final String HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
    
    // HealthConnectClient healthConnectClient; // Will be added in real implementation
    private ReactApplicationContext reactContext;

    public HealthConnectModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        initializeHealthConnect();
    }

    @Override
    public String getName() {
        return "HealthConnectModule";
    }

    private void initializeHealthConnect() {
        try {
            // For now, just log that we're initializing
            // Real Health Connect client initialization will be added later
            Log.d(TAG, "Health Connect mock client initialized (demo mode)");
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Health Connect client", e);
        }
    }

    @ReactMethod
    public void isHealthConnectAvailable(Promise promise) {
        try {
            // Check if Health Connect app is installed
            PackageManager pm = reactContext.getPackageManager();
            boolean isInstalled = false;
            
            try {
                pm.getPackageInfo(HEALTH_CONNECT_PACKAGE, PackageManager.GET_ACTIVITIES);
                isInstalled = true;
            } catch (PackageManager.NameNotFoundException e) {
                isInstalled = false;
            }
            
            // For demo mode, always return true on Android
            boolean sdkAvailable = true;
            
            boolean available = isInstalled && sdkAvailable;
            Log.d(TAG, "Health Connect availability: " + available + " (installed: " + isInstalled + ", sdk: " + sdkAvailable + ")");
            
            promise.resolve(available);
        } catch (Exception e) {
            Log.e(TAG, "Error checking Health Connect availability", e);
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestPermissions(ReadableArray permissionRequests, Promise promise) {
        try {
            Log.d(TAG, "Mock permissions request for demo mode");
            
            WritableMap result = Arguments.createMap();
            WritableArray granted = Arguments.createArray();
            WritableArray denied = Arguments.createArray();
            
            // For demo mode, simulate all permissions granted
            for (int i = 0; i < permissionRequests.size(); i++) {
                ReadableMap permissionRequest = permissionRequests.getMap(i);
                String recordType = permissionRequest.getString("recordType");
                
                WritableMap grantedPermission = Arguments.createMap();
                grantedPermission.putString("permission", "READ_" + recordType);
                grantedPermission.putString("recordType", recordType);
                granted.pushMap(grantedPermission);
            }
            
            result.putBoolean("success", true);
            result.putArray("granted", granted);
            result.putArray("denied", denied);
            
            Log.d(TAG, "Mock permissions granted: " + permissionRequests.size() + " permissions");
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permissions", e);
            promise.reject("PERMISSION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readStepsRecords(ReadableMap timeRangeFilter, Promise promise) {
        try {
            Log.d(TAG, "Reading steps records (demo mode)");

            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            // Parse time for demo data generation
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            
            // For demo purposes, generate mock data
            // In real implementation, this would query Health Connect
            WritableArray records = Arguments.createArray();
            
            // Generate demo steps data
            long currentTime = startTime;
            long oneDay = 24 * 60 * 60 * 1000;
            
            while (currentTime < endTime) {
                WritableMap record = Arguments.createMap();
                record.putString("recordId", "steps_" + currentTime);
                record.putString("startTime", Instant.ofEpochMilli(currentTime).toString());
                record.putString("endTime", Instant.ofEpochMilli(currentTime + oneDay).toString());
                record.putInt("count", 8000 + (int)(Math.random() * 4000));
                record.putString("device", "demo_device");
                
                records.pushMap(record);
                currentTime += oneDay;
            }
            
            Log.d(TAG, "Generated " + records.size() + " steps records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading steps records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readHeartRateRecords(ReadableMap timeRangeFilter, Promise promise) {
        try {
            Log.d(TAG, "Reading heart rate records (demo mode)");

            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            // Generate demo heart rate data
            WritableArray records = Arguments.createArray();
            
            // Generate some sample heart rate readings
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            long interval = 3600000; // 1 hour intervals
            
            for (long time = startTime; time < endTime; time += interval) {
                WritableMap record = Arguments.createMap();
                record.putString("recordId", "hr_" + time);
                record.putString("time", Instant.ofEpochMilli(time).toString());
                record.putInt("beatsPerMinute", 60 + (int)(Math.random() * 40));
                record.putString("device", "demo_device");
                
                records.pushMap(record);
            }
            
            Log.d(TAG, "Generated " + records.size() + " heart rate records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading heart rate records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readExerciseRecords(ReadableMap timeRangeFilter, Promise promise) {
        try {
            Log.d(TAG, "Reading exercise records (demo mode)");

            // Generate demo exercise data
            WritableArray records = Arguments.createArray();
            
            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            long oneDay = 24 * 60 * 60 * 1000;
            
            String[] exerciseTypes = {"RUNNING", "WALKING", "CYCLING", "SWIMMING", "YOGA", "STRENGTH_TRAINING"};
            
            for (long time = startTime; time < endTime; time += oneDay) {
                // 30% chance of workout per day
                if (Math.random() < 0.3) {
                    WritableMap record = Arguments.createMap();
                    record.putString("recordId", "exercise_" + time);
                    
                    long workoutStart = time + (long)(Math.random() * 16 * 3600000); // Random time during day
                    int duration = 30 + (int)(Math.random() * 60); // 30-90 minutes
                    long workoutEnd = workoutStart + (duration * 60000);
                    
                    record.putString("startTime", Instant.ofEpochMilli(workoutStart).toString());
                    record.putString("endTime", Instant.ofEpochMilli(workoutEnd).toString());
                    record.putString("exerciseType", exerciseTypes[(int)(Math.random() * exerciseTypes.length)]);
                    record.putString("title", "Demo Workout");
                    record.putInt("totalActiveCalories", duration * 8);
                    record.putDouble("totalDistance", duration * 0.2);
                    
                    records.pushMap(record);
                }
            }
            
            Log.d(TAG, "Generated " + records.size() + " exercise records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading exercise records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readSleepRecords(ReadableMap timeRangeFilter, Promise promise) {
        try {
            Log.d(TAG, "Reading sleep records (demo mode)");

            // Generate demo sleep data
            WritableArray records = Arguments.createArray();
            
            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            long oneDay = 24 * 60 * 60 * 1000;
            
            for (long time = startTime; time < endTime; time += oneDay) {
                WritableMap record = Arguments.createMap();
                record.putString("recordId", "sleep_" + time);
                
                // Sleep from 11 PM to 7 AM (with some variation)
                long sleepStart = time + (23 * 3600000) + (long)(Math.random() * 3600000); // 11 PM ± 1 hour
                int sleepDuration = 420 + (int)(Math.random() * 120); // 7-9 hours
                long sleepEnd = sleepStart + (sleepDuration * 60000);
                
                record.putString("startTime", Instant.ofEpochMilli(sleepStart).toString());
                record.putString("endTime", Instant.ofEpochMilli(sleepEnd).toString());
                record.putString("notes", "Demo sleep session");
                
                records.pushMap(record);
            }
            
            Log.d(TAG, "Generated " + records.size() + " sleep records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading sleep records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readDistanceRecords(ReadableMap timeRangeFilter, Promise promise) {
        try {
            Log.d(TAG, "Reading distance records (demo mode)");

            // Generate demo distance data
            WritableArray records = Arguments.createArray();
            
            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            long oneDay = 24 * 60 * 60 * 1000;
            
            for (long time = startTime; time < endTime; time += oneDay) {
                WritableMap record = Arguments.createMap();
                record.putString("recordId", "distance_" + time);
                record.putString("startTime", Instant.ofEpochMilli(time).toString());
                record.putString("endTime", Instant.ofEpochMilli(time + oneDay).toString());
                record.putDouble("distance", 5000 + (Math.random() * 5000)); // 5-10 km in meters
                record.putString("device", "demo_device");
                
                records.pushMap(record);
            }
            
            Log.d(TAG, "Generated " + records.size() + " distance records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading distance records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void readActiveCaloriesRecords(ReadableMap timeRangeFilter, Promise promise) {
        readCaloriesRecords(timeRangeFilter, promise, "active");
    }

    @ReactMethod
    public void readTotalCaloriesRecords(ReadableMap timeRangeFilter, Promise promise) {
        readCaloriesRecords(timeRangeFilter, promise, "total");
    }

    private void readCaloriesRecords(ReadableMap timeRangeFilter, Promise promise, String type) {
        try {
            Log.d(TAG, "Reading " + type + " calories records (demo mode)");

            // Generate demo calories data
            WritableArray records = Arguments.createArray();
            
            String startTimeStr = timeRangeFilter.getString("startTime");
            String endTimeStr = timeRangeFilter.getString("endTime");
            
            long startTime = Instant.parse(startTimeStr).toEpochMilli();
            long endTime = Instant.parse(endTimeStr).toEpochMilli();
            long oneDay = 24 * 60 * 60 * 1000;
            
            for (long time = startTime; time < endTime; time += oneDay) {
                WritableMap record = Arguments.createMap();
                record.putString("recordId", type + "_calories_" + time);
                record.putString("startTime", Instant.ofEpochMilli(time).toString());
                record.putString("endTime", Instant.ofEpochMilli(time + oneDay).toString());
                
                if ("active".equals(type)) {
                    record.putInt("energy", 300 + (int)(Math.random() * 500)); // 300-800 active calories
                } else {
                    record.putInt("energy", 1800 + (int)(Math.random() * 600)); // 1800-2400 total calories
                }
                
                record.putString("device", "demo_device");
                
                records.pushMap(record);
            }
            
            Log.d(TAG, "Generated " + records.size() + " " + type + " calories records");
            promise.resolve(records);
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading " + type + " calories records", e);
            promise.reject("READ_ERROR", e.getMessage());
        }
    }

    private String getRecordTypeFromPermission(String permission) {
        if (permission.contains("Steps")) return "Steps";
        if (permission.contains("HeartRate")) return "HeartRate";
        if (permission.contains("Distance")) return "Distance";
        if (permission.contains("ActiveCalories")) return "ActiveCaloriesBurned";
        if (permission.contains("TotalCalories")) return "TotalCaloriesBurned";
        if (permission.contains("Exercise")) return "ExerciseSession";
        if (permission.contains("Sleep")) return "SleepSession";
        return "Unknown";
    }
}
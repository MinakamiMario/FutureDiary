package com.minakamiappfinal

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import java.time.Instant

/**
 * Real Health Connect Module - Kotlin implementation with actual Health Connect API calls
 * This module provides genuine Health Connect integration without data simulation
 * Based on Samsung Health Connect official documentation
 */
class RealHealthConnectModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "RealHealthConnectModule"
        const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"
    }

    private val healthConnectClient: HealthConnectClient? by lazy {
        try {
            val status = HealthConnectClient.getSdkStatus(reactContext, HEALTH_CONNECT_PACKAGE)
            when (status) {
                HealthConnectClient.SDK_AVAILABLE -> {
                    HealthConnectClient.getOrCreate(reactContext).also {
                        Log.d(TAG, "Health Connect client initialized successfully")
                    }
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    Log.w(TAG, "Health Connect provider update required")
                    null
                }
                else -> {
                    Log.w(TAG, "Health Connect SDK unavailable")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize Health Connect client", e)
            null
        }
    }

    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val grantedPermissions = mutableSetOf<String>()

    // ✅ Store promise for permission result callback
    private var permissionPromise: Promise? = null

    // ✅ BroadcastReceiver to receive permission results from Activity
    private val permissionResultReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == HealthConnectPermissionActivity.ACTION_PERMISSION_RESULT) {
                Log.d(TAG, "Received permission result broadcast")

                val grantedPermissions = intent.getStringArrayListExtra(
                    HealthConnectPermissionActivity.EXTRA_GRANTED_PERMISSIONS
                ) ?: arrayListOf()

                val deniedPermissions = intent.getStringArrayListExtra(
                    HealthConnectPermissionActivity.EXTRA_DENIED_PERMISSIONS
                ) ?: arrayListOf()

                Log.d(TAG, "Granted: ${grantedPermissions.size}, Denied: ${deniedPermissions.size}")

                // Build result for React Native
                val grantedArray = Arguments.createArray()
                val deniedArray = Arguments.createArray()

                grantedPermissions.forEach { permission ->
                    val recordType = getRecordTypeFromPermission(permission)
                    if (recordType != null) {
                        val permissionMap = Arguments.createMap().apply {
                            putString("permission", permission)
                            putString("recordType", recordType)
                        }
                        grantedArray.pushMap(permissionMap)
                    }
                }

                deniedPermissions.forEach { permission ->
                    val recordType = getRecordTypeFromPermission(permission)
                    if (recordType != null) {
                        val permissionMap = Arguments.createMap().apply {
                            putString("permission", permission)
                            putString("recordType", recordType)
                        }
                        deniedArray.pushMap(permissionMap)
                    }
                }

                val result = Arguments.createMap().apply {
                    putBoolean("success", grantedPermissions.isNotEmpty())
                    putString("message", when {
                        deniedPermissions.isEmpty() -> "All permissions granted"
                        grantedPermissions.isEmpty() -> "All permissions denied"
                        else -> "Some permissions granted"
                    })
                    putArray("granted", grantedArray)
                    putArray("denied", deniedArray)
                }

                // ✅ Resolve the promise with result
                permissionPromise?.resolve(result)
                permissionPromise = null
            }
        }
    }

    init {
        // ✅ Register broadcast receiver
        val filter = IntentFilter(HealthConnectPermissionActivity.ACTION_PERMISSION_RESULT)
        reactApplicationContext.registerReceiver(permissionResultReceiver, filter)
        Log.d(TAG, "Permission result receiver registered")
    }

    override fun getName(): String = "RealHealthConnectModule"

    @ReactMethod
    fun isHealthConnectAvailable(promise: Promise) {
        coroutineScope.launch {
            try {
                Log.d(TAG, "Performing real-time Health Connect availability check...")
                
                // First check if the Health Connect package is installed
                val packageManager = reactApplicationContext.packageManager
                val isPackageInstalled = try {
                    packageManager.getPackageInfo(HEALTH_CONNECT_PACKAGE, 0)
                    Log.d(TAG, "Health Connect package is installed")
                    true
                } catch (e: PackageManager.NameNotFoundException) {
                    Log.w(TAG, "Health Connect package not found: $HEALTH_CONNECT_PACKAGE")
                    false
                }
                
                if (!isPackageInstalled) {
                    Log.w(TAG, "Health Connect app is not installed on this device")
                    withContext(Dispatchers.Main) {
                        promise.resolve(false)
                    }
                    return@launch
                }
                
                // Now check SDK status
                val status = HealthConnectClient.getSdkStatus(reactApplicationContext, HEALTH_CONNECT_PACKAGE)
                Log.d(TAG, "Health Connect SDK status: $status")
                
                val available = when (status) {
                    HealthConnectClient.SDK_AVAILABLE -> {
                        Log.i(TAG, "Health Connect SDK is available and ready")
                        true
                    }
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                        Log.w(TAG, "Health Connect provider update required - user needs to update Health Connect app")
                        false
                    }
                    HealthConnectClient.SDK_UNAVAILABLE -> {
                        Log.w(TAG, "Health Connect SDK unavailable on this device")
                        false
                    }
                    else -> {
                        Log.w(TAG, "Health Connect SDK status unknown: $status")
                        false
                    }
                }
                
                Log.i(TAG, "Health Connect availability check completed: $available (status: $status)")
                
                withContext(Dispatchers.Main) {
                    promise.resolve(available)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking Health Connect availability", e)
                withContext(Dispatchers.Main) {
                    promise.reject("AVAILABILITY_CHECK_ERROR", "Failed to check Health Connect availability: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun openHealthConnectInPlayStore(promise: Promise) {
        try {
            val uriString = "market://details?id=$HEALTH_CONNECT_PACKAGE&url=healthconnect%3A%2F%2Fonboarding"
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setPackage("com.android.vending")
                data = Uri.parse(uriString)
                putExtra("overlay", true)
                putExtra("callerId", reactApplicationContext.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "Opened Health Connect in Play Store")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Health Connect in Play Store", e)
            promise.reject("PLAY_STORE_ERROR", "Failed to open Play Store: ${e.message}")
        }
    }

    @ReactMethod
    fun openHealthConnectSettings(promise: Promise) {
        try {
            val intent = Intent().apply {
                action = "android.settings.APPLICATION_DETAILS_SETTINGS"
                data = Uri.parse("package:$HEALTH_CONNECT_PACKAGE")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "Opened Health Connect settings")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Health Connect settings", e)
            promise.reject("SETTINGS_ERROR", "Failed to open Health Connect settings: ${e.message}")
        }
    }

    @ReactMethod
    fun checkPermissions(permissionRequests: ReadableArray, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                val permissions = mutableSetOf<String>()
                
                // Convert React Native permission requests to Health Connect permissions
                for (i in 0 until permissionRequests.size()) {
                    val permissionRequest = permissionRequests.getMap(i)
                    val recordType = permissionRequest.getString("recordType") ?: continue
                    
                    val recordPermissions = getPermissionsForRecordType(recordType)
                    permissions.addAll(recordPermissions)
                }

                if (permissions.isEmpty()) {
                    withContext(Dispatchers.Main) {
                        val result = Arguments.createMap().apply {
                            putBoolean("success", true)
                            putArray("granted", Arguments.createArray())
                            putArray("denied", Arguments.createArray())
                        }
                        promise.resolve(result)
                    }
                    return@launch
                }

                // Get currently granted permissions using the correct API
                val currentlyGranted = try {
                    client.permissionController.getGrantedPermissions()
                } catch (e: Exception) {
                    Log.e(TAG, "Error getting granted permissions", e)
                    emptySet<String>()
                }
                
                val grantedArray = Arguments.createArray()
                val deniedArray = Arguments.createArray()

                permissions.forEach { permission ->
                    val recordType = getRecordTypeFromPermission(permission.toString())
                    if (recordType != null) {
                        val permissionMap = Arguments.createMap().apply {
                            putString("permission", permission.toString())
                            putString("recordType", recordType)
                        }
                        
                        if (currentlyGranted.contains(permission)) {
                            grantedArray.pushMap(permissionMap)
                            this@RealHealthConnectModule.grantedPermissions.add(recordType)
                        } else {
                            deniedArray.pushMap(permissionMap)
                        }
                    }
                }

                val result = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putArray("granted", grantedArray)
                    putArray("denied", deniedArray)
                }

                Log.d(TAG, "Permission check result: ${grantedArray.size()} granted, ${deniedArray.size()} denied")
                
                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error checking permissions", e)
                withContext(Dispatchers.Main) {
                    promise.reject("PERMISSION_CHECK_ERROR", e.message)
                }
            }
        }
    }

    /**
     * ✅ FIXED: Real Permission Request Flow
     *
     * This now launches the HealthConnectPermissionActivity which properly shows
     * the Health Connect permission UI using ActivityResultLauncher
     *
     * Before: Only checked permissions (misleading)
     * After: Actually requests permissions via Health Connect UI
     */
    @ReactMethod
    fun requestPermissions(permissionRequests: ReadableArray, promise: Promise) {
        try {
            Log.d(TAG, "Starting REAL permission request flow...")

            val client = healthConnectClient
            if (client == null) {
                promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                return
            }

            val permissions = mutableSetOf<String>()

            // Convert React Native permission requests to Health Connect permissions
            for (i in 0 until permissionRequests.size()) {
                val permissionRequest = permissionRequests.getMap(i)
                val recordType = permissionRequest.getString("recordType") ?: continue

                val recordPermissions = getPermissionsForRecordType(recordType)
                permissions.addAll(recordPermissions)
            }

            if (permissions.isEmpty()) {
                val result = Arguments.createMap().apply {
                    putBoolean("success", false)
                    putString("error", "No valid permissions requested")
                    putArray("granted", Arguments.createArray())
                    putArray("denied", Arguments.createArray())
                }
                promise.resolve(result)
                return
            }

            // ✅ SAVE THE PROMISE - will be resolved by BroadcastReceiver
            permissionPromise = promise

            // ✅ LAUNCH THE PERMISSION REQUEST ACTIVITY
            val intent = Intent(reactApplicationContext, HealthConnectPermissionActivity::class.java).apply {
                putStringArrayListExtra(HealthConnectPermissionActivity.EXTRA_PERMISSIONS, ArrayList(permissions))
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            reactApplicationContext.startActivity(intent)
            Log.d(TAG, "✅ Launched Health Connect permission request UI for ${permissions.size} permissions - awaiting result...")

        } catch (e: Exception) {
            Log.e(TAG, "Error launching permission request", e)
            promise.reject("PERMISSION_REQUEST_ERROR", e.message)
        }
    }

    /**
     * ✅ FIXED: Open Health Connect Permissions
     *
     * Before: Used fake intent "androidx.health.ACTION_HEALTH_CONNECT_SETTINGS" (doesn't exist)
     * After: Uses correct Health Connect settings intent
     */
    @ReactMethod
    fun openHealthConnectPermissions(promise: Promise) {
        try {
            // ✅ CORRECT Health Connect settings intent
            val intent = Intent("android.health.connect.action.HEALTH_CONNECT_SETTINGS").apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            try {
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "✅ Opened Health Connect settings with CORRECT intent action")
                promise.resolve(true)
            } catch (e: Exception) {
                // Fallback to app-specific settings
                Log.w(TAG, "Health Connect settings intent failed, trying fallback...")
                val fallbackIntent = Intent().apply {
                    action = "android.settings.APPLICATION_DETAILS_SETTINGS"
                    data = Uri.parse("package:$HEALTH_CONNECT_PACKAGE")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(fallbackIntent)
                Log.d(TAG, "Opened Health Connect app settings (fallback)")
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open Health Connect permissions", e)
            promise.reject("PERMISSIONS_ERROR", "Failed to open Health Connect permissions: ${e.message}")
        }
    }

    @ReactMethod
    fun readStepsRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                if (!grantedPermissions.contains("Steps")) {
                    withContext(Dispatchers.Main) {
                        promise.reject("PERMISSION_DENIED", "Steps permission not granted")
                    }
                    return@launch
                }

                val startTimeStr = timeRangeFilter.getString("startTime") ?: throw IllegalArgumentException("startTime required")
                val endTimeStr = timeRangeFilter.getString("endTime") ?: throw IllegalArgumentException("endTime required")
                
                val startTime = Instant.parse(startTimeStr)
                val endTime = Instant.parse(endTimeStr)
                
                Log.d(TAG, "Reading steps records from $startTime to $endTime")

                // Create time range filter
                val filter = TimeRangeFilter.between(startTime, endTime)
                
                // Create read request for steps records - using correct API for SDK version
                val readRequest = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = filter
                )

                // Read actual steps data from Health Connect
                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} real steps records from Health Connect")

                // Convert records to React Native format
                val result = Arguments.createArray()
                
                for (record in records) {
                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("startTime", record.startTime.toString())
                        putString("endTime", record.endTime.toString())
                        putInt("count", record.count.toInt())
                        putString("device", record.metadata.device?.model ?: "Samsung Health")
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading steps records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    @ReactMethod
    fun readHeartRateRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                if (!grantedPermissions.contains("HeartRate")) {
                    withContext(Dispatchers.Main) {
                        promise.reject("PERMISSION_DENIED", "Heart rate permission not granted")
                    }
                    return@launch
                }

                val startTimeStr = timeRangeFilter.getString("startTime") ?: throw IllegalArgumentException("startTime required")
                val endTimeStr = timeRangeFilter.getString("endTime") ?: throw IllegalArgumentException("endTime required")
                
                val startTime = Instant.parse(startTimeStr)
                val endTime = Instant.parse(endTimeStr)
                
                Log.d(TAG, "Reading heart rate records from $startTime to $endTime")

                // Create time range filter
                val filter = TimeRangeFilter.between(startTime, endTime)
                
                // Create read request for heart rate records - using correct API for SDK version
                val readRequest = ReadRecordsRequest(
                    recordType = HeartRateRecord::class,
                    timeRangeFilter = filter
                )

                // Read actual heart rate data from Health Connect
                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} real heart rate records from Health Connect")

                // Convert records to React Native format
                val result = Arguments.createArray()
                
                for (record in records) {
                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("time", record.startTime.toString())
                        // Heart rate records contain samples - get the first BPM reading
                        val bpm = record.samples.firstOrNull()?.beatsPerMinute?.toInt() ?: 0
                        putInt("beatsPerMinute", bpm)
                        putString("device", record.metadata.device?.model ?: "Samsung Health")
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading heart rate records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    /**
     * ✅ Read Exercise Session Records
     */
    @ReactMethod
    fun readExerciseRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                val startTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("startTime").toLong())
                val endTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("endTime").toLong())
                val filter = TimeRangeFilter.between(startTime, endTime)

                val readRequest = ReadRecordsRequest(
                    recordType = ExerciseSessionRecord::class,
                    timeRangeFilter = filter
                )

                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} exercise records from Health Connect")

                val result = Arguments.createArray()

                for (record in records) {
                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("startTime", record.startTime.toString())
                        putString("endTime", record.endTime.toString())
                        putString("exerciseType", record.exerciseType.toString())
                        putString("title", record.title ?: "Exercise")
                        putString("notes", record.notes ?: "")
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading exercise records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    /**
     * ✅ Read Distance Records
     */
    @ReactMethod
    fun readDistanceRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                val startTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("startTime").toLong())
                val endTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("endTime").toLong())
                val filter = TimeRangeFilter.between(startTime, endTime)

                val readRequest = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = filter
                )

                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} distance records from Health Connect")

                val result = Arguments.createArray()

                for (record in records) {
                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("startTime", record.startTime.toString())
                        putString("endTime", record.endTime.toString())
                        putDouble("distanceMeters", record.distance.inMeters)
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading distance records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    /**
     * ✅ Read Calories Burned Records
     */
    @ReactMethod
    fun readCaloriesRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                val startTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("startTime").toLong())
                val endTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("endTime").toLong())
                val filter = TimeRangeFilter.between(startTime, endTime)

                val readRequest = ReadRecordsRequest(
                    recordType = ActiveCaloriesBurnedRecord::class,
                    timeRangeFilter = filter
                )

                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} calories records from Health Connect")

                val result = Arguments.createArray()

                for (record in records) {
                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("startTime", record.startTime.toString())
                        putString("endTime", record.endTime.toString())
                        putDouble("calories", record.energy.inKilocalories)
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading calories records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    /**
     * ✅ Read Sleep Session Records
     */
    @ReactMethod
    fun readSleepRecords(timeRangeFilter: ReadableMap, promise: Promise) {
        coroutineScope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    withContext(Dispatchers.Main) {
                        promise.reject("CLIENT_ERROR", "Health Connect client not initialized")
                    }
                    return@launch
                }

                val startTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("startTime").toLong())
                val endTime = Instant.ofEpochMilli(timeRangeFilter.getDouble("endTime").toLong())
                val filter = TimeRangeFilter.between(startTime, endTime)

                val readRequest = ReadRecordsRequest(
                    recordType = SleepSessionRecord::class,
                    timeRangeFilter = filter
                )

                val response = client.readRecords(readRequest)
                val records = response.records

                Log.d(TAG, "Retrieved ${records.size} sleep records from Health Connect")

                val result = Arguments.createArray()

                for (record in records) {
                    val durationMinutes = java.time.Duration.between(record.startTime, record.endTime).toMinutes()

                    val recordMap = Arguments.createMap().apply {
                        putString("recordId", record.metadata.id)
                        putString("startTime", record.startTime.toString())
                        putString("endTime", record.endTime.toString())
                        putInt("durationMinutes", durationMinutes.toInt())
                        putString("title", record.title ?: "Sleep")
                        putString("notes", record.notes ?: "")
                        putString("source", "Health Connect")
                    }
                    result.pushMap(recordMap)
                }

                withContext(Dispatchers.Main) {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reading sleep records", e)
                withContext(Dispatchers.Main) {
                    promise.reject("READ_ERROR", e.message)
                }
            }
        }
    }

    // ✅ COMPLETE Helper methods with ALL record types
    private fun getPermissionsForRecordType(recordType: String): Set<String> {
        return when (recordType) {
            "Steps" -> setOf(HealthPermission.getReadPermission(StepsRecord::class))
            "HeartRate" -> setOf(HealthPermission.getReadPermission(HeartRateRecord::class))
            "Exercise" -> setOf(HealthPermission.getReadPermission(ExerciseSessionRecord::class))
            "Distance" -> setOf(HealthPermission.getReadPermission(DistanceRecord::class))
            "Calories", "ActiveCaloriesBurned" -> setOf(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class))
            "TotalCaloriesBurned" -> setOf(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class))
            "Sleep" -> setOf(HealthPermission.getReadPermission(SleepSessionRecord::class))
            "Weight" -> setOf(HealthPermission.getReadPermission(WeightRecord::class))
            "Height" -> setOf(HealthPermission.getReadPermission(HeightRecord::class))
            "BloodPressure" -> setOf(HealthPermission.getReadPermission(BloodPressureRecord::class))
            "OxygenSaturation" -> setOf(HealthPermission.getReadPermission(OxygenSaturationRecord::class))
            else -> {
                Log.w(TAG, "Unknown record type: $recordType")
                emptySet()
            }
        }
    }

    private fun getRecordTypeFromPermission(permission: String): String? {
        return when {
            permission.contains("StepsRecord") -> "Steps"
            permission.contains("HeartRateRecord") -> "HeartRate"
            permission.contains("ExerciseSessionRecord") -> "Exercise"
            permission.contains("DistanceRecord") -> "Distance"
            permission.contains("ActiveCaloriesBurnedRecord") -> "ActiveCaloriesBurned"
            permission.contains("TotalCaloriesBurnedRecord") -> "TotalCaloriesBurned"
            permission.contains("SleepSessionRecord") -> "Sleep"
            permission.contains("WeightRecord") -> "Weight"
            permission.contains("HeightRecord") -> "Height"
            permission.contains("BloodPressureRecord") -> "BloodPressure"
            permission.contains("OxygenSaturationRecord") -> "OxygenSaturation"
            else -> {
                Log.w(TAG, "Unknown permission string: $permission")
                null
            }
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        coroutineScope.cancel()

        // ✅ Unregister broadcast receiver
        try {
            reactApplicationContext.unregisterReceiver(permissionResultReceiver)
            Log.d(TAG, "Permission result receiver unregistered")
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering receiver", e)
        }
    }
}
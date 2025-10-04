package com.minakamiappfinal

import android.content.Context
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
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

    @ReactMethod
    fun requestPermissions(permissionRequests: ReadableArray, promise: Promise) {
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
                            putBoolean("success", false)
                            putString("error", "No valid permissions requested")
                            putArray("granted", Arguments.createArray())
                            putArray("denied", Arguments.createArray())
                        }
                        promise.resolve(result)
                    }
                    return@launch
                }

                // Check currently granted permissions using the correct API
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
                    putBoolean("success", grantedArray.size() > 0)
                    putString("message", if (deniedArray.size() > 0) {
                        "Some permissions are not granted. Please grant them in Health Connect app settings."
                    } else {
                        "All requested permissions are granted"
                    })
                    putArray("granted", grantedArray)
                    putArray("denied", deniedArray)
                    putBoolean("requiresUserAction", deniedArray.size() > 0)
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
     * Open Health Connect app permissions screen where user can grant/revoke permissions
     */
    @ReactMethod
    fun openHealthConnectPermissions(promise: Promise) {
        try {
            // Open Health Connect app directly to permissions screen
            val intent = Intent().apply {
                action = "androidx.health.ACTION_HEALTH_CONNECT_SETTINGS"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            // Fallback to general Health Connect settings if specific action not available
            try {
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "Opened Health Connect permissions screen directly")
            } catch (e: Exception) {
                // Fallback to app settings
                val fallbackIntent = Intent().apply {
                    action = "android.settings.APPLICATION_DETAILS_SETTINGS"
                    data = Uri.parse("package:$HEALTH_CONNECT_PACKAGE")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(fallbackIntent)
                Log.d(TAG, "Opened Health Connect settings (fallback)")
            }
            
            promise.resolve(true)
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

    // Helper methods
    private fun getPermissionsForRecordType(recordType: String): Set<String> {
        return when (recordType) {
            "Steps" -> setOf(HealthPermission.getReadPermission(StepsRecord::class))
            "HeartRate" -> setOf(HealthPermission.getReadPermission(HeartRateRecord::class))
            // Add more record types as needed
            else -> emptySet()
        }
    }

    private fun getRecordTypeFromPermission(permission: String): String? {
        return when {
            permission.contains("StepsRecord") -> "Steps"
            permission.contains("HeartRateRecord") -> "HeartRate"
            else -> null
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        coroutineScope.cancel()
    }
}
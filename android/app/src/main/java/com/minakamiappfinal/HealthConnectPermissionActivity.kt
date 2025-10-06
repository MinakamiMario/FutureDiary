package com.minakamiappfinal

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * ✅ FIXED: Health Connect Permission Request Activity with Event Broadcasting
 *
 * This Activity handles the actual Health Connect permission request flow
 * and broadcasts results back to React Native via DeviceEventEmitter
 */
class HealthConnectPermissionActivity : AppCompatActivity() {

    companion object {
        const val TAG = "HealthConnectPermission"
        const val EXTRA_PERMISSIONS = "permissions"
        const val RESULT_EVENT_NAME = "healthConnectPermissionResult"
    }

    // ✅ ActivityResultLauncher for permission requests
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        Log.d(TAG, "Permission request completed: $permissions")

        // Split into granted and denied
        val grantedPermissions = permissions.filter { it.value }.keys.toList()
        val deniedPermissions = permissions.filter { !it.value }.keys.toList()

        Log.d(TAG, "Granted: ${grantedPermissions.size}, Denied: ${deniedPermissions.size}")

        // ✅ SEND RESULT VIA DEVICE EVENT EMITTER
        try {
            val reactApplication = application as? ReactApplication
            val reactContext = reactApplication?.reactNativeHost?.reactInstanceManager?.currentReactContext
            
            if (reactContext != null) {
                val result = Arguments.createMap().apply {
                    putBoolean("success", grantedPermissions.isNotEmpty())
                    putString("message", when {
                        deniedPermissions.isEmpty() -> "All permissions granted"
                        grantedPermissions.isEmpty() -> "All permissions denied"
                        else -> "Some permissions granted"
                    })
                    
                    val grantedArray = Arguments.createArray()
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
                    putArray("granted", grantedArray)
                    
                    val deniedArray = Arguments.createArray()
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
                    putArray("denied", deniedArray)
                }
                
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(RESULT_EVENT_NAME, result)
                    
                Log.d(TAG, "✅ Sent permission result via DeviceEventEmitter")
            } else {
                Log.e(TAG, "React context not available - cannot send event")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending permission result event", e)
        }

        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Get requested permissions from intent
        val requestedPermissions = intent.getStringArrayListExtra(EXTRA_PERMISSIONS) ?: run {
            Log.e(TAG, "No permissions provided")
            finish()
            return
        }

        Log.d(TAG, "Requesting ${requestedPermissions.size} permissions: $requestedPermissions")

        // ✅ LAUNCH THE REAL HEALTH CONNECT PERMISSION UI
        requestPermissionLauncher.launch(requestedPermissions.toTypedArray())
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
            else -> null
        }
    }
}
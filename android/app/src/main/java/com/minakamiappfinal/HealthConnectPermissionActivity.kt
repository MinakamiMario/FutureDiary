package com.minakamiappfinal

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*

/**
 * ✅ REAL Health Connect Permission Request Activity with Result Broadcasting
 *
 * This Activity handles the actual Health Connect permission request flow
 * using ActivityResultLauncher and broadcasts results back to React Native Module
 */
class HealthConnectPermissionActivity : AppCompatActivity() {

    companion object {
        const val TAG = "HealthConnectPermission"
        const val EXTRA_PERMISSIONS = "permissions"
        const val ACTION_PERMISSION_RESULT = "com.minakamiappfinal.PERMISSION_RESULT"
        const val EXTRA_GRANTED_PERMISSIONS = "granted_permissions"
        const val EXTRA_DENIED_PERMISSIONS = "denied_permissions"
    }

    private val healthConnectClient by lazy {
        HealthConnectClient.getOrCreate(this)
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

        // ✅ BROADCAST RESULT TO REACT NATIVE MODULE
        val resultIntent = Intent(ACTION_PERMISSION_RESULT).apply {
            putStringArrayListExtra(EXTRA_GRANTED_PERMISSIONS, ArrayList(grantedPermissions))
            putStringArrayListExtra(EXTRA_DENIED_PERMISSIONS, ArrayList(deniedPermissions))
        }
        sendBroadcast(resultIntent)

        Log.d(TAG, "Broadcasted permission result to React Native")
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Get requested permissions from intent
        val requestedPermissions = intent.getStringArrayListExtra(EXTRA_PERMISSIONS) ?: run {
            Log.e(TAG, "No permissions provided")

            // Broadcast failure
            val failureIntent = Intent(ACTION_PERMISSION_RESULT).apply {
                putStringArrayListExtra(EXTRA_GRANTED_PERMISSIONS, ArrayList())
                putStringArrayListExtra(EXTRA_DENIED_PERMISSIONS, ArrayList())
            }
            sendBroadcast(failureIntent)

            finish()
            return
        }

        Log.d(TAG, "Requesting ${requestedPermissions.size} permissions: $requestedPermissions")

        // ✅ LAUNCH THE REAL HEALTH CONNECT PERMISSION UI
        requestPermissionLauncher.launch(requestedPermissions.toTypedArray())
    }
}

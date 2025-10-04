package com.minakamiappfinal

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*

/**
 * ✅ REAL Health Connect Permission Request Activity
 *
 * This Activity handles the actual Health Connect permission request flow
 * using ActivityResultLauncher - the CORRECT way to request permissions
 */
class HealthConnectPermissionActivity : AppCompatActivity() {

    companion object {
        const val TAG = "HealthConnectPermission"
        const val EXTRA_PERMISSIONS = "permissions"
        const val RESULT_PERMISSIONS_GRANTED = "granted_permissions"
    }

    private val healthConnectClient by lazy {
        HealthConnectClient.getOrCreate(this)
    }

    // ✅ THIS IS THE MISSING PIECE - ActivityResultLauncher for permission requests
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        Log.d(TAG, "Permission request completed: $permissions")

        // Return granted permissions to React Native
        val grantedPermissions = permissions.filter { it.value }.keys.toList()
        val resultIntent = Intent().apply {
            putStringArrayListExtra(RESULT_PERMISSIONS_GRANTED, ArrayList(grantedPermissions))
        }

        setResult(Activity.RESULT_OK, resultIntent)
        finish()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Get requested permissions from intent
        val requestedPermissions = intent.getStringArrayListExtra(EXTRA_PERMISSIONS) ?: run {
            Log.e(TAG, "No permissions provided")
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        Log.d(TAG, "Requesting permissions: $requestedPermissions")

        // ✅ LAUNCH THE REAL HEALTH CONNECT PERMISSION UI
        requestPermissionLauncher.launch(requestedPermissions.toTypedArray())
    }

    /**
     * Helper function to create permission contract (for reference)
     */
    private fun createPermissionContract() =
        PermissionController.createRequestPermissionResultContract()
}

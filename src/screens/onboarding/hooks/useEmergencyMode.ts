import { useState, useCallback } from 'react';
import { useOnboardingState } from './useOnboardingState';

/**
 * Emergency Mode Hook
 *
 * ONLY triggers on CRITICAL errors:
 * - Network timeout (> 30s)
 * - Permission request hangs
 * - Navigation complete failure
 *
 * NOT for normal errors:
 * - User denied permission
 * - Validation failures
 * - UI errors
 *
 * ✅ REMOVED: 30-second UI freeze detection
 * Why: If React stops rendering, the timer also stops running
 * Emergency mode now only triggered manually for critical errors
 */
export const useEmergencyMode = () => {
  const { setEmergencyMode: setOnboardingEmergencyMode, resetOnboarding } = useOnboardingState();
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [lastRenderTime] = useState(Date.now()); // Keep for backward compatibility

  const triggerEmergencyMode = useCallback(() => {
    console.error('[ONBOARDING] CRITICAL ERROR: Triggering emergency mode');
    setEmergencyMode(true);
    setOnboardingEmergencyMode(true);
  }, [setOnboardingEmergencyMode]);

  const recoverFromEmergency = useCallback(() => {
    console.log('[ONBOARDING] Recovering from emergency mode');
    setEmergencyMode(false);
    setOnboardingEmergencyMode(false);
  }, [setOnboardingEmergencyMode]);

  const skipOnboarding = useCallback(() => {
    console.log('[ONBOARDING] Skipping onboarding from emergency mode');
    resetOnboarding();
    recoverFromEmergency();
  }, [resetOnboarding, recoverFromEmergency]);

  return {
    isEmergencyMode: emergencyMode,
    lastRenderTime, // Keep for backward compatibility
    triggerEmergencyMode,
    recoverFromEmergency,
    skipOnboarding,
  };
};

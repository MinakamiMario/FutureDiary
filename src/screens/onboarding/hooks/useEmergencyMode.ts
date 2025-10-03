import { useState, useEffect, useCallback } from 'react';
import { useOnboardingState } from './useOnboardingState';

export const useEmergencyMode = () => {
  const { setEmergencyMode: setOnboardingEmergencyMode, resetOnboarding } = useOnboardingState();
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());

  // Update render time on each render
  useEffect(() => {
    setLastRenderTime(Date.now());
  });

  // Emergency mode detection - als UI niet meer update
  useEffect(() => {
    const emergencyTimer = setInterval(() => {
      const timeSinceLastRender = Date.now() - lastRenderTime;
      if (timeSinceLastRender > 30000) { // 30 seconden zonder render
        console.error(`[ONBOARDING] EMERGENCY: No render for ${timeSinceLastRender}ms`);
        setEmergencyMode(true);
      }
    }, 5000); // Check elke 5 seconden

    return () => clearInterval(emergencyTimer);
  }, [lastRenderTime]);

  const triggerEmergencyMode = useCallback(() => {
    console.log('[ONBOARDING] Triggering emergency mode');
    setEmergencyMode(true);
    setOnboardingEmergencyMode(true);
  }, [setOnboardingEmergencyMode]);

  const recoverFromEmergency = useCallback(() => {
    console.log('[ONBOARDING] Recovering from emergency mode');
    setEmergencyMode(false);
    setOnboardingEmergencyMode(false);
    setLastRenderTime(Date.now());
  }, [setOnboardingEmergencyMode]);

  const triggerUIReset = useCallback(() => {
    console.log('[ONBOARDING] Triggering UI reset from emergency mode');
    setLastRenderTime(Date.now());
    // Force a re-render by updating the time
    setTimeout(() => {
      setLastRenderTime(Date.now());
    }, 100);
  }, []);

  const skipOnboarding = useCallback(() => {
    console.log('[ONBOARDING] Skipping onboarding from emergency mode');
    resetOnboarding();
    recoverFromEmergency();
  }, [resetOnboarding, recoverFromEmergency]);

  return {
    isEmergencyMode: emergencyMode,
    lastRenderTime,
    triggerEmergencyMode,
    recoverFromEmergency,
    skipOnboarding,
    triggerUIReset,
  };
};
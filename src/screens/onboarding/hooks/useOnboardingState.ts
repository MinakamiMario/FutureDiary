import { useState, useCallback, useEffect } from 'react';
import { OnboardingState, UserSettings } from '../types/onboarding.types';
import { AI_MODEL_TYPES } from '../../../services/aiNarrativeService';
import { NARRATIVE_STYLES } from '../../../utils/narrativeStyles';

export const useOnboardingState = () => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    settings: {
      trackLocation: false,
      trackActivity: false,
      trackCalls: false,
      allowNotifications: false,
      preferredAIModel: AI_MODEL_TYPES.TEMPLATE,
      narrativeStyle: NARRATIVE_STYLES.STANDAARD,
    },
    permissions: {},
    isLoading: false,
    uiError: null,
    emergencyMode: false,
    permissionLoading: {},
  });

  const updateSetting = useCallback((key: keyof UserSettings | string, value: any) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value,
      },
    }));
  }, []);

  const updatePermission = useCallback((key: string, value: boolean) => {
    setState(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
    }));
  }, []);

  const setPermissionLoading = useCallback((key: string, loading: boolean) => {
    setState(prev => ({
      ...prev,
      permissionLoading: {
        ...prev.permissionLoading,
        [key]: loading,
      },
    }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, uiError: error }));
  }, []);

  const setUserData = useCallback((keyOrData: string | object, value?: any) => {
    if (typeof keyOrData === 'string' && value !== undefined) {
      // Handle key-value pair: setUserData('key', 'value')
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [keyOrData]: value,
        },
      }));
    } else if (typeof keyOrData === 'object' && keyOrData !== null) {
      // Handle object: setUserData({key: 'value'})
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...keyOrData,
        },
      }));
    }
  }, []);

  const setEmergencyMode = useCallback((emergency: boolean) => {
    setState(prev => ({ ...prev, emergencyMode: emergency }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      currentStep: 0,
      settings: {
        trackLocation: false,
        trackActivity: false,
        trackCalls: false,
        allowNotifications: false,
        preferredAIModel: AI_MODEL_TYPES.TEMPLATE,
        narrativeStyle: NARRATIVE_STYLES.STANDAARD,
      },
      permissions: {},
      isLoading: false,
      uiError: null,
      emergencyMode: false,
      permissionLoading: {},
    });
  }, []);

  return {
    currentStep: state.currentStep,
    userData: state.settings,
    isLoading: state.isLoading,
    permissions: state.permissions,
    uiError: state.uiError,
    emergencyMode: state.emergencyMode,
    permissionLoading: state.permissionLoading,
    setCurrentStep,
    setUserData: updateSetting,
    setIsLoading: setLoading,
    updatePermission,
    setPermissionLoading,
    setError,
    setEmergencyMode,
    resetOnboarding: resetState,
  };
};
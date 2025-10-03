// Main component
export { default as OnboardingScreen } from './OnboardingScreen';
export { default as OnboardingScreenWithErrorBoundary } from './OnboardingScreenWithErrorBoundary';

// Default export for backwards compatibility
export { default } from './OnboardingScreenWithErrorBoundary';

// Types
export type {
  OnboardingStep as OnboardingStepType,
  OnboardingOption,
  PermissionConfig,
  UserSettings,
  PermissionStatus,
  OnboardingState
} from './types/onboarding.types';

// Hooks
export { useOnboardingState } from './hooks/useOnboardingState';
export { usePermissionHandler } from './hooks/usePermissionHandler';
export { useEmergencyMode } from './hooks/useEmergencyMode';

// Components
export { OnboardingStep as OnboardingStepComponent } from './components/OnboardingStep';
export { StepSelection } from './components/StepSelection';
export { PermissionToggle } from './components/PermissionToggle';
export { OnboardingNavigation } from './components/OnboardingNavigation';
export { EmergencyMode } from './components/EmergencyMode';
export { OnboardingErrorBoundary } from './components/OnboardingErrorBoundary';

// Configuration
export { ONBOARDING_STEPS } from './config/onboardingConfig';
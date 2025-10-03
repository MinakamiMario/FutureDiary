export interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconColor?: string;
  type?: 'selection' | 'permission' | 'info' | 'welcome' | 'complete';
  setting?: string;
  key?: string;
  required?: boolean;
  options?: OnboardingOption[];
  permissions?: PermissionConfig[];
}

export interface OnboardingOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  recommended?: boolean;
  badge?: string;
}

export interface PermissionConfig {
  key?: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  permission: string;
  androidOnly?: boolean;
  required?: boolean;
}

export interface UserSettings {
  trackLocation: boolean;
  trackActivity: boolean;
  trackCalls: boolean;
  allowNotifications: boolean;
  preferredAIModel: string;
  narrativeStyle: string;
  // Allow dynamic keys for flexibility
  [key: string]: string | boolean | number;
}

export interface PermissionStatus {
  [key: string]: boolean;
}

export interface PermissionLoadingState {
  [key: string]: boolean;
}

export interface OnboardingState {
  currentStep: number;
  settings: UserSettings;
  permissions: PermissionStatus;
  isLoading: boolean;
  uiError: string | null;
  emergencyMode: boolean;
  permissionLoading: PermissionLoadingState;
}

export interface OnboardingScreenProps {
  onComplete: () => void;
}
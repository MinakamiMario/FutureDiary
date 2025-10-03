import React, { Component, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Typography from '../../../components/ui/Typography';
import Button from '../../../components/ui/Button';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Onboarding Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to crash reporting service in production
    if (__DEV__) {
      console.log('Development mode - Error details:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        stack: error.stack
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoBack = () => {
    // Try to reset navigation state or go back
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Icon 
              name="alert-circle-outline" 
              size={64} 
              color={Colors.error[500]} 
              style={styles.errorIcon}
            />
            
            <Typography variant="h4" color="text.primary" style={styles.errorTitle}>
              Er is iets misgegaan
            </Typography>
            
            <Typography variant="body1" color="text.secondary" style={styles.errorMessage}>
              Er is een fout opgetreden tijdens het laden van de onboarding. 
              Dit is waarschijnlijk tijdelijk.
            </Typography>

            {__DEV__ && this.state.error && (
              <TouchableOpacity 
                style={styles.debugContainer}
                onPress={() => console.log('Error details:', this.state.error, this.state.errorInfo)}
              >
                <Typography variant="caption" color="text.secondary" style={styles.debugText}>
                  Tik hier voor foutdetails (development)
                </Typography>
                <Typography variant="caption" color="text.secondary" numberOfLines={2}>
                  {this.state.error.toString()}
                </Typography>
              </TouchableOpacity>
            )}

            <View style={styles.buttonContainer}>
              <Button
                title="Probeer opnieuw"
                variant="primary"
                onPress={this.handleReset}
                style={styles.button}
                leftIcon={<Icon name="refresh-outline" size={20} color="white" />}
              />
              
              <Button
                title="Ga terug"
                variant="outline"
                onPress={this.handleGoBack}
                style={styles.button}
                leftIcon={<Icon name="arrow-back-outline" size={20} color={Colors.primary[500]} />}
              />
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  errorIcon: {
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  debugContainer: {
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  debugText: {
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginBottom: Spacing.md,
    width: '100%',
  },
});
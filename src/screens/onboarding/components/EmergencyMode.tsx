import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Typography from '../../../components/ui/Typography';
import Button from '../../../components/ui/Button';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface EmergencyModeProps {
  lastRenderTime: number;
  onRecovery: () => void;
  onSkip: () => void;
}

export const EmergencyMode = memo(({ lastRenderTime, onRecovery, onSkip }: EmergencyModeProps) => {
  return (
    <View style={styles.emergencyContainer}>
      <Icon name="warning-outline" size={64} color={Colors.warning[500]} />
      
      <Typography variant="h4" color="text.primary" weight="bold" style={styles.emergencyTitle}>
        Emergency Herstel Modus
      </Typography>
      
      <Typography variant="body1" color="text.secondary" weight="normal" style={styles.emergencyMessage}>
        De app reageert niet meer. Dit kan gebeuren na het verlenen van toestemmingen.
      </Typography>
      
      <Typography variant="body2" color="text.secondary" weight="normal" style={styles.emergencyInfo}>
        Laatste update: {new Date(lastRenderTime).toLocaleTimeString()}
      </Typography>
      
      <View style={styles.emergencyButtons}>
        <Button
          title="Herstel UI"
          variant="primary"
          onPress={onRecovery}
          style={styles.emergencyButton}
          textStyle={{}}
          leftIcon={<Icon name="refresh-outline" size={20} color="white" />}
          rightIcon={null}
        />
        
        <Button
          title="Sla Over"
          variant="outline"
          onPress={onSkip}
          style={styles.emergencyButton}
          textStyle={{}}
          leftIcon={<Icon name="skip-forward-outline" size={20} color={Colors.primary[500]} />}
          rightIcon={null}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.debugInfo}
        onPress={() => console.log('Emergency mode debug info:', { lastRenderTime })}
      >
        <Typography variant="caption" color={Colors.gray[500]} weight="normal" style={{}}>
          Debug info beschikbaar
        </Typography>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  emergencyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background.primary,
  },
  emergencyTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.warning[500],
  },
  emergencyMessage: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  emergencyInfo: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontSize: 12,
    color: Colors.gray[500],
  },
  emergencyButtons: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  emergencyButton: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  debugInfo: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
});
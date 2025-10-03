import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PermissionConfig } from '../types/onboarding.types';
import Typography from '../../../components/ui/Typography';
import { Colors, Spacing } from '../../../styles/designSystem';
// @ts-ignore - Vector icons without types
import Icon from 'react-native-vector-icons/Ionicons';

interface PermissionToggleProps {
  permission: PermissionConfig;
  isEnabled: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export const PermissionToggle = memo(({ permission, isEnabled, isLoading, onToggle }: PermissionToggleProps) => {
  return (
    <View style={styles.permissionCard}>
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIconContainer}>
          <Icon 
            name={permission.icon} 
            size={24} 
            color={isEnabled ? Colors.primary[500] : Colors.gray[400]} 
          />
        </View>
        <View style={styles.permissionContent}>
          <Typography variant="h6" color="text.primary" weight="normal" style={{}}>
            {permission.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" weight="normal" style={{}}>
            {permission.subtitle}
          </Typography>
          <Typography variant="caption" color="text.secondary" weight="normal" style={styles.permissionDescription}>
            {permission.description}
          </Typography>
          {permission.permission === 'location' && (
            <Typography variant="caption" color={Colors.warning[500]} weight="normal" style={styles.permissionWarning}>
              ⚠️ Je wordt naar de systeem instellingen gebracht
            </Typography>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.permissionToggle,
            isEnabled && styles.permissionToggleActive,
            isLoading && styles.permissionToggleLoading
          ]}
          onPress={onToggle}
          disabled={isLoading}
          accessible={true}
          accessibilityLabel={`${permission.title} ${isEnabled ? 'uitschakelen' : 'inschakelen'}`}
          accessibilityRole="switch"
          accessibilityState={{ checked: isEnabled, disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : isEnabled ? (
            <Icon name="checkmark" size={16} color={Colors.white} />
          ) : (
            <View 
              style={[
                styles.permissionToggleKnob,
                isEnabled && styles.permissionToggleKnobActive
              ]}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  permissionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permissionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permissionContent: {
    flex: 1,
  },
  permissionDescription: {
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  permissionWarning: {
    marginTop: Spacing.xs,
    fontSize: 11,
    fontWeight: '500',
  },
  permissionToggle: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[300],
    padding: 2,
    justifyContent: 'center',
  },
  permissionToggleActive: {
    backgroundColor: Colors.primary[500],
  },
  permissionToggleLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  permissionToggleKnobActive: {
    alignSelf: 'flex-end',
  },
});
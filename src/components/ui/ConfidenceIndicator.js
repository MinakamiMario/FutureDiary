// src/components/ui/ConfidenceIndicator.js
// Visual confidence indicators for data reliability

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Spacing, Typography as DesignTypography, BorderRadius } from '../../styles/designSystem';
import { getSafeColor, SafeColors } from '../../utils/safeColors';

const ConfidenceIndicator = ({ 
  confidence, 
  source, 
  lineageId,
  onPress,
  showDetails = false,
  style = {},
  size = 'medium' // 'small', 'medium', 'large'
}) => {
  
  const getConfidenceConfig = (confidence) => {
    if (confidence >= 0.9) {
      return {
        level: 'high',
        color: getSafeColor('success.500'),
        backgroundColor: getSafeColor('success.50'),
        icon: 'checkmark-circle',
        text: 'Betrouwbaar',
        description: 'Hoge betrouwbaarheid - directe sensor data'
      };
    } else if (confidence >= 0.7) {
      return {
        level: 'medium',
        color: getSafeColor('warning.500'),
        backgroundColor: getSafeColor('warning.50'),
        icon: 'warning',
        text: 'Schatting',
        description: 'Gemiddelde betrouwbaarheid - gecombineerde bronnen'
      };
    } else {
      return {
        level: 'low',
        color: getSafeColor('error.500'),
        backgroundColor: getSafeColor('error.50'),
        icon: 'alert-circle',
        text: 'Onzeker',
        description: 'Lage betrouwbaarheid - beperkte data beschikbaar'
      };
    }
  };

  const getSizeConfig = (size) => {
    const configs = {
      small: {
        iconSize: 12,
        textSize: DesignTypography.label.small,
        padding: Spacing.xs,
        dotSize: 8
      },
      medium: {
        iconSize: 16,
        textSize: DesignTypography.body.small,
        padding: Spacing.sm,
        dotSize: 10
      },
      large: {
        iconSize: 20,
        textSize: DesignTypography.body.medium,
        padding: Spacing.md,
        dotSize: 12
      }
    };
    return configs[size] || configs.medium;
  };

  const confidenceConfig = getConfidenceConfig(confidence);
  const sizeConfig = getSizeConfig(size);

  const formatConfidence = (confidence) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getSourceDisplayName = (source) => {
    const sourceNames = {
      'samsung_health': 'Samsung Health',
      'strava': 'Strava',
      'activity_service': 'Activiteit Sensor',
      'location_service': 'GPS',
      'app_usage': 'Schermtijd',
      'call_logs': 'Oproepen'
    };
    return sourceNames[source] || source;
  };

  const renderCompactIndicator = () => (
    <View style={[styles.compactContainer, { backgroundColor: confidenceConfig.backgroundColor }, style]}>
      <View 
        style={[
          styles.confidenceDot, 
          { 
            backgroundColor: confidenceConfig.color,
            width: sizeConfig.dotSize,
            height: sizeConfig.dotSize,
            borderRadius: sizeConfig.dotSize / 2
          }
        ]} 
      />
      {showDetails && (
        <Text style={[sizeConfig.textSize, { color: confidenceConfig.color, marginLeft: Spacing.xs }]}>
          {formatConfidence(confidence)}
        </Text>
      )}
    </View>
  );

  const renderDetailedIndicator = () => (
    <TouchableOpacity 
      style={[styles.detailedContainer, { backgroundColor: confidenceConfig.backgroundColor }, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.indicatorHeader}>
        <Ionicons 
          name={confidenceConfig.icon} 
          size={sizeConfig.iconSize} 
          color={confidenceConfig.color} 
        />
        <Text style={[sizeConfig.textSize, { color: confidenceConfig.color, marginLeft: Spacing.xs }]}>
          {confidenceConfig.text}
        </Text>
        <Text style={[styles.confidencePercentage, sizeConfig.textSize, { color: confidenceConfig.color }]}>
          {formatConfidence(confidence)}
        </Text>
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={[styles.sourceText, DesignTypography.label.small]}>
            Bron: {getSourceDisplayName(source)}
          </Text>
          <Text style={[styles.descriptionText, DesignTypography.label.small]}>
            {confidenceConfig.description}
          </Text>
          {lineageId && (
            <Text style={[styles.lineageText, DesignTypography.label.small]}>
              ID: {lineageId.substring(0, 8)}...
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return showDetails ? renderDetailedIndicator() : renderCompactIndicator();
};

// Enhanced data card with confidence indicator
export const DataCardWithConfidence = ({ 
  title, 
  value, 
  unit = '', 
  confidence, 
  source, 
  lineageId,
  onConfidencePress,
  icon,
  style = {} 
}) => {
  return (
    <View style={[styles.dataCard, style]}>
      <View style={styles.dataCardHeader}>
        <View style={styles.dataCardTitleContainer}>
          {icon && <Ionicons name={icon} size={20} color={getSafeColor('primary.500')} />}
          <Text style={styles.dataCardTitle}>{title}</Text>
        </View>
        <ConfidenceIndicator 
          confidence={confidence}
          source={source}
          lineageId={lineageId}
          onPress={onConfidencePress}
          size="small"
        />
      </View>
      
      <View style={styles.dataCardContent}>
        <Text style={styles.dataCardValue}>
          {value}
          {unit && <Text style={styles.dataCardUnit}> {unit}</Text>}
        </Text>
      </View>
    </View>
  );
};

// Confidence legend component
export const ConfidenceLegend = ({ visible, onClose }) => {
  if (!visible) return null;

  const legendItems = [
    {
      confidence: 0.95,
      title: 'Hoge Betrouwbaarheid',
      description: 'Directe sensor data van betrouwbare bronnen zoals Samsung Health'
    },
    {
      confidence: 0.75,
      title: 'Gemiddelde Betrouwbaarheid', 
      description: 'Gecombineerde data van meerdere bronnen met validatie'
    },
    {
      confidence: 0.50,
      title: 'Lage Betrouwbaarheid',
      description: 'Geschatte waarden op basis van beperkte data'
    }
  ];

  return (
    <View style={styles.legendOverlay}>
      <View style={styles.legendContainer}>
        <View style={styles.legendHeader}>
          <Text style={styles.legendTitle}>Betrouwbaarheid Indicator</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={getSafeColor('gray.600')} />
          </TouchableOpacity>
        </View>
        
        {legendItems.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <ConfidenceIndicator 
              confidence={item.confidence}
              source="legend"
              size="medium"
              showDetails={false}
            />
            <View style={styles.legendItemText}>
              <Text style={styles.legendItemTitle}>{item.title}</Text>
              <Text style={styles.legendItemDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
        
        <Text style={styles.legendFooter}>
          Tip: Tik op een indicator voor meer details over de databron
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact indicator styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  
  confidenceDot: {
    borderRadius: 50,
  },

  // Detailed indicator styles
  detailedContainer: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: getSafeColor('gray.200'),
  },

  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  confidencePercentage: {
    marginLeft: 'auto',
    fontWeight: 'bold',
  },

  detailsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: getSafeColor('gray.200'),
  },

  sourceText: {
    color: getSafeColor('gray.600'),
    marginBottom: Spacing.xs,
  },

  descriptionText: {
    color: getSafeColor('gray.500'),
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },

  lineageText: {
    color: getSafeColor('gray.400'),
    fontFamily: 'monospace',
  },

  // Data card styles
  dataCard: {
    backgroundColor: getSafeColor('white'),
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  dataCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dataCardTitle: {
    ...DesignTypography.body.medium,
    color: getSafeColor('gray.700'),
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },

  dataCardContent: {
    alignItems: 'flex-start',
  },

  dataCardValue: {
    ...DesignTypography.headline.large,
    color: getSafeColor('gray.900'),
    fontWeight: 'bold',
  },

  dataCardUnit: {
    ...DesignTypography.body.medium,
    color: getSafeColor('gray.600'),
    fontWeight: 'normal',
  },

  // Legend styles
  legendOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  legendContainer: {
    backgroundColor: getSafeColor('white'),
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxWidth: 340,
  },

  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },

  legendTitle: {
    ...DesignTypography.title.large,
    color: getSafeColor('gray.900'),
    fontWeight: 'bold',
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },

  legendItemText: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  legendItemTitle: {
    ...DesignTypography.body.medium,
    color: getSafeColor('gray.900'),
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },

  legendItemDescription: {
    ...DesignTypography.body.small,
    color: getSafeColor('gray.600'),
    lineHeight: 18,
  },

  legendFooter: {
    ...DesignTypography.label.small,
    color: getSafeColor('gray.500'),
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});

export default ConfidenceIndicator;
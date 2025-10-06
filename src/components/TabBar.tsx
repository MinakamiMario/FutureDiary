import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

interface TabBarProps {
  screens: Array<{name: string; icon: string}>;
  activeTab: number;
  onTabPress: (index: number) => void;
}

const TabBar: React.FC<TabBarProps> = ({screens, activeTab, onTabPress}) => {
  return (
    <View style={styles.container}>
      {screens.map((screen, index) => (
        <TouchableOpacity
          key={`tab-${screen.name}-${index}`}
          style={[styles.tab, activeTab === index && styles.activeTab]}
          onPress={() => onTabPress(index)}>
          <Text style={[styles.icon, activeTab === index && styles.activeIcon]}>
            {screen.icon}
          </Text>
          <Text
            style={[styles.label, activeTab === index && styles.activeLabel]}>
            {screen.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
    opacity: 0.6,
  },
  activeIcon: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#4a90e2',
    fontWeight: '600',
  },
});

export default TabBar;

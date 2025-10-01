// screens/narrativeStyleScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NARRATIVE_STYLES = {
  STANDARD: 'standard',
  DETAILED: 'detailed', 
  CASUAL: 'casual',
  PROFESSIONAL: 'professional',
  POETIC: 'poetic'
};

const STYLE_OPTIONS = [
  {
    id: NARRATIVE_STYLES.STANDARD,
    name: 'Standaard',
    description: 'Eenvoudige, duidelijke verhalen met de belangrijkste gebeurtenissen van de dag.',
    icon: 'document-text-outline',
    example: '"Vandaag liep je 8.547 stappen en bezocht verschillende locaties..."'
  },
  {
    id: NARRATIVE_STYLES.DETAILED,
    name: 'Gedetailleerd',
    description: 'Uitgebreide verhalen met meer context en analyse van je activiteiten.',
    icon: 'library-outline',
    example: '"Je dag begon vroeg met een energieke wandeling door de buurt. Later..."'
  },
  {
    id: NARRATIVE_STYLES.CASUAL,
    name: 'Casual',
    description: 'Informele, vriendelijke verhalen alsof een vriend je dag samenvat.',
    icon: 'happy-outline',
    example: '"Hey! Wat een actieve dag had je vandaag. Je was lekker onderweg..."'
  },
  {
    id: NARRATIVE_STYLES.PROFESSIONAL,
    name: 'Professioneel', 
    description: 'Formele, objectieve samenvattingen van je dagelijkse activiteiten.',
    icon: 'briefcase-outline',
    example: '"Activiteitenrapport: Totaal 8.547 stappen geregistreerd. Locaties bezocht..."'
  },
  {
    id: NARRATIVE_STYLES.POETIC,
    name: 'Poëtisch',
    description: 'Creatieve, beeldende verhalen die je dag tot leven brengen.',
    icon: 'flower-outline',
    example: '"Zoals de zon opkwam, begon jouw reis door de dag met elke stap..."'
  }
];

const NarrativeStyleScreen = ({ navigation }) => {
  const [selectedStyle, setSelectedStyle] = useState(NARRATIVE_STYLES.STANDARD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentStyle();
  }, []);

  const loadCurrentStyle = async () => {
    try {
      setLoading(true);
      const savedStyle = await AsyncStorage.getItem('narrativeStyle');
      if (savedStyle && STYLE_OPTIONS.find(option => option.id === savedStyle)) {
        setSelectedStyle(savedStyle);
      }
    } catch (error) {
      console.error('Error loading narrative style:', error);
      Alert.alert('Fout', 'Er is een fout opgetreden bij het laden van je verhalende stijl.');
    } finally {
      setLoading(false);
    }
  };

  const handleStyleSelection = async (styleId) => {
    try {
      setSaving(true);
      
      // Sla de nieuwe stijl op
      await AsyncStorage.setItem('narrativeStyle', styleId);
      setSelectedStyle(styleId);
      
      const selectedOption = STYLE_OPTIONS.find(option => option.id === styleId);
      
      Alert.alert(
        'Stijl opgeslagen',
        `Je verhalen zullen nu worden gegenereerd in "${selectedOption.name}" stijl.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving narrative style:', error);
      Alert.alert('Fout', 'Er is een fout opgetreden bij het opslaan van je stijlvoorkeur.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={styles.loadingText}>Instellingen laden...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Verhalende Stijl</Text>
        
        <Text style={styles.description}>
          Kies hoe je dagverhalen worden geschreven. Elke stijl heeft een eigen toon en niveau van detail.
        </Text>
        
        <View style={styles.optionsContainer}>
          {STYLE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedStyle === option.id && styles.selectedCard
              ]}
              onPress={() => handleStyleSelection(option.id)}
              disabled={saving}
            >
              <View style={styles.optionHeader}>
                <Ionicons name={option.icon} size={24} color="#4F8EF7" />
                <Text style={styles.optionTitle}>{option.name}</Text>
                {selectedStyle === option.id && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#4F8EF7" />
                  </View>
                )}
              </View>
              
              <Text style={styles.optionDescription}>{option.description}</Text>
              
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleLabel}>Voorbeeld:</Text>
                <Text style={styles.exampleText}>{option.example}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#4F8EF7" />
            <Text style={styles.infoHeaderText}>Over verhalende stijlen</Text>
          </View>
          <Text style={styles.infoText}>
            • Je gekozen stijl wordt toegepast op alle nieuwe dagverhalen
          </Text>
          <Text style={styles.infoText}>
            • Bestaande verhalen behouden hun oorspronkelijke stijl
          </Text>
          <Text style={styles.infoText}>
            • Je kunt je stijl op elk moment wijzigen
          </Text>
          <Text style={styles.infoText}>
            • De stijl werkt met alle AI-modellen (Template, Claude, ChatGPT)
          </Text>
        </View>
        
        {saving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator size="small" color="#4F8EF7" />
            <Text style={styles.savingText}>Opslaan...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4F8EF7',
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.2,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 12,
  },
  exampleContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F8EF7',
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F8EF7',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  exampleText: {
    fontSize: 14,
    color: '#2C3E50',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#EBF3FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 6,
    lineHeight: 20,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  savingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4F8EF7',
  },
});

export default NarrativeStyleScreen;
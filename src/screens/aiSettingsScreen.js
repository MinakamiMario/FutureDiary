// screens/aiSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { 
  getPreferredAIModel, 
  setPreferredAIModel,
  isApiKeyAvailable,
  AI_MODEL_TYPES,
  setApiKey,
  getApiKey,
  isBrowserContext
} from '../services/aiNarrativeService';
import oauthService from '../services/oauthService';

const AISettingsScreen = ({ navigation }) => {
  const [selectedModel, setSelectedModel] = useState(AI_MODEL_TYPES.TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [isClaudeAvailable, setIsClaudeAvailable] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Laad het huidige model
      const model = await getPreferredAIModel();
      setSelectedModel(model);
      
      // Controleer beschikbaarheid van Claude API key
      const claudeAvailable = await isApiKeyAvailable(AI_MODEL_TYPES.CLAUDE);
      setIsClaudeAvailable(claudeAvailable);
      
      // Laad eventueel opgeslagen Claude sleutel (gemaskeerd weergeven in de UI)
      const claudeKey = await getApiKey('claude_api_key');
      if (claudeKey) setClaudeApiKey('•'.repeat(Math.min(claudeKey.length, 20)));
    } catch (error) {
      console.error('Error loading AI settings:', error);
      Alert.alert('Fout', 'Er is een fout opgetreden bij het laden van de AI-instellingen.');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelection = async (model) => {
    try {
      // ChatGPT is nu automatisch beschikbaar
      if (model === AI_MODEL_TYPES.CHATGPT) {
        // Geen extra controles nodig, ChatGPT is automatisch geconfigureerd
      }

      if (model === AI_MODEL_TYPES.CLAUDE) {
        if (!isClaudeAvailable) {
          Alert.alert(
            'API-sleutel vereist',
            'Om Claude te gebruiken, moet je een geldige API-sleutel invoeren.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      await proceedWithSelection(model);
    } catch (error) {
      console.error('Error selecting model:', error);
      Alert.alert('Fout', 'Er is een fout opgetreden bij het selecteren van het model.');
    }
  };

  const proceedWithSelection = async (model) => {
    setSelectedModel(model);
    await setPreferredAIModel(model);
    
    const modelNames = {
      [AI_MODEL_TYPES.TEMPLATE]: 'Eenvoudige Sjablonen',
      [AI_MODEL_TYPES.WEBLLM]: 'WebLLM (Lokale AI)',
      [AI_MODEL_TYPES.CLAUDE]: 'Claude AI',
      [AI_MODEL_TYPES.CHATGPT]: 'ChatGPT'
    };
    
    Alert.alert(
      'Model geselecteerd',
      `${modelNames[model]} is nu actief voor het genereren van je verhalen.`,
      [{ text: 'OK' }]
    );
  };


  const saveApiKeys = async () => {
    try {
      setSavingKeys(true);
      let successCount = 0;
      let totalKeys = 0;

      // Save Claude API key
      if (claudeApiKey && !claudeApiKey.includes('•')) {
        totalKeys++;
        const success = await setApiKey('claude_api_key', claudeApiKey);
        if (success) {
          successCount++;
          setIsClaudeAvailable(true);
          setClaudeApiKey('•'.repeat(Math.min(claudeApiKey.length, 20)));
        }
      }


      if (totalKeys === 0) {
        Alert.alert('Geen wijzigingen', 'Er zijn geen nieuwe API-sleutels om op te slaan.');
      } else if (successCount === totalKeys) {
        Alert.alert('✅ Succes!', `${successCount} API-sleutel(s) succesvol opgeslagen.`);
      } else {
        Alert.alert('⚠️ Gedeeltelijk succes', `${successCount} van ${totalKeys} API-sleutel(s) opgeslagen.`);
      }
    } catch (error) {
      console.error('Error saving API keys:', error);
      Alert.alert('Fout', 'Er is een fout opgetreden bij het opslaan van de API-sleutels.');
    } finally {
      setSavingKeys(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>AI-instellingen laden...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior="height"
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Model Selection */}
        <Text style={styles.sectionTitle}>Kies je AI-model</Text>
        <Text style={styles.sectionDescription}>
          Kies tussen verschillende AI-modellen voor het genereren van je dagverhalen.
        </Text>

        {/* Template Model */}
        <TouchableOpacity 
          style={[styles.modelCard, selectedModel === AI_MODEL_TYPES.TEMPLATE && styles.selectedCard]}
          onPress={() => handleModelSelection(AI_MODEL_TYPES.TEMPLATE)}
        >
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Icon name="document-text-outline" size={24} color={selectedModel === AI_MODEL_TYPES.TEMPLATE ? "#0066cc" : "#666"} />
              <Text style={[styles.modelTitle, selectedModel === AI_MODEL_TYPES.TEMPLATE && styles.selectedTitle]}>
                Eenvoudige Sjablonen
              </Text>
              <View style={[styles.badge, styles.defaultBadge]}>
                <Text style={styles.badgeText}>Standaard</Text>
              </View>
            </View>
            <View style={styles.modelStatus}>
              <Icon name="checkmark-circle" size={16} color="#00aa00" />
              <Text style={styles.statusText}>Altijd beschikbaar</Text>
            </View>
          </View>
          <Text style={styles.modelDescription}>
            Snelle verhalen zonder internetverbinding. Gebruikt vooraf gemaakte sjablonen.
          </Text>
        </TouchableOpacity>

        {/* WebLLM Model - Now available in React Native through WebView bridge */}
        <TouchableOpacity 
          style={[styles.modelCard, selectedModel === AI_MODEL_TYPES.WEBLLM && styles.selectedCard]}
          onPress={() => handleModelSelection(AI_MODEL_TYPES.WEBLLM)}
        >
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Icon name="hardware-chip-outline" size={24} color={selectedModel === AI_MODEL_TYPES.WEBLLM ? "#0066cc" : "#666"} />
              <Text style={[styles.modelTitle, selectedModel === AI_MODEL_TYPES.WEBLLM && styles.selectedTitle]}>
                WebLLM (Lokale AI)
              </Text>
              <View style={[styles.badge, styles.freeBadge]}>
                <Text style={styles.badgeText}>Gratis</Text>
              </View>
            </View>
            <View style={styles.modelStatus}>
              <Icon name="checkmark-circle" size={16} color="#00aa00" />
              <Text style={styles.statusText}>{isBrowserContext() ? 'Geen API key nodig' : 'Lokaal via WebView'}</Text>
            </View>
          </View>
          <Text style={styles.modelDescription}>
            {isBrowserContext() 
              ? 'Geavanceerde AI die lokaal draait. Geen internetverbinding of API key vereist.'
              : 'Geavanceerde AI via WebView bridge. Geen internetverbinding of API key vereist.'
            }
          </Text>
        </TouchableOpacity>

        {/* Claude Model */}
        <TouchableOpacity 
          style={[styles.modelCard, selectedModel === AI_MODEL_TYPES.CLAUDE && styles.selectedCard]}
          onPress={() => handleModelSelection(AI_MODEL_TYPES.CLAUDE)}
        >
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Icon name="sparkles-outline" size={24} color={selectedModel === AI_MODEL_TYPES.CLAUDE ? "#0066cc" : "#666"} />
              <Text style={[styles.modelTitle, selectedModel === AI_MODEL_TYPES.CLAUDE && styles.selectedTitle]}>
                Claude AI
              </Text>
              <View style={[styles.badge, styles.premiumBadge]}>
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            </View>
            <View style={styles.modelStatus}>
              {isClaudeAvailable ? (
                <>
                  <Icon name="checkmark-circle" size={16} color="#00aa00" />
                  <Text style={styles.statusText}>Beschikbaar</Text>
                </>
              ) : (
                <>
                  <Icon name="key-outline" size={16} color="#ff9900" />
                  <Text style={styles.statusText}>API key vereist</Text>
                </>
              )}
            </View>
          </View>
          <Text style={styles.modelDescription}>
            Geavanceerde verhalen van Anthropic's Claude. Vereist API key.
          </Text>
        </TouchableOpacity>

        {/* ChatGPT Model */}
        <TouchableOpacity 
          style={[styles.modelCard, selectedModel === AI_MODEL_TYPES.CHATGPT && styles.selectedCard]}
          onPress={() => handleModelSelection(AI_MODEL_TYPES.CHATGPT)}
        >
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Icon name="chatbubbles-outline" size={24} color={selectedModel === AI_MODEL_TYPES.CHATGPT ? "#0066cc" : "#666"} />
              <Text style={[styles.modelTitle, selectedModel === AI_MODEL_TYPES.CHATGPT && styles.selectedTitle]}>
                ChatGPT
              </Text>
              <View style={[styles.badge, styles.premiumBadge]}>
                <Text style={styles.badgeText}>Premium</Text>
              </View>
            </View>
            <View style={styles.modelStatus}>
              <Icon name="checkmark-circle" size={16} color="#00aa00" />
              <Text style={styles.statusText}>Beschikbaar</Text>
            </View>
          </View>
          <Text style={styles.modelDescription}>
            Intelligente verhalen van OpenAI's ChatGPT. Automatisch beschikbaar.
          </Text>
        </TouchableOpacity>

        {/* API Keys Section */}
        <Text style={styles.sectionTitle}>Claude API-sleutel</Text>
        <Text style={styles.sectionDescription}>
          Voeg optioneel je Claude API-sleutel toe voor verhalen van Anthropic.
        </Text>

        {/* OpenAI Status Section */}
        <View style={styles.oauthSection}>
          <Text style={styles.inputLabel}>OpenAI Integration</Text>
          <View style={styles.loggedInContainer}>
            <View style={styles.loggedInStatus}>
              <Icon name="checkmark-circle" size={20} color="#00aa00" />
              <Text style={styles.loggedInText}>Automatisch geconfigureerd</Text>
            </View>
            <Text style={styles.statusDescription}>
              ChatGPT en GPT-5-nano zijn klaar voor gebruik
            </Text>
          </View>
        </View>

        {/* Claude API Key */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Claude API-sleutel</Text>
          <TextInput
            style={styles.input}
            value={claudeApiKey}
            onChangeText={setClaudeApiKey}
            placeholder="sk-ant-... (optioneel)"
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>


        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveApiKeys}
          disabled={savingKeys}
        >
          {savingKeys ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Claude API-sleutel opslaan</Text>
          )}
        </TouchableOpacity>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Hulp nodig?</Text>
          <Text style={styles.helpText}>
            • Eenvoudige Sjablonen en WebLLM zijn altijd gratis{'\n'}
            • Claude API key: krijg je bij console.anthropic.com{'\n'}
            • OpenAI: automatisch geconfigureerd voor ChatGPT en GPT-5-nano
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#0066cc',
    backgroundColor: '#f0f8ff',
  },
  modelHeader: {
    marginBottom: 8,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  selectedTitle: {
    color: '#0066cc',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadge: {
    backgroundColor: '#666',
  },
  freeBadge: {
    backgroundColor: '#00aa00',
  },
  premiumBadge: {
    backgroundColor: '#ff9900',
  },
  unavailableBadge: {
    backgroundColor: '#999',
  },
  badgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  unavailableCard: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    opacity: 0.7,
  },
  unavailableTitle: {
    color: '#999',
  },
  modelStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  oauthSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loggedInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loggedInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loggedInText: {
    fontSize: 16,
    color: '#00aa00',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#0066cc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default AISettingsScreen;
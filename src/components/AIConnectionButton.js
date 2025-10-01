// src/components/AIConnectionButton.js
// User-friendly AI services connection component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import aiNarrativeService, { AI_MODEL_TYPES } from '../services/aiNarrativeService';

const AIConnectionButton = ({ onConnectionChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODEL_TYPES.TEMPLATE);
  const [apiKeys, setApiKeys] = useState({
    claude: '',
    openai: ''
  });
  const [connectionStatus, setConnectionStatus] = useState({
    claude: false,
    openai: false,
    preferredModel: AI_MODEL_TYPES.TEMPLATE
  });

  useEffect(() => {
    // Check current connection status when component mounts
    updateConnectionStatus();
  }, []);

  const updateConnectionStatus = async () => {
    try {
      const [claudeAvailable, openaiAvailable, preferredModel] = await Promise.all([
        aiNarrativeService.isApiKeyAvailable(AI_MODEL_TYPES.CLAUDE),
        aiNarrativeService.isApiKeyAvailable(AI_MODEL_TYPES.CHATGPT),
        aiNarrativeService.getPreferredAIModel()
      ]);

      const status = {
        claude: claudeAvailable,
        openai: openaiAvailable,
        preferredModel: preferredModel
      };

      setConnectionStatus(status);
      setSelectedModel(preferredModel);

      if (onConnectionChange) {
        onConnectionChange(status);
      }
    } catch (error) {
      console.error('Error checking AI connection status:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsConnecting(true);
    let success = true;

    try {
      // Save Claude API key if provided
      if (apiKeys.claude.trim()) {
        const claudeSuccess = await aiNarrativeService.setApiKey('claude_api_key', apiKeys.claude.trim());
        if (!claudeSuccess) {
          Alert.alert('Fout', 'Ongeldige Claude API key format');
          success = false;
        }
      }

      // Save OpenAI API key if provided
      if (apiKeys.openai.trim()) {
        const openaiSuccess = await aiNarrativeService.setApiKey('openai_api_key', apiKeys.openai.trim());
        if (!openaiSuccess) {
          Alert.alert('Fout', 'Ongeldige OpenAI API key format');
          success = false;
        }
      }

      // Save preferred model
      await aiNarrativeService.setPreferredAIModel(selectedModel);

      if (success) {
        setShowConfig(false);
        setApiKeys({ claude: '', openai: '' });
        await updateConnectionStatus();
      }
    } catch (error) {
      Alert.alert('Fout', 'Er ging iets mis bij het opslaan van de configuratie');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveKey = (keyType) => {
    const serviceName = keyType === 'claude_api_key' ? 'Claude AI' : 'ChatGPT';
    
    Alert.alert(
      `${serviceName} Verwijderen?`,
      'Je API-sleutel wordt verwijderd. Bestaande dagboeken blijven bewaard.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            const success = await aiNarrativeService.removeApiKey(keyType);
            if (success) {
              await updateConnectionStatus();
            }
          }
        }
      ]
    );
  };

  const getModelDisplayName = (modelType) => {
    switch (modelType) {
      case AI_MODEL_TYPES.CLAUDE:
        return 'Claude AI';
      case AI_MODEL_TYPES.CHATGPT:
        return 'ChatGPT';
      case AI_MODEL_TYPES.WEBLLM:
        return 'WebLLM (Lokaal)';
      case AI_MODEL_TYPES.TEMPLATE:
      default:
        return 'Standaard Sjablonen';
    }
  };

  const getModelIcon = (modelType) => {
    switch (modelType) {
      case AI_MODEL_TYPES.CLAUDE:
        return 'chatbubbles';
      case AI_MODEL_TYPES.CHATGPT:
        return 'chatbubbles-outline';
      case AI_MODEL_TYPES.WEBLLM:
        return 'hardware-chip';
      case AI_MODEL_TYPES.TEMPLATE:
      default:
        return 'document-text';
    }
  };

  const hasAnyConnection = connectionStatus.claude || connectionStatus.openai;

  return (
    <View style={styles.container}>
      <View style={[styles.card, hasAnyConnection && styles.connectedCard]}>
        <View style={styles.header}>
          <Ionicons 
            name={hasAnyConnection ? "checkmark-circle" : "construct"} 
            size={32} 
            color={hasAnyConnection ? "#00D924" : "#4F8EF7"} 
          />
          <View style={styles.headerInfo}>
            <Text style={styles.title}>
              {hasAnyConnection ? 'AI Dagboek Actief' : 'AI Dagboek Instellen'}
            </Text>
            <Text style={styles.subtitle}>
              Huidige methode: {getModelDisplayName(connectionStatus.preferredModel)}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          {hasAnyConnection 
            ? 'AI genereert automatisch persoonlijke dagboeken op basis van je activiteiten.'
            : 'Configureer AI services om automatisch dagboeken te laten genereren.'
          }
        </Text>

        {hasAnyConnection && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Beschikbare Services:</Text>
            <View style={styles.statusRow}>
              {connectionStatus.claude && (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.statusText}>Claude AI</Text>
                </View>
              )}
              {connectionStatus.openai && (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.statusText}>ChatGPT</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.configButton]}
            onPress={() => setShowConfig(true)}
          >
            <Ionicons name="settings" size={16} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {hasAnyConnection ? 'Instellingen' : 'Instellen'}
            </Text>
          </TouchableOpacity>

          {hasAnyConnection && (
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={() => {
                Alert.alert(
                  '🤖 AI Test',
                  'Test je AI configuratie door een dagboek te genereren in het Journal scherm.',
                  [{ text: 'Begrepen' }]
                );
              }}
            >
              <Ionicons name="flask" size={16} color="#4F8EF7" />
              <Text style={[styles.buttonText, { color: '#4F8EF7' }]}>Test</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Configuration Modal */}
      <Modal
        visible={showConfig}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Services Configureren</Text>
            <TouchableOpacity
              onPress={() => setShowConfig(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Voorkeursmodel</Text>
            <Text style={styles.sectionDescription}>
              Kies welk AI model je wilt gebruiken voor dagboek generatie:
            </Text>

            <View style={styles.modelOptions}>
              {Object.values(AI_MODEL_TYPES).map((modelType) => (
                <TouchableOpacity
                  key={modelType}
                  style={[
                    styles.modelOption,
                    selectedModel === modelType && styles.selectedModelOption
                  ]}
                  onPress={() => setSelectedModel(modelType)}
                >
                  <Ionicons
                    name={getModelIcon(modelType)}
                    size={24}
                    color={selectedModel === modelType ? "#4F8EF7" : "#666"}
                  />
                  <View style={styles.modelInfo}>
                    <Text style={[
                      styles.modelName,
                      selectedModel === modelType && styles.selectedModelName
                    ]}>
                      {getModelDisplayName(modelType)}
                    </Text>
                    <Text style={styles.modelDescription}>
                      {modelType === AI_MODEL_TYPES.CLAUDE && 'Hoogwaardige AI van Anthropic'}
                      {modelType === AI_MODEL_TYPES.CHATGPT && 'OpenAI\'s ChatGPT model'}
                      {modelType === AI_MODEL_TYPES.WEBLLM && 'Lokaal model, geen internet nodig'}
                      {modelType === AI_MODEL_TYPES.TEMPLATE && 'Eenvoudige sjabloon methode'}
                    </Text>
                  </View>
                  {selectedModel === modelType && (
                    <Ionicons name="checkmark-circle" size={20} color="#4F8EF7" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* API Key Configuration */}
            {(selectedModel === AI_MODEL_TYPES.CLAUDE || selectedModel === AI_MODEL_TYPES.CHATGPT) && (
              <>
                <Text style={styles.sectionTitle}>API Sleutels</Text>
                <Text style={styles.sectionDescription}>
                  Voer je API sleutel in voor het geselecteerde model:
                </Text>

                {selectedModel === AI_MODEL_TYPES.CLAUDE && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Claude AI API Key</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="sk-ant-api03-..."
                      value={apiKeys.claude}
                      onChangeText={(text) => setApiKeys(prev => ({ ...prev, claude: text }))}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    {connectionStatus.claude && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveKey('claude_api_key')}
                      >
                        <Text style={styles.removeButtonText}>Verwijderen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {selectedModel === AI_MODEL_TYPES.CHATGPT && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>OpenAI API Key</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="sk-..."
                      value={apiKeys.openai}
                      onChangeText={(text) => setApiKeys(prev => ({ ...prev, openai: text }))}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                    {connectionStatus.openai && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveKey('openai_api_key')}
                      >
                        <Text style={styles.removeButtonText}>Verwijderen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.helpContainer}>
                  <Ionicons name="information-circle" size={20} color="#4F8EF7" />
                  <Text style={styles.helpText}>
                    API sleutels worden veilig versleuteld opgeslagen op je apparaat.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowConfig(false)}
            >
              <Text style={styles.cancelButtonText}>Annuleren</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, isConnecting && styles.disabledButton]}
              onPress={handleSaveConfig}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Opslaan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  connectedCard: {
    backgroundColor: '#F8FFF9',
    borderColor: '#00D924',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    backgroundColor: '#00D924',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  configButton: {
    backgroundColor: '#4F8EF7',
  },
  testButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4F8EF7',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  modelOptions: {
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedModelOption: {
    borderColor: '#4F8EF7',
    backgroundColor: '#F0F7FF',
  },
  modelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedModelName: {
    color: '#4F8EF7',
  },
  modelDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#4F8EF7',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#4F8EF7',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default AIConnectionButton;
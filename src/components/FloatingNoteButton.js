// components/FloatingNoteButton.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import databaseService from '../services/database';

const { width, height } = Dimensions.get('window');

const FloatingNoteButton = ({ date, onNoteAdded }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleButtonPress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      Alert.alert('Geen tekst', 'Voeg eerst wat tekst toe voordat je opslaat.');
      return;
    }

    try {
      setSaving(true);
      await databaseService.saveUserNote(date, noteText.trim());
      
      // Clear input and close modal
      setNoteText('');
      setModalVisible(false);
      
      // Notify parent component
      if (onNoteAdded) {
        onNoteAdded();
      }
      
      // Show success feedback
      Alert.alert('✅ Opgeslagen!', 'Je notitie is toegevoegd aan je dag.');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Fout', 'Kon notitie niet opslaan. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteText('');
    setModalVisible(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.floatingButton,
          {
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.buttonTouchable}
          onPress={handleButtonPress}
          activeOpacity={0.8}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Note Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Snelle notitie</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={handleCancel}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Input Area */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Wat wil je onthouden van vandaag?"
                  placeholderTextColor="#999"
                  value={noteText}
                  onChangeText={setNoteText}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                  autoFocus
                />
                <Text style={styles.characterCount}>
                  {noteText.length}/500
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Annuleren</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!noteText.trim() || saving) && styles.saveButtonDisabled
                  ]}
                  onPress={handleSaveNote}
                  disabled={!noteText.trim() || saving}
                >
                  {saving ? (
                    <Text style={styles.saveButtonText}>Opslaan...</Text>
                  ) : (
                    <Text style={styles.saveButtonText}>Opslaan</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Quick Suggestions */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Snelle voorbeelden:</Text>
                <View style={styles.suggestionChips}>
                  {quickSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => setNoteText(suggestion)}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

// Quick suggestion templates
const quickSuggestions = [
  "Geweldig gesprek gehad met...",
  "Moe van...",
  "Eindelijk...",
  "Blij met...",
  "Leuk moment vandaag:",
  "Stress door..."
];

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a90e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34, // Extra padding for safe area
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginVertical: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#4a90e2',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginBottom: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f4f8',
    borderRadius: 16,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#4a90e2',
    fontWeight: '500',
  },
});

export default FloatingNoteButton;
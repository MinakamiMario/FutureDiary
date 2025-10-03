// components/UserNotesInput.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import databaseService from '../services/database';
import { formatDateToYYYYMMDD } from '../utils/formatters';

const UserNotesInput = ({ date, onNotesChange, style }) => {
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadNotesForDate();
  }, [date]);

  useEffect(() => {
    // Notify parent component when notes change
    if (onNotesChange) {
      onNotesChange(notes);
    }
  }, [notes]);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNotesForDate = async () => {
    try {
      setLoading(true);
      const userNotes = await databaseService.getUserNotesForDate(date);
      setNotes(userNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNoteText.trim()) return;

    try {
      await databaseService.saveUserNote(date, newNoteText.trim());
      setNewNoteText('');
      await loadNotesForDate();
      
      // Show success feedback
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true })
      ]).start();
    } catch (error) {
      console.error('Error adding note:', error);
      Alert.alert('Fout', 'Kon notitie niet opslaan. Probeer opnieuw.');
    }
  };

  const startEditing = (note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;

    try {
      await databaseService.updateUserNote(editingNoteId, editingText.trim());
      setEditingNoteId(null);
      setEditingText('');
      await loadNotesForDate();
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Fout', 'Kon notitie niet bijwerken. Probeer opnieuw.');
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const deleteNote = async (noteId) => {
    Alert.alert(
      'Notitie verwijderen',
      'Weet je zeker dat je deze notitie wilt verwijderen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteUserNote(noteId);
              await loadNotesForDate();
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Fout', 'Kon notitie niet verwijderen. Probeer opnieuw.');
            }
          }
        }
      ]
    );
  };

  const formatTimeDisplay = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.header} 
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.headerLeft}>
            <Icon name="create-outline" size={20} color="#4a90e2" />
            <Text style={styles.headerTitle}>Persoonlijke notities</Text>
            {notes.length > 0 && (
              <View style={styles.notesBadge}>
                <Text style={styles.notesBadgeText}>{notes.length}</Text>
              </View>
            )}
          </View>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {/* Expandable Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Add New Note */}
            <View style={styles.inputSection}>
              <TextInput
                style={styles.textInput}
                placeholder="Voeg je eigen notities toe aan je dagverhaal..."
                placeholderTextColor="#999"
                value={newNoteText}
                onChangeText={setNewNoteText}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <View style={styles.inputFooter}>
                <Text style={styles.characterCount}>
                  {newNoteText.length}/500
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    newNoteText.trim() ? styles.addButtonActive : styles.addButtonInactive
                  ]}
                  onPress={addNote}
                  disabled={!newNoteText.trim()}
                >
                  <Icon 
                    name="add" 
                    size={20} 
                    color={newNoteText.trim() ? "#fff" : "#999"} 
                  />
                  <Text style={[
                    styles.addButtonText,
                    newNoteText.trim() ? styles.addButtonTextActive : styles.addButtonTextInactive
                  ]}>
                    Toevoegen
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Notes */}
            {notes.length > 0 && (
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Notities voor vandaag:</Text>
                <ScrollView style={styles.notesList} showsVerticalScrollIndicator={false}>
                  {notes.map((note) => (
                    <View key={note.id} style={styles.noteItem}>
                      {editingNoteId === note.id ? (
                        // Edit Mode
                        <View style={styles.editContainer}>
                          <TextInput
                            style={styles.editInput}
                            value={editingText}
                            onChangeText={setEditingText}
                            multiline
                            maxLength={500}
                            autoFocus
                          />
                          <View style={styles.editActions}>
                            <TouchableOpacity 
                              style={styles.editButton}
                              onPress={saveEdit}
                            >
                              <Icon name="checkmark" size={18} color="#00aa00" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.editButton}
                              onPress={cancelEdit}
                            >
                              <Icon name="close" size={18} color="#ff6b6b" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        // Display Mode
                        <View style={styles.noteDisplay}>
                          <View style={styles.noteContent}>
                            <Text style={styles.noteText}>{note.text}</Text>
                            <Text style={styles.noteTime}>
                              {formatTimeDisplay(note.timestamp)}
                            </Text>
                          </View>
                          <View style={styles.noteActions}>
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => startEditing(note)}
                            >
                              <Icon name="pencil" size={16} color="#4a90e2" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.actionButton}
                              onPress={() => deleteNote(note.id)}
                            >
                              <Icon name="trash" size={16} color="#ff6b6b" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Help Text */}
            <Text style={styles.helpText}>
              💡 Voeg persoonlijke momenten toe die je wilt onthouden - gesprekken, 
              gevoelens, gedachten of bijzondere gebeurtenissen van vandaag.
            </Text>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  notesBadge: {
    backgroundColor: '#4a90e2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notesBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandedContent: {
    padding: 16,
  },
  inputSection: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    backgroundColor: '#f9f9f9',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonActive: {
    backgroundColor: '#4a90e2',
  },
  addButtonInactive: {
    backgroundColor: '#f0f0f0',
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonTextActive: {
    color: '#fff',
  },
  addButtonTextInactive: {
    color: '#999',
  },
  notesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  notesList: {
    maxHeight: 200,
  },
  noteItem: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  noteDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  noteContent: {
    flex: 1,
    marginRight: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noteTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  noteActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#4a90e2',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default UserNotesInput;
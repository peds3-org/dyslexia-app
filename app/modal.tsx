import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Switch } from 'react-native';
import { ThemedText } from './components/ThemedText';
import { ThemedView } from './components/ThemedView';
import { Stack, useRouter } from 'expo-router';
import soundService from './services/soundService';
import speechService from './services/speechService';

export default function SettingsModal() {
  const router = useRouter();
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const handleSoundToggle = () => {
    setIsSoundEnabled(!isSoundEnabled);
    soundService.toggleSound(!isSoundEnabled);
  };

  const handleVoiceToggle = () => {
    setIsVoiceEnabled(!isVoiceEnabled);
    speechService.toggleVoice(!isVoiceEnabled);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '設定', presentation: 'modal' }} />

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>サウンド設定</ThemedText>

        <View style={styles.settingItem}>
          <ThemedText>効果音</ThemedText>
          <Switch value={isSoundEnabled} onValueChange={handleSoundToggle} />
        </View>

        <View style={styles.settingItem}>
          <ThemedText>音声</ThemedText>
          <Switch value={isVoiceEnabled} onValueChange={handleVoiceToggle} />
        </View>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <ThemedText style={styles.closeButtonText}>閉じる</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    backgroundColor: '#E86A33',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

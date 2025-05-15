import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Switch, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import soundService from '@src/services/soundService';
import speechService from '@src/services/speechService';

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
    <View style={styles.container}>
      <Stack.Screen options={{ title: '設定', presentation: 'modal' }} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>サウンド設定</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>効果音</Text>
          <Switch value={isSoundEnabled} onValueChange={handleSoundToggle} />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>音声</Text>
          <Switch value={isVoiceEnabled} onValueChange={handleVoiceToggle} />
        </View>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>閉じる</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
    fontFamily: 'font-mplus',
  },
  settingText: {
    color: '#333333',
    fontFamily: 'font-mplus',
    fontSize: 16,
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
    fontFamily: 'font-mplus',
  },
});

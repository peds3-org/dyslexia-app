import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PauseScreenProps = {
  onResume: () => void;
  onQuit: () => void;
};

export function PauseScreen({ onResume, onQuit }: PauseScreenProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>一時停止</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={onResume} style={[styles.button, styles.resumeButton]}>
            <MaterialCommunityIcons name='play' size={24} color='#FFF' />
            <Text style={styles.buttonText}>続ける</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onQuit} style={[styles.button, styles.quitButton]}>
            <MaterialCommunityIcons name='exit-to-app' size={24} color='#FFF' />
            <Text style={styles.buttonText}>修行をやめる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 30,
    gap: 10,
  },
  resumeButton: {
    backgroundColor: '#41644A',
  },
  quitButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'font-mplus-bold',
  },
});

export default PauseScreen;

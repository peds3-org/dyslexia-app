import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

// 練習する文字のリスト
const PRACTICE_CHARS = [
  { char: 'あ', example: 'あ', color: '#FF9500' },
  { char: 'い', example: 'い', color: '#FF2D55' },
  { char: 'う', example: 'う', color: '#5856D6' },
  { char: 'え', example: 'え', color: '#34C759' },
  { char: 'お', example: 'お', color: '#007AFF' },
  { char: 'か', example: 'か', color: '#AF52DE' },
  { char: 'き', example: 'き', color: '#FF9500' },
  { char: 'く', example: 'く', color: '#FF2D55' },
  { char: 'け', example: 'け', color: '#5856D6' },
  { char: 'こ', example: 'こ', color: '#34C759' },
];

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 16000 * 16,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 16000 * 16,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 16000 * 16 * 1,
  },
};

export default function VoicePractice() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recognitionResult, setRecognitionResult] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [score, setScore] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TFLiteモデルの代わりに準備完了フラグを使用
  const [modelLoaded, setModelLoaded] = useState(false);

  const currentChar = PRACTICE_CHARS[currentIndex];

  useEffect(() => {
    const getPermissions = async () => {
      if (permissionResponse && permissionResponse.status !== 'granted') {
        console.log('マイクのしようきょかを もとめます');
        await requestPermission();
      }
    };
    getPermissions();
  }, [permissionResponse, requestPermission]);

  useEffect(() => {
    let isMounted = true;

    // TFLiteモデルのロードをシミュレート
    const simulateModelLoading = async () => {
      try {
        console.log('モデルロードをシミュレートしています...');
        // 2秒待機してモデルロードをシミュレート
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (isMounted) {
          setModelLoaded(true);
          console.log('モデルロード シミュレーション かんりょう');
          setErrorMessage(null);
        }
      } catch (e) {
        console.error('シミュレートモデルロードのエラー:', e);
        if (isMounted) {
          setErrorMessage('AIモデルのじゅんびに しっぱいしました');
          setModelLoaded(false);
        }
      }
    };

    simulateModelLoading();

    return () => {
      isMounted = false;
    };
  }, []);

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
      } else if (nextAppState.match(/inactive|background/)) {
        if (recording) {
          console.log('バックグラウンドにいくので ろくおんを とめます (AppState)');
          await recording.stopAndUnloadAsync();
          setIsRecording(false);
          setRecording(null);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (recording) {
        console.log('コンポーネントがなくなるので ろくおんを とめます (useEffect cleanup)');
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const speakText = (text: string) => {
    Speech.speak(text, { language: 'ja-JP', rate: 0.8, pitch: 1.0 });
  };

  const playSound = async (isCorrectSound: boolean) => {
    if (sound) await sound.unloadAsync();
    const soundFile = isCorrectSound ? require('../../assets/sounds/correct.wav') : require('../../assets/sounds/incorrect.wav');
    const { sound: newSound } = await Audio.Sound.createAsync(soundFile);
    setSound(newSound);
    await newSound.playAsync();
  };

  const startRecording = async () => {
    if (!permissionResponse?.granted) {
      setErrorMessage('マイクの しようがきょか されていません');
      await requestPermission();
      if (!permissionResponse?.granted) return;
    }
    if (!modelLoaded) {
      setErrorMessage('AIモデルのじゅんびが まだできていません');
      return;
    }
    setErrorMessage(null);

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      console.log('ろくおんを かいしします...');
      const { recording: newRecording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      setRecording(newRecording);
      setIsRecording(true);
      console.log('ろくおん かいし');
    } catch (err: any) {
      console.error('ろくおん かいし えらー:', err);
      setErrorMessage('ろくおんを かいしできませんでした');
      setIsRecording(false);
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
      }
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recording) return;
    console.log('ろくおんを ていしします...');
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('ろくおん しゅうりょう URI:', uri);
      setRecording(null);

      if (uri && modelLoaded) {
        console.log('ろくおんファイル URI:', uri);

        // テスト用：50%の確率で正解を返す
        const randomResult = Math.random() > 0.5;
        if (randomResult) {
          handleTranscript(currentChar.char);
        } else {
          // ランダムに別の文字を返す
          const otherChars = PRACTICE_CHARS.filter((item) => item.char !== currentChar.char);
          const randomChar = otherChars[Math.floor(Math.random() * otherChars.length)];
          handleTranscript(randomChar.char);
        }
      } else if (!modelLoaded) {
        setErrorMessage('AIモデルが じゅんびできていません');
      } else {
        setErrorMessage('ろくおんファイルの取得に しっぱいしました');
      }
    } catch (error) {
      console.error('ろくおん ていし・しょり えらー:', error);
      setErrorMessage('ろくおんの しっぱいしました');
    }
  };

  const handleTranscript = (text: string) => {
    const cleanText = text.trim();
    setRecognitionResult(cleanText);
    const isCorrectNow = cleanText === currentChar.char;
    setCorrect(isCorrectNow);
    playSound(isCorrectNow);
    if (isCorrectNow) setScore((prevScore) => prevScore + 1);

    setTimeout(() => {
      if (currentIndex < PRACTICE_CHARS.length - 1) {
        setCurrentIndex((prevIndex) => prevIndex + 1);
      } else {
        alert(`れんしゅうおわり！\nあなたのてんすうは ${score + (isCorrectNow ? 1 : 0)} てんです！`);
        router.back();
      }
      setCorrect(null);
      setRecognitionResult('');
    }, 2000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialCommunityIcons name='arrow-left' size={24} color='#007AFF' />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>おんせいれんしゅう</Text>
        <Text style={{ fontSize: 16, color: '#007AFF' }}>てんすう: {score}</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View
            style={{
              width: 150,
              height: 150,
              borderRadius: 75,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
              backgroundColor: currentChar.color,
            }}>
            <Text style={{ fontSize: 80, color: '#fff', fontWeight: 'bold' }}>{currentChar.char}</Text>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
              backgroundColor: '#f8f8f8',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            onPress={() => speakText(currentChar.example)}>
            <Text style={{ fontSize: 22, marginRight: 10 }}>{currentChar.example}</Text>
            <MaterialCommunityIcons name='volume-high' size={20} color='#666' />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' }}>
            したのボタンをおして、「{currentChar.char}」とよんでみよう
          </Text>
          {correct !== null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginTop: 10,
                minHeight: 40,
                backgroundColor: correct ? '#34C759' : '#FF3B30',
              }}>
              <MaterialCommunityIcons name={correct ? 'check-circle' : 'close-circle'} size={24} color='#fff' />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>
                {correct ? 'せいかい！' : 'ざんねん...'} {recognitionResult && `(${recognitionResult})`}
              </Text>
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          {!modelLoaded && !errorMessage && <ActivityIndicator size='large' color='#007AFF' />}
          {!modelLoaded && !errorMessage && (
            <Text style={{ fontSize: 16, color: '#888', marginBottom: 10, textAlign: 'center', minHeight: 20 }}>AIモデルをじゅんびちゅう...</Text>
          )}
          {errorMessage && <Text style={{ fontSize: 14, color: 'red', marginBottom: 10, textAlign: 'center', minHeight: 20 }}>{errorMessage}</Text>}
          {modelLoaded && !errorMessage && isRecording && (
            <Text style={{ fontSize: 16, color: '#888', marginBottom: 10, textAlign: 'center', minHeight: 20 }}>はなしてください...</Text>
          )}
          {modelLoaded && !errorMessage && !isRecording && (
            <Text style={{ fontSize: 16, color: '#888', marginBottom: 10, textAlign: 'center', minHeight: 20 }}>ボタンをおして、よんでみよう！</Text>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: isRecording ? '#FF3B30' : !modelLoaded || !permissionResponse?.granted ? '#BDBDBD' : '#007AFF',
              width: 70,
              height: 70,
              borderRadius: 35,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 3,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              marginTop: 10,
            }}
            onPress={isRecording ? stopRecordingAndProcess : startRecording}
            disabled={!modelLoaded || !permissionResponse?.granted || (isRecording && !recording)}>
            {isRecording ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color='#fff' size='small' style={{ marginRight: 8 }} />
                <MaterialCommunityIcons name='microphone-off' size={32} color='#fff' />
              </View>
            ) : (
              <MaterialCommunityIcons name='microphone' size={32} color='#fff' />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

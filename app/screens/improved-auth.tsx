import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import authService from '@src/services/authService';
import progressService from '@src/services/progressService';
import stageService from '@src/services/stageService';
import { StageType } from '../types/common';

type Step = 'name' | 'birthday' | 'avatar' | 'complete';
type Avatar = 'ninja' | 'samurai' | 'fox' | 'cat';

interface AvatarOption {
  id: Avatar;
  image: any;
  name: string;
}

const avatarOptions: AvatarOption[] = [
  { id: 'ninja', image: require('../../assets/ninja/beginner/happy.png'), name: 'にんじゃ' },
  { id: 'samurai', image: require('../../assets/ninja/intermediate/happy.png'), name: 'さむらい' },
  { id: 'fox', image: require('../../assets/oni/gold/happy.png'), name: 'きつね' },
  { id: 'cat', image: require('../../assets/oni/blue/happy.png'), name: 'ねこ' },
];

export default function ImprovedAuthScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>('ninja');
  const [isLoading, setIsLoading] = useState(false);
  
  // アニメーション
  const buttonScale = useSharedValue(1);
  
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleNext = () => {
    switch (currentStep) {
      case 'name':
        if (!name.trim()) {
          Alert.alert('おなまえを いれてね', 'なんて よばれたい？');
          return;
        }
        setCurrentStep('birthday');
        break;
      case 'birthday':
        setCurrentStep('avatar');
        break;
      case 'avatar':
        handleSignUp();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'birthday':
        setCurrentStep('name');
        break;
      case 'avatar':
        setCurrentStep('birthday');
        break;
      default:
        router.back();
    }
  };

  const handleSignUp = async () => {
    try {
      setIsLoading(true);

      // サインアップ処理
      const success = await authService.signUp(
        name,
        birthday.toISOString().split('T')[0],
        selectedAvatar
      );

      if (success) {
        const user = authService.getUser();
        if (user) {
          // 初期ステージを設定
          await stageService.initializeStageForUser(user.id, StageType.BEGINNER);
          
          // 完了画面を表示
          setCurrentStep('complete');
          
          // 2秒後にホーム画面へ
          setTimeout(() => {
            router.replace('/screens/home');
          }, 2000);
        }
      } else {
        Alert.alert(
          'エラー',
          'とうろくに しっぱいしました。もういちど ためしてください。'
        );
      }
    } catch (error) {
      console.error('サインアップエラー:', error);
      Alert.alert(
        'エラー',
        'エラーが はっせいしました。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthday(selectedDate);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Animated.View 
            entering={FadeInDown.duration(600)}
            style={styles.stepContainer}
          >
            <Image
              source={require('../../assets/temp/elder-normal.png')}
              style={styles.mascot}
            />
            <Text style={styles.stepTitle}>おなまえを おしえて！</Text>
            <Text style={styles.stepDescription}>
              なんて よばれたい？
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="ひらがなで いれてね"
              autoFocus
              maxLength={20}
            />
          </Animated.View>
        );

      case 'birthday':
        return (
          <Animated.View 
            entering={FadeInDown.duration(600)}
            style={styles.stepContainer}
          >
            <Image
              source={require('../../assets/temp/elder-happy.png')}
              style={styles.mascot}
            />
            <Text style={styles.stepTitle}>おたんじょうびは いつ？</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="cake" size={24} color="#E91E63" />
              <Text style={styles.dateText}>
                {birthday.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={birthday}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </Animated.View>
        );

      case 'avatar':
        return (
          <Animated.View 
            entering={FadeInDown.duration(600)}
            style={styles.stepContainer}
          >
            <Text style={styles.stepTitle}>すきな キャラクターを えらんで！</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === avatar.id && styles.avatarSelected,
                  ]}
                  onPress={() => setSelectedAvatar(avatar.id)}
                >
                  <Image source={avatar.image} style={styles.avatarImage} />
                  <Text style={styles.avatarName}>{avatar.name}</Text>
                  {selectedAvatar === avatar.id && (
                    <View style={styles.checkmark}>
                      <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 'complete':
        return (
          <Animated.View 
            entering={FadeInUp.duration(600)}
            style={styles.completeContainer}
          >
            <MaterialCommunityIcons name="check-circle" size={100} color="#4CAF50" />
            <Text style={styles.completeTitle}>ようこそ！</Text>
            <Text style={styles.completeName}>{name}さん</Text>
            <Text style={styles.completeMessage}>
              いっしょに たのしく{'\n'}べんきょうしよう！
            </Text>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* プログレスバー */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: currentStep === 'name' ? '33%' : 
                           currentStep === 'birthday' ? '66%' : 
                           '100%' 
                  }
                ]} 
              />
            </View>
          </View>

          {/* ステップコンテンツ */}
          {renderStep()}

          {/* ボタン */}
          {currentStep !== 'complete' && (
            <View style={styles.buttonContainer}>
              {currentStep !== 'name' && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
                  <Text style={styles.backButtonText}>もどる</Text>
                </TouchableOpacity>
              )}
              
              <Animated.View style={animatedButtonStyle}>
                <TouchableOpacity
                  style={[styles.nextButton, isLoading && styles.buttonDisabled]}
                  onPress={() => {
                    buttonScale.value = withSpring(0.95, {}, () => {
                      buttonScale.value = withSpring(1);
                    });
                    handleNext();
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === 'avatar' ? 'はじめる！' : 'つぎへ'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  progressContainer: {
    paddingVertical: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  mascot: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  stepTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 28,
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 20,
    fontFamily: 'font-mplus',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#333',
    marginLeft: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  avatarOption: {
    alignItems: 'center',
    margin: 10,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: '#4CAF50',
  },
  avatarImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  avatarName: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#333',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontFamily: 'font-mplus',
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    fontFamily: 'font-mplus-bold',
    fontSize: 18,
    color: '#FFF',
    marginRight: 8,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  completeTitle: {
    fontFamily: 'font-mplus-bold',
    fontSize: 32,
    color: '#333',
    marginTop: 20,
  },
  completeName: {
    fontFamily: 'font-mplus-bold',
    fontSize: 24,
    color: '#4CAF50',
    marginTop: 8,
  },
  completeMessage: {
    fontFamily: 'font-mplus',
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 26,
  },
});
# API Documentation

## Overview

This document describes the service layer API and data structures used in the ひらがなにんじゃ app.

## Core Services

### AIService

TensorFlow Lite model management and speech recognition.

```typescript
class AIService {
  // Initialize the AI model
  async initialize(): Promise<boolean>
  
  // Check if model is downloaded
  async isModelDownloaded(): Promise<boolean>
  
  // Check if service is ready
  async isReady(): Promise<boolean>
  
  // Download model from GitHub releases
  async downloadModel(): Promise<void>
  
  // Classify speech audio
  async classifySpeech(
    targetCharacter: string,
    expectedCharacter: string,
    audioUri: string
  ): Promise<{
    isCorrect: boolean;
    confidence: number;
    top3: Array<{character: string; confidence: number}>;
  }>
}
```

### VoiceService

Audio recording and speech synthesis management.

```typescript
class VoiceService {
  // Initialize voice service
  initialize(): void
  
  // Start recording audio (2 seconds)
  async startRecording(): Promise<Audio.Recording>
  
  // Stop recording
  async stopRecording(recording: Audio.Recording): Promise<string>
  
  // Play audio file
  async playSound(uri: string): Promise<void>
  
  // Read character aloud
  async readCharacterAloud(character: string): Promise<void>
  
  // Evaluate pronunciation
  async evaluatePronunciation(
    audioUri: string,
    targetCharacter: string
  ): Promise<EvaluationResult>
}
```

### StageService

Game stage progression and difficulty management.

```typescript
class StageService {
  // Initialize for specific stage
  async initializeForStage(stage: string): Promise<void>
  
  // Get current stage data
  getStageData(): StageConfig
  
  // Get practice sets for current stage
  getPracticeSets(): PracticeSet[]
  
  // Update character mastery
  async updateCharacterMastery(
    character: string,
    isCorrect: boolean,
    responseTime: number
  ): Promise<void>
  
  // Check if stage complete
  isStageComplete(): boolean
  
  // Get available characters (not mastered)
  getAvailableCharacters(): string[]
}
```

### ProgressService

User progress tracking and statistics.

```typescript
class ProgressService {
  // Initialize progress tracking
  async initialize(): Promise<void>
  
  // Get current stage number
  getCurrentStage(): number
  
  // Get current practice set
  getCurrentPracticeSet(): number
  
  // Record study time
  async recordStudyTime(userId: string, minutes: number): Promise<void>
  
  // Update streak
  async updateStreak(userId: string): Promise<void>
  
  // Get moji-dama count
  getMojiDamaCount(): number
  
  // Add moji-dama
  async addMojiDama(count: number): Promise<void>
}
```

### CBTService

Cognitive Behavioral Therapy features.

```typescript
class CBTService {
  // Process login bonus
  async processLoginBonus(userId: string): Promise<LoginBonus>
  
  // Record mood
  async recordMood(
    userId: string,
    mood: 'great' | 'good' | 'normal' | 'bad' | 'terrible'
  ): Promise<void>
  
  // Get missions for today
  async getMissionsForToday(userId: string): Promise<Mission[]>
  
  // Complete mission
  async completeMission(missionId: string): Promise<void>
  
  // Record thinking pattern
  async recordThinkingPattern(
    userId: string,
    pattern: ThinkingPattern
  ): Promise<void>
}
```

## Data Types

### TestResult
```typescript
interface TestResult {
  yoon: string;
  time: number;
  audioUri?: string;
  aiResult?: {
    predictions?: Array<{ character: string; confidence: number }>;
    top3?: Array<{ character: string; confidence: number }>;
    isCorrect?: boolean;
    confidence?: number;
    processingTime?: number;
  };
}
```

### StageConfig
```typescript
interface StageConfig {
  id: string;
  name: string;
  description: string;
  backgroundImage: any;
  elderImage: any;
  characters: string[];
  requiredMastery: number;
  timeLimit: number;
}
```

### UserProgress
```typescript
interface UserProgress {
  userId: string;
  currentStage: number;
  totalMojiDama: number;
  totalPracticeTime: number;
  currentStreak: number;
  characterMastery: Record<string, CharacterMastery>;
}
```

### CharacterMastery
```typescript
interface CharacterMastery {
  character: string;
  attempts: number;
  correctCount: number;
  averageResponseTime: number;
  lastPracticed: Date;
  masteryLevel: number; // 0-100
}
```

### Mission
```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'streak' | 'accuracy' | 'time';
  target: number;
  reward: {
    mojiDama: number;
    exp?: number;
  };
  isCompleted: boolean;
}
```

## Database Schema (Supabase)

### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  character_level TEXT CHECK (character_level IN ('beginner', 'intermediate', 'advanced')),
  total_moji_dama INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### practice_results
```sql
CREATE TABLE practice_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  character TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time FLOAT NOT NULL,
  stage_type TEXT NOT NULL,
  ai_confidence FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### user_progress
```sql
CREATE TABLE user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  current_stage INTEGER DEFAULT 1,
  current_practice_set INTEGER DEFAULT 1,
  total_practice_time INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### character_mastery
```sql
CREATE TABLE character_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  character TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  average_response_time FLOAT,
  mastery_level INTEGER DEFAULT 0,
  last_practiced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, character)
);
```

### cbt_mood_records
```sql
CREATE TABLE cbt_mood_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  mood TEXT CHECK (mood IN ('great', 'good', 'normal', 'bad', 'terrible')),
  thinking_pattern JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### missions
```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target INTEGER NOT NULL,
  reward_moji_dama INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

All services follow a consistent error handling pattern:

```typescript
try {
  // Service operation
} catch (error) {
  console.error(`[ServiceName] Operation failed:`, error);
  
  // For critical errors, show user-friendly message
  if (isCriticalError(error)) {
    Alert.alert('エラー', 'ユーザー向けメッセージ');
  }
  
  // Return safe default or rethrow
  return defaultValue; // or throw error
}
```

## Offline Support

The app implements offline support through:

1. **AsyncStorage** for local data persistence
2. **Sync queue** for pending operations
3. **Optimistic updates** for immediate UI feedback
4. **Background sync** when connection restored

Example:
```typescript
// Offline-capable service method
async updateProgress(data: ProgressData) {
  // Optimistic local update
  await AsyncStorage.setItem('progress', JSON.stringify(data));
  
  // Queue for sync
  await syncQueue.add({
    type: 'UPDATE_PROGRESS',
    data,
    timestamp: Date.now()
  });
  
  // Attempt immediate sync if online
  if (await isOnline()) {
    await syncManager.processQueue();
  }
}
```
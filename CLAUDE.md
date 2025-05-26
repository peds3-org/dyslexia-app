# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native Expo app called "ひらがなにんじゃ" (Hiragana Ninja) designed to help children with dyslexia learn hiragana through gamification and AI-powered speech recognition. The app uses TensorFlow Lite for real-time pronunciation assessment and features a ninja-themed UI with "moji-dama" (character balls) collection system.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android

# Lint code
npm run lint

# Run tests
npm test

# Build for production
eas build --profile production --platform all

# Development build
eas build --profile development --platform all
```

## High-Level Architecture

### Service Layer Architecture
The app uses a service-oriented architecture with singleton services initialized at app startup in `app/_layout.tsx`:

- **authService**: Manages Supabase authentication and user sessions
- **aiService**: Handles TensorFlow Lite model loading and speech recognition (104-class hiragana classification)
- **voiceService**: Records 2-second audio clips and manages speech synthesis
- **progressService**: Tracks user progress, moji-dama collection, and stage completion
- **stageService**: Controls game difficulty progression (2.5s → 2.0s → 1.7s → 1.5s response times)
- **cbtService**: Implements Cognitive Behavioral Therapy features (mood tracking, missions)
- **soundService**: Manages sound effects and background music using expo-av

### Navigation & State Management
- Uses Expo Router for file-based routing
- State is managed through React hooks and service singletons
- Offline data persistence via AsyncStorage with Supabase sync

### Game Flow Architecture
1. **Initial Test** (`/screens/initial-test/`): Assesses user's starting level
2. **Training Stages**: Progressive difficulty with 3 practice sets per stage
3. **Test Mode**: Requires 75% accuracy to progress
4. **Character Progression**: Unlocks new characters as moji-dama are collected

### AI Integration Details
- Model: 1.2GB TensorFlow Lite model downloaded from GitHub releases
- Input: 16kHz, 16-bit PCM WAV audio (2 seconds)
- Output: 104-class probability array (106 hiragana characters)
- Handles identical pairs (を/お, じ/ぢ, ず/づ) and similar pairs for accuracy

### Audio Recording Flow
1. `startRecordingProcess()` initializes recording with 2.5s auto-stop timer
2. Audio is processed through `preprocessWav()` to normalize and pad to 32000 samples
3. AI inference returns confidence scores for Top-3 predictions
4. Correct pronunciation triggers voice reading with character highlighting

### Critical Implementation Notes
- Recording and character evaluation use `latestCharacter.current` to handle async timing
- Safety timers prevent UI deadlocks (3-second timeout for animations)
- Vibration feedback (10ms) on button presses for haptic response
- Force initialization timer ensures recording starts even if setup is delayed

## Common Development Tasks

### Testing AI Functionality
The AI model expects 104 classes but CLASS_LABELS has 106 characters. This is normal - the model was trained on a subset. The mapping is handled correctly in `processProbabilities()`.

### Debugging Recording Issues
- Check `isRecordingLocked.current` to prevent concurrent recordings
- Verify `latestCharacter.current` matches the displayed character
- Use `VoiceService: 録音を評価中... 対象文字:` logs to track evaluation

### Managing Game Speed
Adjust timers in `GameScreen.tsx`:
- `SAFETY_TIMER_DELAY`: Overall safety timeout (3000ms)
- `handleCharacterTransition()`: Controls transition animations
- Recording auto-stop: Set via `stageMode.timeLimit`

## Database Schema

Key Supabase tables:
- `user_profiles`: User settings and preferences
- `practice_results`: Individual practice session results
- `user_progress`: Aggregated progress statistics
- `cbt_mood_records`: Daily mood tracking
- `login_bonuses`: Consecutive login tracking
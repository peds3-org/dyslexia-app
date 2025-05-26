# Quick Reference Guide

## 🚀 Common Commands

```bash
# Start development
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run tests
npm test

# Lint check
npm run lint

# Type check
npm run typecheck

# Clear cache
npx expo start -c

# Build production
eas build --platform all --profile production
```

## 📁 Key File Locations

### Configuration
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration
- `.env` - Environment variables
- `CLAUDE.md` - AI assistant guide

### Main Code
- `app/_layout.tsx` - Root layout & service initialization
- `app/(app)/index.tsx` - Home screen
- `app/(app)/initial-test/` - Initial test flow
- `src/services/` - Business logic services
- `src/components/` - Reusable components

### Assets
- `assets/sounds/` - Sound effects
- `assets/ninja/` - Character images
- `assets/backgrounds/` - Background images

## 🔧 Service Quick Reference

### AI Service
```typescript
import { aiService } from '@src/services';

// Check if ready
const ready = await aiService.isReady();

// Classify speech
const result = await aiService.classifySpeech(
  targetChar, 
  expectedChar, 
  audioUri
);
```

### Voice Service
```typescript
import { voiceService } from '@src/services';

// Start recording
const recording = await voiceService.startRecording();

// Read character aloud
await voiceService.readCharacterAloud('あ');
```

### Stage Service
```typescript
import { stageService } from '@src/services';

// Get available characters
const chars = stageService.getAvailableCharacters();

// Check if stage complete
const isComplete = stageService.isStageComplete();
```

## 🎮 Game Constants

### Time Limits
- Initial Test: 2.5 seconds
- Training Level 1: 2.5 seconds
- Training Level 2: 2.0 seconds
- Training Level 3: 1.7 seconds
- Last Stage: 1.5 seconds

### Progress Requirements
- Test Pass Rate: 75% (3/4 correct)
- Characters per Set: Variable
- Encouragement Points: 11, 22 questions

### Character Lists
```typescript
import { YOON_LIST, DAKUON_LIST, SEION_LIST } from '@src/constants/initialTest';
```

## 🐛 Common Issues & Solutions

### Audio Recording Not Working
```typescript
// Request permissions first
await Audio.requestPermissionsAsync();

// Set audio mode
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  allowsRecordingIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: false,
});
```

### AI Model Not Loading
```typescript
// Check if downloaded
const downloaded = await aiService.isModelDownloaded();

// Download if needed
if (!downloaded) {
  await aiService.downloadModel();
}

// Initialize
await aiService.initialize();
```

### Navigation Issues
```typescript
// Use router from expo-router
import { router } from 'expo-router';

// Navigate
router.push('/initial-test');
router.replace('/home');
router.back();
```

## 📊 Database Queries

### Get User Progress
```sql
SELECT * FROM user_progress 
WHERE user_id = $1;
```

### Get Character Mastery
```sql
SELECT * FROM character_mastery 
WHERE user_id = $1 
ORDER BY mastery_level DESC;
```

### Record Practice Result
```sql
INSERT INTO practice_results 
(user_id, character, is_correct, response_time, stage_type)
VALUES ($1, $2, $3, $4, $5);
```

## 🎨 Styling Guidelines

### Colors
```typescript
const colors = {
  primary: '#4B5563',    // Gray-600
  secondary: '#F59E0B',  // Amber-500
  success: '#10B981',    // Green-500
  error: '#EF4444',      // Red-500
  background: '#F5F5F5', // Gray-100
};
```

### Common Styles
```typescript
// Container
container: {
  flex: 1,
  backgroundColor: '#F5F5F5',
}

// Button
button: {
  backgroundColor: '#4B5563',
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 8,
}

// Card
card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}
```

## 🔒 Security Checklist

- [ ] Never commit `.env` files
- [ ] Use `EXPO_PUBLIC_` prefix for client variables
- [ ] Validate all user inputs
- [ ] Implement proper error boundaries
- [ ] Use HTTPS for all API calls
- [ ] Enable RLS on Supabase tables

## 📱 Testing Checklist

### Before Release
- [ ] Test on physical devices
- [ ] Test offline functionality
- [ ] Verify audio permissions
- [ ] Check all navigation flows
- [ ] Test with slow network
- [ ] Verify error handling

### Device Testing
- [ ] iPhone (various models)
- [ ] iPad
- [ ] Android phones
- [ ] Android tablets

## 🚨 Emergency Contacts

- **Technical Lead**: tech@peds3.org
- **Project Manager**: pm@peds3.org
- **24/7 Support**: support@peds3.org

## 📝 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Project Repository](https://github.com/peds3-org/dyslexia-app)
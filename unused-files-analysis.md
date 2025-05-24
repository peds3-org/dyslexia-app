# Unused Files Analysis for Dyslexia App

## Summary
After analyzing the codebase, I've identified several unused files that can be safely deleted.

## 1. Unused Images in Assets Folder

### Currently Used Images:
- `assets/temp/elder-worried.png` - Used in multiple screens
- `assets/temp/elder-normal.png` - Used in config
- `assets/temp/elder-happy.png` - Used in config
- `assets/temp/ninja_syuriken_man.png` - Used extensively
- `assets/temp/oni_run_1.png` - Used in index
- `assets/temp/shuriken.png` - Used in VoiceRecognition
- `assets/temp/doujou.png` - Used in intro
- `assets/temp/haikei.png` - Used in stageConfig
- `assets/backgrounds/sato.png` - Used in multiple screens
- `assets/ninja/beginner/normal.png` - Used in auth
- `assets/ninja/beginner/happy.png` - Used in MoodSelector
- `assets/ninja/intermediate/happy.png` - Used in MoodSelector
- `assets/oni/blue/happy.png` - Used in MoodSelector
- `assets/oni/gold/happy.png` - Used in MoodSelector
- `assets/sennin/master/happy.png` - Used in auth

### Potentially Unused Images:
- All other images in `assets/ninja/advanced/` (except referenced ones)
- All other images in `assets/ninja/beginner/` (except normal.png and happy.png)
- All other images in `assets/ninja/intermediate/` (except happy.png)
- All other images in `assets/oni/` folders (except blue/happy.png and gold/happy.png)
- All images in `assets/sennin/sage/`
- All images in `assets/sennin/sound/`
- All images in `assets/characters/elder/` (duplicates of temp folder)
- All images in `assets/backgrounds/dojo/`
- All images in `assets/backgrounds/forest/`
- All images in `assets/backgrounds/waterfall/`
- `assets/backgrounds/hiragana_no_tou.png`
- `assets/backgrounds/kotoba_no_mori.png`
- `assets/backgrounds/moji_no_doukutsu.png`
- All images in `assets/effects/achievements/`
- All images in `assets/effects/music/`
- All images in `assets/items/decorations/`
- All images in `assets/items/scrolls/`
- All images in `assets/items/weapons/`
- `assets/adaptive-icon.png`
- `assets/favicon.png`
- `assets/icon.png`
- `assets/splash-icon.png`
- `assets/splash.png`
- SVG files in `assets/effects/` (shuriken.svg, target_*.svg) - These are new untracked files

### Temporary Files:
- `assets/temp/mojitama.png` - Not referenced
- `assets/temp/mojitama_blue.png` - Not referenced
- `assets/temp/dojo-background.png` - Not referenced
- `assets/temp/forest-background.png` - Not referenced

## 2. Unused Audio Files

### Currently Used Audio Files:
- `assets/sounds/correct.wav` - Used in multiple places
- `assets/sounds/incorrect.wav` - Used in multiple places
- `assets/sounds/select.mp3` - Used as click sound
- `assets/sounds/level-up.wav` - Used for level up
- `assets/sounds/success.mp3` - Used for success
- `assets/sounds/index_page.mp3` - Used for menu
- `assets/sounds/shuriken.wav` - Used for shuriken sound

### Potentially Unused Audio Files:
- `assets/sounds/bgm.mp3` - Not referenced
- `assets/sounds/levelup.mp3` - Duplicate of level-up.wav
- `assets/sounds/placeholder.mp3` - Not referenced
- `assets/sounds/shuriken.json` - New untracked file, possibly animation data

## 3. Unused Components

### Components in app/components/:
- `LoginBonus.tsx` - Not imported anywhere
- `AIVoiceRecognition.tsx` - Not imported anywhere
- `VoiceRecognition.tsx` - Not imported anywhere
- `StoryScreen.tsx` - Not imported anywhere
- `GameScreen.tsx` - Appears to be used
- `AIModelLoader.tsx` - New untracked file, not imported

## 4. Test Files
- `app/screens/test-tflite.tsx` - Test screen for TensorFlow Lite

## 5. Duplicate Files
- Audio: `levelup.mp3` is a duplicate of `level-up.wav`
- Images: Elder images exist in both `assets/temp/` and `assets/characters/elder/`

## Recommendations

### Safe to Delete:
1. All unused images listed above
2. `assets/sounds/bgm.mp3`
3. `assets/sounds/levelup.mp3` (duplicate)
4. `assets/sounds/placeholder.mp3`
5. Unused components in app/components/ (LoginBonus, AIVoiceRecognition, VoiceRecognition, StoryScreen)
6. Duplicate elder images in `assets/characters/elder/`

### Keep for Now:
1. `app/screens/test-tflite.tsx` - May be needed for testing
2. App icons (adaptive-icon.png, favicon.png, etc.) - May be needed for app build
3. Font files - May be used by the system

### Total Space Savings:
Deleting these unused files would free up significant space and reduce the app bundle size.
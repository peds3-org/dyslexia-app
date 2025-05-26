# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AI initialization loading screens for all game modes
- Pause screen now displays AI judgment history with Top3 results
- Custom hook `useInitialTest` for initial test state management
- Shared constants and types modules for initial test
- API documentation with comprehensive service specifications
- Deployment guide with EAS Build instructions
- Quick reference guide for developers

### Changed
- Refactored initial test code to use custom hooks and shared modules
- Updated README with comprehensive project information
- Enhanced .gitignore with Claude AI related entries
- Improved CLAUDE.md with recent updates section
- One character per set implementation (no duplicates within practice sets)

### Fixed
- TypeScript errors in test components
- Optional chaining for AI result properties
- Router path type errors in navigation

## [1.0.0] - 2024-12-20

### Added
- Initial release of ひらがなにんじゃ (Hiragana Ninja)
- AI-powered speech recognition using TensorFlow Lite
- Ninja-themed gamification system
- Three difficulty stages (Beginner, Intermediate, Advanced)
- Initial diagnostic test with 33 questions
- Moji-dama collection system
- CBT (Cognitive Behavioral Therapy) features
- Login bonus system
- Mission system
- Mood tracking
- Offline support with sync capabilities
- Sound effects and background music
- Character progression system

### Technical Features
- React Native Expo SDK 52
- TypeScript for type safety
- Supabase for backend services
- TensorFlow Lite for speech recognition
- Expo Router for navigation
- React Native Reanimated for animations
- AsyncStorage for offline data
- EAS Build for cloud builds

## [0.9.0] - 2024-11-15 (Beta)

### Added
- Beta version for internal testing
- Basic UI implementation
- Voice recording functionality
- Initial Supabase integration
- Basic authentication flow

### Known Issues
- AI model occasionally fails to load
- Some Android devices have audio recording issues
- Memory usage needs optimization

## [0.5.0] - 2024-10-01 (Alpha)

### Added
- Project scaffolding
- Basic navigation structure
- Initial UI mockups
- Development environment setup

---

## Version History

- **1.0.0** - First production release
- **0.9.0** - Beta release for testing
- **0.5.0** - Alpha release for internal development
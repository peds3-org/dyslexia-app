# Deployment Guide

## Prerequisites

- Expo account with EAS Build access
- Apple Developer account (for iOS)
- Google Play Console account (for Android)
- Supabase project set up
- GitHub repository with release management

## Environment Setup

### 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Configure EAS

```bash
eas build:configure
```

This creates `eas.json` with build profiles.

### 3. Environment Variables

Create `.env.production` file:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Model
EXPO_PUBLIC_AI_MODEL_URL=https://github.com/your-org/dyslexia-app/releases/download/v1.0/model.tflite

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

## Build Configuration

### eas.json

```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "production"
      }
    }
  }
}
```

## Build Process

### Development Build

```bash
# iOS development build
eas build --platform ios --profile development

# Android development build
eas build --platform android --profile development
```

### Production Build

```bash
# iOS production build
eas build --platform ios --profile production

# Android production build
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

## iOS Specific Setup

### 1. Configure app.json

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "org.peds3.hiragananinja",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "ひらがなの読み方を録音するために、マイクへのアクセスが必要です。",
        "NSSpeechRecognitionUsageDescription": "音声認識を使用して発音を評価します。"
      }
    }
  }
}
```

### 2. App Store Connect

1. Create app in App Store Connect
2. Configure app information
3. Add screenshots and app preview
4. Set up TestFlight for beta testing

## Android Specific Setup

### 1. Configure app.json

```json
{
  "expo": {
    "android": {
      "package": "org.peds3.hiragananinja",
      "versionCode": 1,
      "permissions": [
        "RECORD_AUDIO",
        "VIBRATE"
      ]
    }
  }
}
```

### 2. Google Play Console

1. Create app in Play Console
2. Set up internal testing track
3. Upload signed AAB file
4. Complete store listing

## Submission Process

### Automated Submission

```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Google Play
eas submit --platform android --latest
```

### Manual Submission

1. Download build artifacts from EAS
2. Upload to respective stores manually
3. Complete submission forms

## Release Checklist

### Pre-release

- [ ] Update version numbers in app.json
- [ ] Update CHANGELOG.md
- [ ] Run all tests (`npm test`)
- [ ] Test on physical devices
- [ ] Update AI model if needed
- [ ] Review environment variables

### Build

- [ ] Create production builds
- [ ] Test production builds thoroughly
- [ ] Generate release notes

### Submission

- [ ] Submit to TestFlight (iOS)
- [ ] Submit to internal track (Android)
- [ ] Test with beta users
- [ ] Fix any critical issues

### Release

- [ ] Submit for review
- [ ] Monitor crash reports
- [ ] Prepare hotfix process if needed

## Monitoring

### Crash Reporting

Configure Sentry for production monitoring:

```javascript
// app/_layout.tsx
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enableInExpoDevelopment: false,
  debug: false,
});
```

### Analytics

Track key metrics:
- Daily active users
- Session duration
- Feature usage
- Error rates

## Rollback Strategy

If critical issues are found:

1. **Immediate**: Halt phased rollout
2. **Short-term**: Submit hotfix build
3. **Long-term**: Implement feature flags

## Security Considerations

### API Keys

- Never commit sensitive keys
- Use environment variables
- Rotate keys regularly

### Code Signing

- iOS: Managed by EAS
- Android: Upload keystore to EAS

### Data Protection

- Enable SSL pinning
- Implement certificate validation
- Encrypt sensitive local data

## Performance Optimization

### Build Size

- Enable Hermes for Android
- Use ProGuard rules
- Optimize images and assets

### Runtime Performance

- Lazy load heavy components
- Implement code splitting
- Monitor memory usage

## Troubleshooting

### Common Issues

1. **Build failures**
   - Check eas.json configuration
   - Verify environment variables
   - Review build logs

2. **Submission rejected**
   - Review store guidelines
   - Check permissions usage
   - Verify content ratings

3. **Crash on launch**
   - Check native dependencies
   - Verify API endpoints
   - Review initialization code

### Support Channels

- EAS Build status: https://expo.dev/accounts/[account]/builds
- Expo forums: https://forums.expo.dev/
- Project issues: GitHub Issues

## Maintenance

### Regular Updates

- Security patches: Monthly
- Feature updates: Bi-weekly
- Major releases: Quarterly

### Monitoring Checklist

- [ ] Check crash reports daily
- [ ] Review user feedback weekly
- [ ] Monitor API usage
- [ ] Update dependencies monthly
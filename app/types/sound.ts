import { Audio } from 'expo-av';

export interface SoundService {
  isInitialized: boolean;
  initialize(): Promise<void>;
  playBGM(track: string): Promise<boolean>;
  stopBGM(): Promise<boolean>;
  playEffect(effectName: string): Promise<boolean>;
  unloadSounds(): Promise<boolean>;
  toggleSound(enabled: boolean): boolean;
}

export default {} as SoundService; 
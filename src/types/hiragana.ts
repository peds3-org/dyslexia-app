export interface HiraganaType {
  character: string;
  reading: string;
  group?: string;
  isSpecial?: boolean;
}

export interface GameProgress {
  collectedMojitama: string[];
  unlockedCharacters: string[];
  level: number;
  experience: number;
}

// 基本のひらがなリスト
export const basicHiragana: HiraganaType[] = [
  { character: 'あ', reading: 'a' },
  { character: 'い', reading: 'i' },
  { character: 'う', reading: 'u' },
  { character: 'え', reading: 'e' },
  { character: 'お', reading: 'o' },
  { character: 'か', reading: 'ka' },
  { character: 'き', reading: 'ki' },
  { character: 'く', reading: 'ku' },
  { character: 'け', reading: 'ke' },
  { character: 'こ', reading: 'ko' },
  { character: 'さ', reading: 'sa' },
  { character: 'し', reading: 'shi' },
  { character: 'す', reading: 'su' },
  { character: 'せ', reading: 'se' },
  { character: 'そ', reading: 'so' },
  { character: 'た', reading: 'ta' },
  { character: 'ち', reading: 'chi' },
  { character: 'つ', reading: 'tsu' },
  { character: 'て', reading: 'te' },
  { character: 'と', reading: 'to' },
  { character: 'な', reading: 'na' },
  { character: 'に', reading: 'ni' },
  { character: 'ぬ', reading: 'nu' },
  { character: 'ね', reading: 'ne' },
  { character: 'の', reading: 'no' },
  { character: 'は', reading: 'ha' },
  { character: 'ひ', reading: 'hi' },
  { character: 'ふ', reading: 'fu' },
  { character: 'へ', reading: 'he' },
  { character: 'ほ', reading: 'ho' },
  { character: 'ま', reading: 'ma' },
  { character: 'み', reading: 'mi' },
  { character: 'む', reading: 'mu' },
  { character: 'め', reading: 'me' },
  { character: 'も', reading: 'mo' },
  { character: 'や', reading: 'ya' },
  { character: 'ゆ', reading: 'yu' },
  { character: 'よ', reading: 'yo' },
  { character: 'ら', reading: 'ra' },
  { character: 'り', reading: 'ri' },
  { character: 'る', reading: 'ru' },
  { character: 'れ', reading: 're' },
  { character: 'ろ', reading: 'ro' },
  { character: 'わ', reading: 'wa' },
  { character: 'を', reading: 'wo' },
  { character: 'ん', reading: 'n' }
];

export default basicHiragana; 
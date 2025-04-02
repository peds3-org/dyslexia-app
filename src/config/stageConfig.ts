import { StageConfig, StageType } from '../types/progress';

// 一部のStageTypeのみ実装
const stageConfigs: Partial<Record<StageType, StageConfig>> = {
  [StageType.BEGINNER]: {
    type: StageType.BEGINNER,
    requiredCorrectCount: 5,
    timeLimit: 60,
    characters: [
      'あ', 'い', 'う', 'え', 'お',
      'か', 'き', 'く', 'け', 'こ',
      'さ', 'し', 'す', 'せ', 'そ',
      'た', 'ち', 'つ', 'て', 'と',
      'な', 'に', 'ぬ', 'ね', 'の',
      'は', 'ひ', 'ふ', 'へ', 'ほ',
      'ま', 'み', 'む', 'め', 'も',
      'や', 'ゆ', 'よ',
      'ら', 'り', 'る', 'れ', 'ろ',
      'わ', 'を', 'ん'
    ],
    readings: {
      'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
      'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
      'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
      'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
      'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
      'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
      'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
      'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
      'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
      'わ': 'wa', 'を': 'wo', 'ん': 'n'
    },
    backgroundImage: require('../../assets/temp/haikei.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: 'はじめての もじのしゅぎょう',
    storyText: 'よくぞ きてくれた、わかものよ。\nここでは ひらがなの もじを べんきょうするのじゃ。\n「あ」から「ん」まで、ぜんぶで 46もじを\nひとつずつ こえに だして れんしゅう しよう。\n\nまずは「あいうえお」から はじめて、\nすこしずつ むずかしい もじにも ちょうせん するのじゃ！',
    buttonText: 'しゅぎょうを はじめる',
  },
  [StageType.INTERMEDIATE]: {
    type: StageType.INTERMEDIATE,
    requiredCorrectCount: 8,
    timeLimit: 45,
    characters: [
      'が', 'ぎ', 'ぐ', 'げ', 'ご',
      'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
      'だ', 'ぢ', 'づ', 'で', 'ど',
      'ば', 'び', 'ぶ', 'べ', 'ぼ',
      'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'
    ],
    readings: {
      'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
      'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
      'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
      'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
      'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po'
    },
    backgroundImage: require('../../assets/backgrounds/sato.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: '点々と丸の文字を救え！',
    storyText: 'おや、大変だ！\n点々（゛）や丸（゜）がついた文字たちが、\n魔法使いに閉じ込められてしまったようじゃ。\n\n「が」「ざ」「だ」「ば」は点々（゛）、\n「ぱ」は丸（゜）がついた文字じゃ。\n\n正しく読んで、文字たちを救い出してくれ！',
    buttonText: '文字たちを救出する',
  },
  [StageType.ADVANCED]: {
    type: StageType.ADVANCED,
    requiredCorrectCount: 10,
    timeLimit: 30,
    characters: ['さ', 'し', 'す', 'せ', 'そ'],
    readings: {
      'さ': 'sa',
      'し': 'shi',
      'す': 'su',
      'せ': 'se',
      'そ': 'so'
    },
    backgroundImage: require('../../assets/backgrounds/sato.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: '最終試練',
    storyText: 'ここまで来たか。\n最後の試練に挑戦する準備はできているか？\n全ての技を駆使して挑むのだ。',
    buttonText: '試練に挑む',
  },
};

export default stageConfigs; 
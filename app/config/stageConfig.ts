// メトロバンドラーのキャッシュとTypeScriptの解決の問題を回避するための修正
// 循環参照を回避するためcommon.tsからインポート
import { StageConfig, StageType } from '../types/common';

// 一部のStageTypeのみ実装
const stageConfigs: Record<StageType, StageConfig> = {
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
      'あ': 'あ', 'い': 'い', 'う': 'う', 'え': 'え', 'お': 'お',
      'か': 'か', 'き': 'き', 'く': 'く', 'け': 'け', 'こ': 'こ',
      'さ': 'さ', 'し': 'し', 'す': 'す', 'せ': 'せ', 'そ': 'そ',
      'た': 'た', 'ち': 'ち', 'つ': 'つ', 'て': 'て', 'と': 'と',
      'な': 'な', 'に': 'に', 'ぬ': 'ぬ', 'ね': 'ね', 'の': 'の',
      'は': 'は', 'ひ': 'ひ', 'ふ': 'ふ', 'へ': 'へ', 'ほ': 'ほ',
      'ま': 'ま', 'み': 'み', 'む': 'む', 'め': 'め', 'も': 'も',
      'や': 'や', 'ゆ': 'ゆ', 'よ': 'よ',
      'ら': 'ら', 'り': 'り', 'る': 'る', 'れ': 'れ', 'ろ': 'ろ',
      'わ': 'わ', 'を': 'を', 'ん': 'ん'
    },
    backgroundImage: require('../../assets/temp/haikei.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: 'はじめてのしゅぎょう',
    storyText: 'ひらがなのれんしゅうをしましょう。\nせんせいのまねをして、もじをよんでください。',
    buttonText: 'はじめる'
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
      'が': 'が', 'ぎ': 'ぎ', 'ぐ': 'ぐ', 'げ': 'げ', 'ご': 'ご',
      'ざ': 'ざ', 'じ': 'じ', 'ず': 'ず', 'ぜ': 'ぜ', 'ぞ': 'ぞ',
      'だ': 'だ', 'ぢ': 'ぢ', 'づ': 'づ', 'で': 'で', 'ど': 'ど',
      'ば': 'ば', 'び': 'び', 'ぶ': 'ぶ', 'べ': 'べ', 'ぼ': 'ぼ',
      'ぱ': 'ぱ', 'ぴ': 'ぴ', 'ぷ': 'ぷ', 'ぺ': 'ぺ', 'ぽ': 'ぽ'
    },
    backgroundImage: require('../../assets/backgrounds/sato.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: '点々と丸の文字を救え！',
    storyText: 'おや、大変だ！\n点々（゛）や丸（゜）がついた文字たちが、\n魔法使いに閉じ込められてしまったようじゃ。\n\n「が」「ざ」「だ」「ば」は点々（゛）、\n「ぱ」は丸（゜）がついた文字じゃ。\n\n正しく読んで、文字たちを救い出してくれ！',
    buttonText: '文字たちを救出する'
  },
  [StageType.ADVANCED]: {
    type: StageType.ADVANCED,
    requiredCorrectCount: 10,
    timeLimit: 30,
    characters: ['さ', 'し', 'す', 'せ', 'そ'],
    readings: {
      'さ': 'さ',
      'し': 'し',
      'す': 'す',
      'せ': 'せ',
      'そ': 'そ'
    },
    backgroundImage: require('../../assets/backgrounds/sato.png'),
    elderImage: require('../../assets/temp/elder-worried.png'),
    storyTitle: '最終試練',
    storyText: 'ここまで来たか。\n最後の試練に挑戦する準備はできているか？\n全ての技を駆使して挑むのだ。',
    buttonText: '試練に挑む'
  }
};

export default stageConfigs; 
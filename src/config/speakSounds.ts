// Import all sounds from index file to avoid Unicode filename issues
const soundFiles = require('../../assets/sounds/speak/index.js');

/**
 * ひらがな音声ファイルのマッピング
 */
export const HIRAGANA_SOUNDS: { [key: string]: any } = {
  // あ行
  'あ': soundFiles.a,
  'い': soundFiles.i,
  'う': soundFiles.u,
  'え': soundFiles.e,
  'お': soundFiles.o,
  
  // か行
  'か': soundFiles.ka,
  'き': soundFiles.ki,
  'く': soundFiles.ku,
  'け': soundFiles.ke,
  'こ': soundFiles.ko,
  
  // が行
  'が': soundFiles.ga,
  'ぎ': soundFiles.gi,
  'ぐ': soundFiles.gu,
  'げ': soundFiles.ge,
  'ご': soundFiles.go,
  
  // さ行
  'さ': soundFiles.sa,
  'し': soundFiles.shi,
  'す': soundFiles.su,
  'せ': soundFiles.se,
  'そ': soundFiles.so,
  
  // ざ行
  'ざ': soundFiles.za,
  'じ': soundFiles.ji,
  'ず': soundFiles.zu,
  'ぜ': soundFiles.ze,
  'ぞ': soundFiles.zo,
  
  // た行
  'た': soundFiles.ta,
  'ち': soundFiles.chi,
  'つ': soundFiles.tsu,
  'て': soundFiles.te,
  'と': soundFiles.to,
  
  // だ行
  'だ': soundFiles.da,
  'ぢ': soundFiles.di,
  'づ': soundFiles.du,
  'で': soundFiles.de,
  'ど': soundFiles.do,
  
  // な行
  'な': soundFiles.na,
  'に': soundFiles.ni,
  'ぬ': soundFiles.nu,
  'ね': soundFiles.ne,
  'の': soundFiles.no,
  
  // は行
  'は': soundFiles.ha,
  'ひ': soundFiles.hi,
  'ふ': soundFiles.fu,
  'へ': soundFiles.he,
  'ほ': soundFiles.ho,
  
  // ば行
  'ば': soundFiles.ba,
  'び': soundFiles.bi,
  'ぶ': soundFiles.bu,
  'べ': soundFiles.be,
  'ぼ': soundFiles.bo,
  
  // ぱ行
  'ぱ': soundFiles.pa,
  'ぴ': soundFiles.pi,
  'ぷ': soundFiles.pu,
  'ぺ': soundFiles.pe,
  'ぽ': soundFiles.po,
  
  // ま行
  'ま': soundFiles.ma,
  'み': soundFiles.mi,
  'む': soundFiles.mu,
  'め': soundFiles.me,
  'も': soundFiles.mo,
  
  // や行
  'や': soundFiles.ya,
  'ゆ': soundFiles.yu,
  'よ': soundFiles.yo,
  
  // ら行
  'ら': soundFiles.ra,
  'り': soundFiles.ri,
  'る': soundFiles.ru,
  'れ': soundFiles.re,
  'ろ': soundFiles.ro,
  
  // わ行
  'わ': soundFiles.wa,
  'を': soundFiles.wo,
  'ん': soundFiles.n,
  
  // 拗音 - きゃ行
  'きゃ': soundFiles.kya,
  'きゅ': soundFiles.kyu,
  'きょ': soundFiles.kyo,
  
  // 拗音 - ぎゃ行
  'ぎゃ': soundFiles.gya,
  'ぎゅ': soundFiles.gyu,
  'ぎょ': soundFiles.gyo,
  
  // 拗音 - しゃ行
  'しゃ': soundFiles.sha,
  'しゅ': soundFiles.shu,
  'しょ': soundFiles.sho,
  
  // 拗音 - じゃ行
  'じゃ': soundFiles.ja,
  'じゅ': soundFiles.ju,
  'じょ': soundFiles.jo,
  
  // 拗音 - ちゃ行
  'ちゃ': soundFiles.cha,
  'ちゅ': soundFiles.chu,
  'ちょ': soundFiles.cho,
  
  // 拗音 - にゃ行
  'にゃ': soundFiles.nya,
  'にゅ': soundFiles.nyu,
  'にょ': soundFiles.nyo,
  
  // 拗音 - ひゃ行
  'ひゃ': soundFiles.hya,
  'ひゅ': soundFiles.hyu,
  'ひょ': soundFiles.hyo,
  
  // 拗音 - びゃ行
  'びゃ': soundFiles.bya,
  'びゅ': soundFiles.byu,
  'びょ': soundFiles.byo,
  
  // 拗音 - ぴゃ行
  'ぴゃ': soundFiles.pya,
  'ぴゅ': soundFiles.pyu,
  'ぴょ': soundFiles.pyo,
  
  // 拗音 - みゃ行
  'みゃ': soundFiles.mya,
  'みゅ': soundFiles.myu,
  'みょ': soundFiles.myo,
  
  // 拗音 - りゃ行
  'りゃ': soundFiles.rya,
  'りゅ': soundFiles.ryu,
  'りょ': soundFiles.ryo,
};

/**
 * 音声ファイルが存在するかチェック
 */
export const hasSoundFile = (character: string): boolean => {
  return character in HIRAGANA_SOUNDS;
};

/**
 * 音声ファイルを取得
 */
export const getSoundFile = (character: string): any | null => {
  return HIRAGANA_SOUNDS[character] || null;
};
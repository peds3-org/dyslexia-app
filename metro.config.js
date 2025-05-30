const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// エイリアスパスの設定
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname),
  '@src': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'components'),
  '@assets': path.resolve(__dirname, 'assets'),
  '@app': path.resolve(__dirname, 'app'),
};

// MP3ファイルをアセットとして認識させる（TFLiteは除外）
config.resolver.assetExts = [...config.resolver.assetExts.filter(ext => ext !== 'tflite'), 'mp3'];

// 大きなファイルをバンドルから除外
config.resolver.blacklistRE = /.*\.tflite$/;

// Unicode文字を含むファイル名の処理を改善
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer.minifierConfig,
    keep_fnames: true,
  },
};

// アセットプラグインの設定
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;

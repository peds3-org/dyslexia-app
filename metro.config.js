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

// TFLiteファイルをアセットとして認識させる
config.resolver.assetExts = [...config.resolver.assetExts, 'tflite'];

module.exports = config;

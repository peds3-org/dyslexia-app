module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo']],
    plugins: [
      // Required for expo-router
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@src': './src',
            '@components': './components',
            '@assets': './assets',
            '@app': './app',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};

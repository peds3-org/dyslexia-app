module.exports = ({ config }) => {
  // Supabase接続情報をEAS secretsまたは環境変数から取得
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      'expo-asset',
      [
        'react-native-fast-tflite',
        {
          enableCoreMLDelegate: false,
          enableAndroidGpuLibraries: ['libOpenCL-pixel.so', 'libGLES_mali.so'],
        },
      ],
    ],
    extra: {
      ...config.extra,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    },
  };
};

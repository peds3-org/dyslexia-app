module.exports = ({ config }) => {
  // 本番環境用のSupabase接続情報
  // 注意: 実際の値は.envファイルまたはEAS secretsから取得するのが望ましい
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zsnkknassjykjyldnuvn.supabase.co';
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbmtrbmFzc2p5a2p5bGRudXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI0MzI0NTAsImV4cCI6MjAxODAwODQ1MH0.G2UZW8OBvxh7KtPqA8gkvfX6P-Fd-rVeQfUyDV8qkzM';

  return {
    ...config,
    plugins: [...(config.plugins || []), /* 'react-native-fast-tflite', */ 'expo-asset'],
    extra: {
      ...config.extra,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
    },
  };
};

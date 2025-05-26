# Supabase Setup Guide

## Storage Buckets

以下のバケットを作成する必要があります：

### 1. practice-audio バケット
練習中の音声ファイルを保存するためのバケット

```sql
-- Supabase SQLエディタで実行
INSERT INTO storage.buckets (id, name, public)
VALUES ('practice-audio', 'practice-audio', true);
```

### 2. バケットのポリシー設定

```sql
-- 認証されたユーザーがアップロードできるようにする
CREATE POLICY "Authenticated users can upload practice audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'practice-audio');

-- 認証されたユーザーが自分のファイルを読み取れるようにする
CREATE POLICY "Users can read their own practice audio"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'practice-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 認証されたユーザーが自分のファイルを削除できるようにする
CREATE POLICY "Users can delete their own practice audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'practice-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Database Tables

練習記録を保存するためのテーブル：

```sql
-- practice_records テーブル
CREATE TABLE IF NOT EXISTS practice_records (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  character TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time FLOAT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  audio_url TEXT,
  ai_result JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- インデックス作成
CREATE INDEX idx_practice_records_user_id ON practice_records(user_id);
CREATE INDEX idx_practice_records_timestamp ON practice_records(timestamp);

-- RLSを有効化
ALTER TABLE practice_records ENABLE ROW LEVEL SECURITY;

-- ポリシー作成
CREATE POLICY "Users can insert their own practice records"
ON practice_records FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own practice records"
ON practice_records FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice records"
ON practice_records FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## 確認方法

1. Supabaseダッシュボードにログイン
2. Storageセクションで`practice-audio`バケットが作成されていることを確認
3. SQLエディタで上記のSQL文を実行
4. Authenticationセクションでユーザーが作成されていることを確認

## トラブルシューティング

### "Bucket not found"エラーが出る場合
1. 上記のバケット作成SQLを実行したか確認
2. バケット名が正確に`practice-audio`になっているか確認
3. Supabase URLとAnon Keyが正しく設定されているか確認

### ファイルアップロードが失敗する場合
1. ユーザーが認証されているか確認
2. ポリシーが正しく設定されているか確認
3. ファイルサイズが制限内か確認（デフォルト50MB）
#!/usr/bin/env python3
"""
ローカルでサーバーをテストするスクリプト
"""
import asyncio
import base64
import httpx
import sys
from pathlib import Path

# テスト用の音声ファイル（2秒の無音）
def create_test_audio():
    """テスト用のWAVファイルを生成"""
    import wave
    import array
    
    # 16kHz, 16bit, モノラル, 2秒
    sample_rate = 16000
    duration = 2
    num_samples = sample_rate * duration
    
    # 無音データ（実際のテストでは録音した音声を使用）
    audio_data = array.array('h', [0] * num_samples)
    
    # WAVファイルとして保存
    test_file = Path("test_audio.wav")
    with wave.open(str(test_file), 'w') as wav:
        wav.setnchannels(1)  # モノラル
        wav.setsampwidth(2)  # 16bit
        wav.setframerate(sample_rate)
        wav.writeframes(audio_data.tobytes())
    
    return test_file

async def test_server(server_url: str = "http://localhost:8000", api_key: str = None):
    """サーバーの動作をテスト"""
    
    async with httpx.AsyncClient() as client:
        # 1. ヘルスチェック
        print("1. ヘルスチェック...")
        try:
            response = await client.get(f"{server_url}/health")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
        except Exception as e:
            print(f"   Error: {e}")
            return
        
        # 2. 推論テスト
        print("\n2. 推論テスト...")
        
        # テスト音声を作成
        test_audio = create_test_audio()
        
        # Base64エンコード
        with open(test_audio, 'rb') as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # リクエスト送信
        headers = {}
        if api_key:
            headers['Authorization'] = f"Bearer {api_key}"
        
        try:
            response = await client.post(
                f"{server_url}/predict",
                json={
                    "audio_base64": audio_base64,
                    "sample_rate": 16000
                },
                headers=headers,
                timeout=30.0
            )
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Success: {result['success']}")
                if result['success']:
                    print("   Top predictions:")
                    for i, pred in enumerate(result['predictions'][:3]):
                        print(f"     {i+1}. {pred['character']} ({pred['confidence']:.2%})")
                else:
                    print(f"   Error: {result.get('error', 'Unknown error')}")
            else:
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"   Error: {e}")
        
        finally:
            # テストファイルを削除
            test_audio.unlink()

if __name__ == "__main__":
    server_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    api_key = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"Testing server at: {server_url}")
    if api_key:
        print("Using API key authentication")
    
    asyncio.run(test_server(server_url, api_key))
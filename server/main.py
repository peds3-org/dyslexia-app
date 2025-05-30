#!/usr/bin/env python3
"""
TFLite AI Server for Hiragana Ninja
Handles audio processing and TFLite model inference
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, List, Tuple
import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import tensorflow as tf
import librosa
import io
import base64
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Settings
class Settings(BaseSettings):
    model_path: str = "./model/tfkeras_weight.tflite"
    api_key: Optional[str] = None
    port: int = 8000
    host: str = "0.0.0.0"
    max_request_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"

settings = Settings()

# Debug: Log API key status
logger.info(f"API Key configured: {bool(settings.api_key)}")
if settings.api_key:
    logger.info(f"API Key starts with: {settings.api_key[:10]}...")

# API Models
class AudioRequest(BaseModel):
    audio_base64: str
    sample_rate: int = 16000
    
class PredictionItem(BaseModel):
    character: str
    confidence: float

class PredictionResponse(BaseModel):
    success: bool
    predictions: List[PredictionItem]
    processing_time_ms: float
    error: Optional[str] = None

# Class labels
CLASS_LABELS = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'さ', 'し', 'す', 'せ', 'そ',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'た', 'ち', 'つ', 'て', 'と',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'ゐ', 'ゑ', 'を', 'ん',
    'しゃ', 'しゅ', 'しょ',
    'ちゃ', 'ちゅ', 'ちょ',
    'じゃ', 'じゅ', 'じょ',
    'きゃ', 'きゅ', 'きょ',
    'ぎゃ', 'ぎゅ', 'ぎょ',
    'にゃ', 'にゅ', 'にょ',
    'ひゃ', 'ひゅ', 'ひょ',
    'びゃ', 'びゅ', 'びょ',
    'ぴゃ', 'ぴゅ', 'ぴょ',
    'みゃ', 'みゅ', 'みょ',
    'りゃ', 'りゅ', 'りょ'
]

# TFLite Model Manager
class TFLiteModel:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.interpreter = None
        self.input_details = None
        self.output_details = None
        
    def load(self):
        """Load TFLite model"""
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
                
            logger.info(f"Loading TFLite model from {self.model_path}")
            self.interpreter = tf.lite.Interpreter(model_path=self.model_path)
            self.interpreter.allocate_tensors()
            
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            
            logger.info(f"Model loaded successfully")
            logger.info(f"Input shape: {self.input_details[0]['shape']}")
            logger.info(f"Output shape: {self.output_details[0]['shape']}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
            
    def predict(self, audio_data: np.ndarray) -> np.ndarray:
        """Run inference on audio data"""
        if self.interpreter is None:
            raise RuntimeError("Model not loaded")
            
        # Set input tensor
        self.interpreter.set_tensor(self.input_details[0]['index'], audio_data)
        
        # Run inference
        self.interpreter.invoke()
        
        # Get output
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])
        return output_data

# Audio Processing
def preprocess_audio(audio_bytes: bytes, sample_rate: int) -> np.ndarray:
    """Preprocess audio for model input"""
    try:
        # Load audio from bytes
        audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=sample_rate, mono=True)
        
        # Ensure 2 seconds of audio (32000 samples at 16kHz)
        target_length = 32000
        current_length = len(audio_data)
        
        if current_length < target_length:
            # Pad with zeros
            audio_data = np.pad(audio_data, (0, target_length - current_length), mode='constant')
        elif current_length > target_length:
            # Trim to target length
            audio_data = audio_data[:target_length]
            
        # Normalize audio
        if np.max(np.abs(audio_data)) > 0:
            audio_data = audio_data / np.max(np.abs(audio_data))
            
        # Reshape for model input (add batch dimension only)
        audio_data = audio_data.reshape(1, -1).astype(np.float32)
        
        return audio_data
        
    except Exception as e:
        logger.error(f"Audio preprocessing failed: {e}")
        raise

# Initialize FastAPI app
app = FastAPI(
    title="Hiragana Ninja AI Server",
    description="TFLite inference server for hiragana speech recognition",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model: Optional[TFLiteModel] = None

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    global model
    try:
        # モデルファイルが存在しない場合はダウンロード
        if not os.path.exists(settings.model_path):
            logger.info("Model file not found. Downloading...")
            os.makedirs(os.path.dirname(settings.model_path), exist_ok=True)
            
            # download_model.pyのロジックを実行
            import subprocess
            result = subprocess.run([sys.executable, "download_model.py"], capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"Model download failed: {result.stderr}")
                raise Exception("Model download failed")
            logger.info("Model download completed")
        
        model = TFLiteModel(settings.model_path)
        model.load()
        logger.info("Server startup complete")
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        logger.warning("Starting server without model for testing")
        # sys.exit(1)  # コメントアウトしてサーバーを起動させる

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: AudioRequest, authorization: Optional[str] = Header(None)):
    """Predict hiragana from audio"""
    start_time = datetime.utcnow()
    
    # Check API key if configured
    if settings.api_key and authorization != f"Bearer {settings.api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(request.audio_base64)
        
        # Preprocess audio
        audio_data = preprocess_audio(audio_bytes, request.sample_rate)
        
        # Run inference
        predictions = model.predict(audio_data)
        
        # Get top predictions
        probs = predictions[0]
        top_indices = np.argsort(probs)[-5:][::-1]  # Top 5
        
        results = []
        for idx in top_indices:
            if idx < len(CLASS_LABELS):
                results.append(PredictionItem(
                    character=CLASS_LABELS[idx],
                    confidence=float(probs[idx])
                ))
                
        # Calculate processing time
        processing_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return PredictionResponse(
            success=True,
            predictions=results,
            processing_time_ms=processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return PredictionResponse(
            success=False,
            predictions=[],
            processing_time_ms=0,
            error=str(e)
        )

@app.post("/predict_file")
async def predict_file(file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    """Predict hiragana from uploaded audio file"""
    # Check API key if configured
    if settings.api_key and authorization != f"Bearer {settings.api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        # Read file
        audio_bytes = await file.read()
        
        # Convert to base64 for consistency with main endpoint
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Use main prediction logic
        request = AudioRequest(audio_base64=audio_base64)
        return await predict(request, authorization)
        
    except Exception as e:
        logger.error(f"File prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
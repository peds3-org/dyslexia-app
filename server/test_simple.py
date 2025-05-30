#!/usr/bin/env python3
"""
簡易テストサーバー（モデルなし）
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello from Hiragana Ninja AI Server"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": False,
        "test_mode": True
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
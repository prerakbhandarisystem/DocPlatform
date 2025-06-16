#!/usr/bin/env python3
"""
Simple test script for AI service
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.ai_service import AIService
    print("✅ AI Service imported successfully!")
    
    # Test provider detection
    ai = AIService()
    print(f"🤖 Detected AI provider: {ai.provider}")
    
    if ai.provider == "google":
        print("🎉 Google AI is configured and ready!")
    elif ai.provider == "openai":
        print("🎉 OpenAI is configured and ready!")
    else:
        print("⚠️  No AI provider configured. Add GOOGLE_AI_API_KEY to your .env file")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}") 
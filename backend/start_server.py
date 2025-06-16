#!/usr/bin/env python3
"""
Simple startup script for the DocPlatform backend
"""

import os
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = current_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
    logger.info(f"✅ Loaded environment variables from {env_path}")
else:
    logger.warning(f"⚠️  No .env file found at {env_path}")

# Print environment variables for debugging
logger.info("\n🔧 Environment Variables:")
logger.info(f"SECRET_KEY: {'✅ Set' if os.getenv('SECRET_KEY') else '❌ Missing'}")
logger.info(f"DATABASE_URL: {'✅ Set' if os.getenv('DATABASE_URL') else '❌ Missing'}")
logger.info(f"ENVIRONMENT: {os.getenv('ENVIRONMENT', 'Not set')}")
logger.info(f"GOOGLE_CLIENT_ID: {'✅ Set' if os.getenv('GOOGLE_CLIENT_ID') else '❌ Missing'}")
logger.info(f"GOOGLE_CLIENT_SECRET: {'✅ Set' if os.getenv('GOOGLE_CLIENT_SECRET') else '❌ Missing'}")
logger.info(f"GOOGLE_REDIRECT_URI: {'✅ Set' if os.getenv('GOOGLE_REDIRECT_URI') else '❌ Missing'}")

# Check for credentials.json
credentials_path = current_dir / "credentials.json"
logger.info(f"\n🔑 Google Drive Credentials:")
logger.info(f"credentials.json: {'✅ Found' if credentials_path.exists() else '❌ Missing'}")
if credentials_path.exists():
    logger.info(f"📁 Location: {credentials_path}")
else:
    logger.warning("⚠️ Please download credentials.json from Google Cloud Console")
    logger.warning("📝 Instructions:")
    logger.warning("1. Go to https://console.cloud.google.com")
    logger.warning("2. Select your project")
    logger.warning("3. Go to APIs & Services > Credentials")
    logger.warning("4. Download OAuth 2.0 Client ID as JSON")
    logger.warning("5. Save as 'credentials.json' in the backend directory")

# Start the server
if __name__ == "__main__":
    import uvicorn
    
    logger.info("\n🚀 Starting DocPlatform Backend...")
    logger.info("📍 http://localhost:8000")
    logger.info("📖 API Docs: http://localhost:8000/docs")
    logger.info("🏥 Health Check: http://localhost:8000/health")
    
    try:
        # Configure uvicorn with more detailed logging
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="debug",
            access_log=True,
            use_colors=True,
            proxy_headers=True,
            server_header=True,
            date_header=True
        )
    except Exception as e:
        logger.error(f"❌ Failed to start server: {str(e)}", exc_info=True)
        sys.exit(1) 
#!/usr/bin/env python3
"""
Setup script for Google Drive authentication
"""

import os
import sys
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import pickle

SCOPES = ['https://www.googleapis.com/auth/drive.file']

def setup_google_drive():
    """Interactive setup for Google Drive authentication"""
    print("🔧 Setting up Google Drive integration...")
    
    # Check if credentials.json exists
    if not os.path.exists('credentials.json'):
        print("❌ Error: credentials.json not found!")
        print("Please download your Google Drive API credentials from:")
        print("https://console.cloud.google.com/apis/credentials")
        print("Save the file as 'credentials.json' in the backend directory.")
        return False
    
    try:
        # This will trigger the authentication flow
        print("🔐 Starting authentication flow...")
        print("A browser window will open for Google authentication.")
        print("Please log in and grant permissions.")
        
        creds = None
        token_path = 'token.pickle'
        
        if os.path.exists(token_path):
            print("✅ Found existing token.pickle")
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                print("🔄 Refreshing expired credentials...")
                creds.refresh(Request())
            else:
                print("✅ Found credentials.json, starting OAuth flow...")
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', 
                    SCOPES
                )
                
                # Use port 3000 for OAuth callback
                creds = flow.run_local_server(
                    port=3000,
                    access_type='offline'
                )
            
            print("💾 Saving credentials to token.pickle...")
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
        
        print("✅ Google Drive authentication successful!")
        return True
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

if __name__ == "__main__":
    setup_google_drive() 
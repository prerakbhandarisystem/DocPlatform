import os
import io
from typing import Optional, List, Dict
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import pickle
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.file']
PLATFORM_FOLDER_NAME = "GPT DOC PLATFORM"

class GoogleDriveService:
    def __init__(self):
        self.service = None
        self.platform_folder_id = None
        self._authenticate()
        self._ensure_platform_folder()
    
    def _authenticate(self):
        """Authenticate with Google Drive API"""
        creds = None
        token_path = 'token.pickle'
        
        logger.info("🔍 Starting Google Drive authentication...")
        
        try:
            if os.path.exists(token_path):
                logger.info("✅ Found existing token.pickle")
                with open(token_path, 'rb') as token:
                    creds = pickle.load(token)
                logger.info(f"📄 Token loaded: {creds}")
            else:
                logger.warning("⚠️ No token.pickle found")
            
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    logger.info("🔄 Refreshing expired credentials...")
                    try:
                        creds.refresh(Request())
                        logger.info("✅ Credentials refreshed successfully")
                    except Exception as e:
                        logger.error(f"❌ Failed to refresh credentials: {str(e)}")
                        creds = None
                else:
                    # Get credentials from environment variables
                    client_id = os.getenv('GOOGLE_CLIENT_ID')
                    client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
                    redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000')
                    
                    if not client_id or not client_secret:
                        logger.error("❌ Google credentials not found in environment variables!")
                        raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables")
                    
                    logger.info("✅ Found Google credentials in environment variables")
                    logger.info(f"🔗 Redirect URI: {redirect_uri}")
                    
                    # Create credentials from environment variables
                    client_config = {
                        "installed": {
                            "client_id": client_id,
                            "client_secret": client_secret,
                            "redirect_uris": [redirect_uri],
                            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                            "token_uri": "https://oauth2.googleapis.com/token"
                        }
                    }
                    
                    flow = InstalledAppFlow.from_client_config(
                        client_config,
                        SCOPES
                    )
                    
                    # Use port 3000 for OAuth callback
                    creds = flow.run_local_server(
                        port=3000,
                        access_type='offline',
                        redirect_uri=redirect_uri
                    )
                    logger.info("✅ OAuth flow completed successfully")
                
                logger.info("💾 Saving credentials to token.pickle...")
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
                logger.info("✅ Credentials saved successfully")
            
            logger.info("🔧 Building Google Drive service...")
            self.service = build('drive', 'v3', credentials=creds)
            logger.info("✅ Google Drive service initialized successfully!")
            
            # Test the service with a simple API call
            try:
                logger.info("🧪 Testing Google Drive service...")
                result = self.service.files().list(pageSize=1, fields="files(id, name)").execute()
                logger.info(f"✅ Service test successful: {result}")
            except Exception as e:
                logger.error(f"❌ Service test failed: {str(e)}")
                raise
            
        except Exception as e:
            logger.error(f"❌ Authentication failed: {str(e)}")
            raise
    
    def _ensure_platform_folder(self):
        """Find or create the GPT DOC PLATFORM folder"""
        try:
            if not self.service:
                logger.error("❌ Google Drive service not authenticated")
                return
            
            logger.info(f"🔍 Looking for '{PLATFORM_FOLDER_NAME}' folder...")
            
            # Search for existing folder
            query = f"name='{PLATFORM_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            results = self.service.files().list(
                q=query,
                fields="files(id, name)"
            ).execute()
            
            folders = results.get('files', [])
            
            if folders:
                self.platform_folder_id = folders[0]['id']
                logger.info(f"✅ Found existing '{PLATFORM_FOLDER_NAME}' folder with ID: {self.platform_folder_id}")
            else:
                # Create the folder
                logger.info(f"📁 Creating '{PLATFORM_FOLDER_NAME}' folder...")
                folder_metadata = {
                    'name': PLATFORM_FOLDER_NAME,
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                
                folder = self.service.files().create(
                    body=folder_metadata,
                    fields='id'
                ).execute()
                
                self.platform_folder_id = folder['id']
                logger.info(f"✅ Created '{PLATFORM_FOLDER_NAME}' folder with ID: {self.platform_folder_id}")
                
        except Exception as e:
            logger.error(f"❌ Error ensuring platform folder: {str(e)}")
            self.platform_folder_id = None
    
    def upload_document(self, file_data: bytes, filename: str, mime_type: str) -> Optional[str]:
        """Upload document to Google Drive in the GPT DOC PLATFORM folder and return file ID"""
        try:
            if not self.service:
                logger.error("❌ Google Drive service not authenticated")
                return None
            
            if not self.platform_folder_id:
                logger.warning("⚠️ Platform folder not available, uploading to root")
            
            logger.info(f"📤 Uploading {filename} to Google Drive...")
            logger.info(f"📄 File type: {mime_type}")
            logger.info(f"📦 File size: {len(file_data)} bytes")
            logger.info(f"📁 Target folder: {PLATFORM_FOLDER_NAME} ({self.platform_folder_id})")
            
            # First, upload the file with its original mime type
            file_metadata = {
                'name': filename
            }
            
            # Add parent folder if available
            if self.platform_folder_id:
                file_metadata['parents'] = [self.platform_folder_id]
            
            media = MediaIoBaseUpload(
                io.BytesIO(file_data),
                mimetype=mime_type,
                resumable=True
            )
            
            # Upload the file
            logger.info("📤 Creating file in Google Drive...")
            try:
                file = self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id,webViewLink'
                ).execute()
                
                logger.info(f"✅ File created with ID: {file['id']}")
            except Exception as e:
                logger.error(f"❌ Error creating file in Google Drive: {str(e)}")
                return None
            
            # Only try to convert if it's a supported format
            supported_formats = [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'application/pdf'
            ]
            
            if mime_type in supported_formats:
                try:
                    # Convert to Google Docs format
                    logger.info("🔄 Converting to Google Docs format...")
                    converted_metadata = {'mimeType': 'application/vnd.google-apps.document'}
                    
                    # Keep the file in the same folder
                    if self.platform_folder_id:
                        converted_metadata['parents'] = [self.platform_folder_id]
                    
                    converted_file = self.service.files().copy(
                        fileId=file['id'],
                        body=converted_metadata
                    ).execute()
                    
                    logger.info(f"✅ File converted with ID: {converted_file['id']}")
                    
                    # Delete the original file
                    logger.info("🗑️ Deleting original file...")
                    self.service.files().delete(fileId=file['id']).execute()
                    
                    # Make the converted file publicly viewable with edit permissions
                    logger.info("🔒 Setting file permissions...")
                    self.service.permissions().create(
                        fileId=converted_file['id'],
                        body={'role': 'writer', 'type': 'anyone'}
                    ).execute()
                    
                    logger.info(f"✅ Document uploaded and converted to Google Docs: {converted_file['id']}")
                    return converted_file['id']
                except Exception as e:
                    logger.warning(f"⚠️ Could not convert file to Google Docs format: {str(e)}")
                    logger.info("📝 Keeping original file format")
            
            # If conversion failed or not supported, keep the original file
            logger.info("🔒 Setting file permissions for original file...")
            try:
                self.service.permissions().create(
                    fileId=file['id'],
                    body={'role': 'writer', 'type': 'anyone'}
                ).execute()
                
                logger.info(f"✅ Document uploaded successfully: {file['id']}")
                return file['id']
            except Exception as e:
                logger.error(f"❌ Error setting file permissions: {str(e)}")
                return None
        
        except Exception as e:
            logger.error(f"❌ Error uploading to Google Drive: {str(e)}")
            return None
    
    def get_embed_url(self, file_id: str) -> str:
        """Get embeddable URL for Google Docs editor"""
        return f"https://docs.google.com/document/d/{file_id}/edit?usp=sharing"
    
    def download_document(self, file_id: str, export_format: str = 'docx') -> bytes:
        """Download document from Google Drive in specified format"""
        try:
            if not self.service:
                logger.error("❌ Google Drive service not authenticated")
                return b''
                
            mime_types = {
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'pdf': 'application/pdf',
                'txt': 'text/plain'
            }
            
            logger.info(f"📥 Downloading file {file_id} in {export_format} format...")
            result = self.service.files().export(
                fileId=file_id,
                mimeType=mime_types.get(export_format, mime_types['docx'])
            ).execute()
            
            logger.info("✅ File downloaded successfully")
            return result
        
        except Exception as e:
            logger.error(f"❌ Error downloading from Google Drive: {str(e)}")
            return b''
    
    def delete_document(self, file_id: str) -> bool:
        """Delete document from Google Drive"""
        try:
            if not self.service:
                logger.error("❌ Google Drive service not authenticated")
                return False
                
            logger.info(f"🗑️ Deleting file {file_id} from Google Drive...")
            self.service.files().delete(fileId=file_id).execute()
            logger.info("✅ File deleted successfully from Google Drive")
            return True
        
        except Exception as e:
            logger.error(f"❌ Error deleting from Google Drive: {str(e)}")
            return False
    
    def delete_multiple_documents(self, file_ids: List[str]) -> Dict[str, bool]:
        """Delete multiple documents from Google Drive"""
        results = {}
        
        for file_id in file_ids:
            if file_id:  # Only try to delete if file_id is not None/empty
                results[file_id] = self.delete_document(file_id)
            else:
                results[file_id] = True  # Consider None/empty as "successfully skipped"
                
        return results

# Initialize service only when needed to avoid auth errors on import
_google_drive_service = None

def get_google_drive_service():
    """Get or create Google Drive service instance"""
    global _google_drive_service
    if _google_drive_service is None:
        try:
            logger.info("🔄 Initializing Google Drive service...")
            _google_drive_service = GoogleDriveService()
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Drive service: {str(e)}")
            _google_drive_service = None
    return _google_drive_service 
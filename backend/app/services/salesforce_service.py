"""
Salesforce service for CRM integration and template conversion
"""

import structlog
import re
import requests
import json
import secrets
import base64
import hashlib
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode
from app.core.config import settings

logger = structlog.get_logger()


class SalesforceService:
    """Salesforce service for CRM integration and template conversion."""
    
    def __init__(self):
        self.client_id = settings.SALESFORCE_CLIENT_ID
        self.redirect_uri = settings.SALESFORCE_REDIRECT_URI or "http://localhost:3000/api/auth/salesforce/callback"
        self.domain = settings.SALESFORCE_DOMAIN
        self.initialized = False
        self.access_token = None
        self.refresh_token = None
        self.instance_url = None
        self.connected = False
        # Store OAuth states and verifiers by state parameter for concurrent users
        self.oauth_sessions = {}  # {state: {code_verifier: str, timestamp: float}}
        self.field_mappings = self._initialize_field_mappings()
    
    def _initialize_field_mappings(self) -> Dict[str, Dict[str, str]]:
        """Initialize Salesforce field mappings for different document types."""
        return {
            "quote": {
                "company_name": "{{Account.Name}}",
                "company": "{{Account.Name}}",
                "client_name": "{{Contact.Name}}",
                "contact_name": "{{Contact.Name}}",
                "email": "{{Contact.Email}}",
                "phone": "{{Contact.Phone}}",
                "address": "{{Account.BillingAddress}}",
                "billing_address": "{{Account.BillingAddress}}",
                "quote_number": "{{Quote.QuoteNumber}}",
                "quote_date": "{{Quote.CreatedDate}}",
                "expiration_date": "{{Quote.ExpirationDate}}",
                "total_amount": "{{Quote.TotalPrice}}",
                "subtotal": "{{Quote.Subtotal}}",
                "tax": "{{Quote.Tax}}",
                "discount": "{{Quote.Discount}}",
                "product_name": "{{QuoteLineItem.Product2.Name}}",
                "quantity": "{{QuoteLineItem.Quantity}}",
                "unit_price": "{{QuoteLineItem.UnitPrice}}",
                "line_total": "{{QuoteLineItem.TotalPrice}}",
                "description": "{{QuoteLineItem.Description}}",
                "terms": "{{Quote.Terms__c}}",
                "notes": "{{Quote.Notes__c}}"
            },
            "proposal": {
                "company_name": "{{Account.Name}}",
                "client_name": "{{Contact.Name}}",
                "project_name": "{{Opportunity.Name}}",
                "project_description": "{{Opportunity.Description}}",
                "start_date": "{{Opportunity.StartDate__c}}",
                "end_date": "{{Opportunity.EndDate__c}}",
                "total_value": "{{Opportunity.Amount}}",
                "probability": "{{Opportunity.Probability}}",
                "stage": "{{Opportunity.StageName}}",
                "owner": "{{Opportunity.Owner.Name}}"
            },
            "contract": {
                "company_name": "{{Account.Name}}",
                "contract_number": "{{Contract.ContractNumber}}",
                "start_date": "{{Contract.StartDate}}",
                "end_date": "{{Contract.EndDate}}",
                "contract_term": "{{Contract.ContractTerm}}",
                "status": "{{Contract.Status}}",
                "owner": "{{Contract.Owner.Name}}"
            },
            "invoice": {
                "company_name": "{{Account.Name}}",
                "invoice_number": "{{Invoice__c.InvoiceNumber__c}}",
                "invoice_date": "{{Invoice__c.InvoiceDate__c}}",
                "due_date": "{{Invoice__c.DueDate__c}}",
                "total_amount": "{{Invoice__c.TotalAmount__c}}",
                "billing_address": "{{Account.BillingAddress}}"
            }
        }
    
    async def initialize(self):
        """Initialize Salesforce service."""
        logger.info("Salesforce service initialized")
        self.initialized = True
    
    async def close(self):
        """Close Salesforce service."""
        logger.info("Salesforce service closed")
    
    def _generate_pkce_params(self, state: str) -> Dict[str, str]:
        """Generate PKCE parameters for OAuth 2.0 with PKCE."""
        import time
        
        # Generate code_verifier: random string 43-128 characters
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Generate code_challenge: base64url-encoded SHA256 hash of code_verifier
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        
        # Store in session-based storage with timestamp for cleanup
        self.oauth_sessions[state] = {
            'code_verifier': code_verifier,
            'timestamp': time.time()
        }
        
        # Clean up old sessions (older than 10 minutes)
        current_time = time.time()
        self.oauth_sessions = {
            k: v for k, v in self.oauth_sessions.items() 
            if current_time - v['timestamp'] < 600
        }
        
        return {
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256'
        }
    
    def get_oauth_authorization_url(self) -> Dict[str, Any]:
        """Generate OAuth authorization URL for Salesforce login."""
        if not self.client_id:
            return {
                "success": False,
                "error": "Salesforce Client ID not configured"
            }
        
        # Generate a random state parameter for CSRF protection
        oauth_state = secrets.token_urlsafe(32)
        
        # Generate PKCE parameters (this will store code_verifier in oauth_sessions)
        pkce_params = self._generate_pkce_params(oauth_state)
        
        # Salesforce OAuth authorization endpoint
        auth_url = f"https://{self.domain}.salesforce.com/services/oauth2/authorize"
        
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'state': oauth_state,
            'scope': 'api refresh_token offline_access',
            'code_challenge': pkce_params['code_challenge'],
            'code_challenge_method': pkce_params['code_challenge_method']
        }
        
        authorization_url = f"{auth_url}?{urlencode(params)}"
        
        logger.info(f"Generated Salesforce OAuth URL: {authorization_url}")
        
        return {
            "success": True,
            "authorization_url": authorization_url,
            "state": oauth_state
        }

    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """Handle OAuth callback and exchange code for tokens."""
        try:
            logger.info(f"OAuth callback received - code: {code[:10]}..., state: {state[:10]}...")
            
            # Verify state parameter and get code_verifier from session storage
            if state not in self.oauth_sessions:
                logger.error(f"Invalid state parameter: {state} not found in oauth_sessions")
                logger.info(f"Available states: {list(self.oauth_sessions.keys())}")
                return {
                    "connected": False,
                    "error": "Invalid state parameter. Session expired or possible CSRF attack."
                }
                
            session_data = self.oauth_sessions[state]
            code_verifier = session_data['code_verifier']
            
            logger.info(f"Found valid OAuth session for state: {state[:10]}...")
            logger.info(f"Code verifier present: {code_verifier is not None}")
            
            if not self.client_id:
                logger.error("Missing Salesforce client ID")
                return {
                    "connected": False,
                    "error": "Missing Salesforce client ID"
                }
            
            # Exchange authorization code for access token
            token_url = f"https://{self.domain}.salesforce.com/services/oauth2/token"
            
            token_data = {
                'grant_type': 'authorization_code',
                'client_id': self.client_id,
                'redirect_uri': self.redirect_uri,
                'code': code,
                'code_verifier': code_verifier
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            
            logger.info(f"Making token request to: {token_url}")
            logger.info(f"Token data keys: {list(token_data.keys())}")
            
            response = requests.post(token_url, data=token_data, headers=headers, timeout=30)
            
            logger.info(f"Token response status: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Token response error: {response.text}")
            
            response.raise_for_status()
            
            token_result = response.json()
            logger.info("Successfully received token response")
            
            # Store tokens and connection info
            self.access_token = token_result['access_token']
            self.refresh_token = token_result.get('refresh_token')
            self.instance_url = token_result['instance_url']
            self.connected = True
            
            # Clear the OAuth session after successful authentication
            if state in self.oauth_sessions:
                del self.oauth_sessions[state]
            
            logger.info(f"Successfully connected to Salesforce org: {self.instance_url}")
            
            return {
                "connected": True,
                "instance_url": self.instance_url,
                "message": "Successfully connected to Salesforce"
            }
            
        except requests.RequestException as e:
            logger.error(f"HTTP error during OAuth callback: {e}")
            return {
                "connected": False,
                "error": f"Failed to exchange code for token: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error during OAuth callback: {e}")
            return {
                "connected": False,
                "error": f"Authentication failed: {str(e)}"
            }

    async def refresh_access_token(self) -> Dict[str, Any]:
        """Refresh the access token using the refresh token."""
        if not self.refresh_token:
            return {
                "success": False,
                "error": "No refresh token available"
            }
        
        try:
            token_url = f"https://{self.domain}.salesforce.com/services/oauth2/token"
            
            refresh_data = {
                'grant_type': 'refresh_token',
                'client_id': self.client_id,
                'refresh_token': self.refresh_token
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            
            response = requests.post(token_url, data=refresh_data, headers=headers, timeout=30)
            response.raise_for_status()
            
            token_result = response.json()
            
            # Update access token
            self.access_token = token_result['access_token']
            self.instance_url = token_result['instance_url']
            
            logger.info("Successfully refreshed Salesforce access token")
            
            return {
                "success": True,
                "message": "Access token refreshed successfully"
            }
            
        except requests.RequestException as e:
            logger.error(f"Error refreshing access token: {e}")
            # If refresh fails, disconnect
            self.connected = False
            self.access_token = None
            self.refresh_token = None
            self.instance_url = None
            
            return {
                "success": False,
                "error": f"Failed to refresh token: {str(e)}"
            }

    async def get_sobjects(self) -> Dict[str, Any]:
        """Get all SObjects (objects) from the connected Salesforce org."""
        if not self.connected or not self.access_token:
            return {
                "success": False,
                "error": "Not connected to Salesforce. Please connect first."
            }
        
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get all SObjects
            url = f"{self.instance_url}/services/data/v58.0/sobjects"
            response = requests.get(url, headers=headers, timeout=30)
            
            # If token expired, try to refresh
            if response.status_code == 401:
                refresh_result = await self.refresh_access_token()
                if refresh_result.get("success"):
                    headers['Authorization'] = f'Bearer {self.access_token}'
                    response = requests.get(url, headers=headers, timeout=30)
                else:
                    return {
                        "success": False,
                        "error": "Session expired. Please reconnect to Salesforce."
                    }
            
            response.raise_for_status()
            sobjects_data = response.json()
            
            # Filter and format the objects
            objects = []
            for sobject in sobjects_data.get('sobjects', []):
                if sobject.get('queryable', False) and sobject.get('retrieveable', False):
                    objects.append({
                        'name': sobject['name'],
                        'label': sobject['label'],
                        'custom': sobject.get('custom', False),
                        'keyPrefix': sobject.get('keyPrefix'),
                        'updateable': sobject.get('updateable', False),
                        'createable': sobject.get('createable', False),
                        'deletable': sobject.get('deletable', False)
                    })
            
            # Sort objects: standard objects first, then custom
            objects.sort(key=lambda x: (x['custom'], x['label']))
            
            logger.info(f"Retrieved {len(objects)} SObjects from Salesforce")
            
            return {
                "success": True,
                "objects": objects,
                "total": len(objects)
            }
            
        except requests.RequestException as e:
            logger.error(f"HTTP error getting SObjects: {e}")
            return {
                "success": False,
                "error": f"Failed to retrieve objects: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error getting SObjects: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    async def get_sobject_fields(self, sobject_name: str) -> Dict[str, Any]:
        """Get all fields for a specific SObject."""
        if not self.connected or not self.access_token:
            return {
                "success": False,
                "error": "Not connected to Salesforce. Please connect first."
            }
        
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get SObject describe
            url = f"{self.instance_url}/services/data/v58.0/sobjects/{sobject_name}/describe"
            response = requests.get(url, headers=headers, timeout=30)
            
            # If token expired, try to refresh
            if response.status_code == 401:
                refresh_result = await self.refresh_access_token()
                if refresh_result.get("success"):
                    headers['Authorization'] = f'Bearer {self.access_token}'
                    response = requests.get(url, headers=headers, timeout=30)
                else:
                    return {
                        "success": False,
                        "error": "Session expired. Please reconnect to Salesforce."
                    }
            
            response.raise_for_status()
            describe_data = response.json()
            
            # Format the fields
            fields = []
            for field in describe_data.get('fields', []):
                fields.append({
                    'name': field['name'],
                    'label': field['label'],
                    'type': field['type'],
                    'length': field.get('length'),
                    'custom': field.get('custom', False),
                    'updateable': field.get('updateable', False),
                    'createable': field.get('createable', False),
                    'required': not field.get('nillable', True) and not field.get('defaultedOnCreate', False),
                    'picklistValues': field.get('picklistValues', []) if field['type'] == 'picklist' else [],
                    'referenceTo': field.get('referenceTo', []),
                    'relationshipName': field.get('relationshipName')
                })
            
            # Sort fields: required first, then by label
            fields.sort(key=lambda x: (not x['required'], x['label']))
            
            # Get child relationships
            child_relationships = []
            for child_rel in describe_data.get('childRelationships', []):
                if child_rel.get('relationshipName'):
                    child_relationships.append({
                        'childSObject': child_rel['childSObject'],
                        'field': child_rel['field'],
                        'relationshipName': child_rel['relationshipName'],
                        'cascadeDelete': child_rel.get('cascadeDelete', False)
                    })
            
            logger.info(f"Retrieved {len(fields)} fields for {sobject_name}")
            
            return {
                "success": True,
                "sobject": {
                    'name': describe_data['name'],
                    'label': describe_data['label'],
                    'custom': describe_data.get('custom', False),
                    'queryable': describe_data.get('queryable', False),
                    'updateable': describe_data.get('updateable', False),
                    'createable': describe_data.get('createable', False),
                    'deletable': describe_data.get('deletable', False)
                },
                "fields": fields,
                "childRelationships": child_relationships,
                "totalFields": len(fields),
                "totalChildRelationships": len(child_relationships)
            }
            
        except requests.RequestException as e:
            logger.error(f"HTTP error getting fields for {sobject_name}: {e}")
            return {
                "success": False,
                "error": f"Failed to retrieve fields: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Error getting fields for {sobject_name}: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}"
            }

    def disconnect(self) -> Dict[str, Any]:
        """Disconnect from Salesforce org."""
        self.connected = False
        self.access_token = None
        self.refresh_token = None
        self.instance_url = None
        self.oauth_state = None
        
        return {
            "success": True,
            "message": "Disconnected from Salesforce"
        }

    def get_connection_status(self) -> Dict[str, Any]:
        """Get current Salesforce connection status."""
        return {
            "connected": self.connected,
            "instance_url": self.instance_url if self.connected else None,
            "has_credentials": bool(self.client_id),
            "oauth_configured": bool(self.client_id and self.redirect_uri)
        }

    def detect_document_type(self, text: str) -> str:
        """Detect document type based on content analysis."""
        text_lower = text.lower()
        
        # Quote detection
        quote_keywords = ['quote', 'quotation', 'estimate', 'proposal amount', 'total price', 'line item']
        if any(keyword in text_lower for keyword in quote_keywords):
            return "quote"
        
        # Proposal detection
        proposal_keywords = ['proposal', 'project scope', 'deliverables', 'timeline', 'objectives']
        if any(keyword in text_lower for keyword in proposal_keywords):
            return "proposal"
        
        # Contract detection
        contract_keywords = ['contract', 'agreement', 'terms and conditions', 'legal', 'binding']
        if any(keyword in text_lower for keyword in contract_keywords):
            return "contract"
        
        # Invoice detection
        invoice_keywords = ['invoice', 'bill', 'payment due', 'remit to', 'invoice number']
        if any(keyword in text_lower for keyword in invoice_keywords):
            return "invoice"
        
        # Default to quote if uncertain
        return "quote"
    
    def extract_fields_from_text(self, text: str, document_type: str) -> Dict[str, str]:
        """Extract relevant fields from document text."""
        extracted_fields = {}
        
        # Common patterns for field extraction
        patterns = {
            "company_name": [
                r'(?:company|business|organization):\s*([^\n\r]+)',
                r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Co))\.?)',
            ],
            "email": [r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'],
            "phone": [r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'],
            "date": [r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', r'\b\d{4}-\d{2}-\d{2}\b'],
            "amount": [r'\$[\d,]+(?:\.\d{2})?', r'(?:total|amount|price):\s*\$?([\d,]+(?:\.\d{2})?)'],
            "number": [r'(?:quote|invoice|contract)\s*#?\s*(\w+)', r'number:\s*(\w+)']
        }
        
        for field_name, field_patterns in patterns.items():
            for pattern in field_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    extracted_fields[field_name] = matches[0] if isinstance(matches[0], str) else ' '.join(matches[0])
                    break
        
        return extracted_fields
    
    def convert_to_template(self, text: str, document_type: str = None) -> Dict[str, Any]:
        """Convert document text to Salesforce template with field mappings."""
        if not document_type:
            document_type = self.detect_document_type(text)
        
        # Extract fields from text
        extracted_fields = self.extract_fields_from_text(text, document_type)
        
        # Get field mappings for document type
        field_mappings = self.field_mappings.get(document_type, self.field_mappings["quote"])
        
        # Convert text to template
        template_text = text
        mapped_fields = {}
        
        for field_name, salesforce_field in field_mappings.items():
            if field_name in extracted_fields:
                value = extracted_fields[field_name]
                # Replace the actual value with Salesforce field
                template_text = re.sub(
                    re.escape(value), 
                    salesforce_field, 
                    template_text, 
                    flags=re.IGNORECASE
                )
                mapped_fields[field_name] = {
                    "original_value": value,
                    "salesforce_field": salesforce_field
                }
        
        # Clean up redundant content and format
        template_text = self._clean_template(template_text)
        
        return {
            "template_text": template_text,
            "document_type": document_type,
            "mapped_fields": mapped_fields,
            "available_fields": field_mappings,
            "extracted_data": extracted_fields
        }
    
    def _clean_template(self, text: str) -> str:
        """Clean and format template text."""
        # Remove redundant whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Remove common redundant phrases
        redundant_phrases = [
            r'please find attached',
            r'as discussed',
            r'thank you for your time',
            r'we look forward to hearing from you'
        ]
        
        for phrase in redundant_phrases:
            text = re.sub(phrase, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def get_available_fields(self, document_type: str = "quote") -> Dict[str, str]:
        """Get available Salesforce fields for a document type."""
        return self.field_mappings.get(document_type, self.field_mappings["quote"])


# Global Salesforce service instance
salesforce_service = SalesforceService()
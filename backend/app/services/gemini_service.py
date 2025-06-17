"""
Gemini AI Service for document analysis and template conversion
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Tuple
import structlog
from app.core.config import get_settings

logger = structlog.get_logger()

try:
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Google Generative AI package not installed")

class GeminiService:
    """Service for interacting with Google's Gemini AI for template conversion."""
    
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.GOOGLE_AI_API_KEY or os.getenv('GEMINI_API_KEY')
        self.model = None
        
        if not GEMINI_AVAILABLE:
            logger.warning("Gemini AI not available - install google-generativeai package")
            return
            
        if not self.api_key:
            logger.warning("GOOGLE_AI_API_KEY or GEMINI_API_KEY not found in environment variables")
            return
            
        try:
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            
            # Initialize the model
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-pro",
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                }
            )
            logger.info("Gemini AI service initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize Gemini AI service", error=str(e))
    
    async def analyze_document(self, document_content: str) -> Dict[str, Any]:
        """
        Analyze a document to identify its type, structure, and potential merge fields.
        
        Args:
            document_content: The raw text content of the document
            
        Returns:
            Dict containing analysis results
        """
        if not self.model:
            raise ValueError("Gemini AI service not properly initialized")
        
        prompt = f"""
        Analyze the following document and provide a detailed analysis in JSON format. 
        Identify the document type, key clauses, and suggest appropriate Salesforce merge fields.

        Document Content:
        {document_content}

        Please return your analysis in the following JSON structure:
        {{
            "document_type": "string (e.g., Contract, Agreement, Policy, Invoice, etc.)",
            "confidence": "string (high/medium/low)",
            "primary_salesforce_object": "string (Account, Contact, Opportunity, etc.)",
            "suggested_merge_fields": [
                {{
                    "field_name": "string (Salesforce field API name)",
                    "display_name": "string (Human readable name)",
                    "salesforce_object": "string (Account, Contact, etc.)",
                    "sample_value": "string (example value)",
                    "merge_syntax": "string ({{{{Object.Field}}}})"
                }}
            ],
            "identified_clauses": [
                {{
                    "title": "string (clause name)",
                    "content": "string (clause text)",
                    "type": "string (Payment, Termination, Liability, etc.)",
                    "position": "number (order in document)",
                    "is_mandatory": "boolean",
                    "confidence": "string (high/medium/low)"
                }}
            ],
            "document_structure": {{
                "has_header": "boolean",
                "has_footer": "boolean", 
                "sections": ["string array of section names"],
                "total_paragraphs": "number",
                "estimated_merge_points": "number"
            }},
            "recommendations": [
                "string array of recommendations for template creation"
            ]
        }}

        Focus on identifying:
        1. Common business document patterns
        2. Fields that could be replaced with Salesforce data
        3. Legal/business clauses and their types
        4. Document structure and organization
        """
        
        try:
            response = self.model.generate_content(prompt)
            
            # Extract JSON from the response
            response_text = response.text
            logger.info("Gemini response received", response_length=len(response_text))
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                # If no JSON found, return the raw response
                return {
                    "error": "Could not parse JSON response",
                    "raw_response": response_text,
                    "document_type": "Unknown",
                    "confidence": "low"
                }
                
        except Exception as e:
            logger.error("Error analyzing document with Gemini", error=str(e))
            return {
                "error": str(e),
                "document_type": "Unknown",
                "confidence": "low"
            }
    
    async def convert_to_template(self, document_content: str, analysis: Dict[str, Any], salesforce_objects: List[Dict] = None) -> Dict[str, Any]:
        """
        Convert a document to a template with merge fields based on analysis.
        
        Args:
            document_content: Original document content
            analysis: Previous analysis results
            salesforce_objects: Available Salesforce objects and fields
            
        Returns:
            Dict containing the template conversion results
        """
        if not self.model:
            raise ValueError("Gemini AI service not properly initialized")
        
        # Prepare Salesforce field information
        sf_fields_info = self._format_salesforce_fields(salesforce_objects or [])
        
        prompt = f"""
        Convert the following document into a template by replacing specific values with Salesforce merge fields.
        
        Original Document:
        {document_content}
        
        Previous Analysis:
        {json.dumps(analysis, indent=2)}
        
        Available Salesforce Fields:
        {sf_fields_info}
        
        Instructions:
        1. Replace specific values (names, addresses, dates, amounts, etc.) with appropriate merge fields
        2. Use the format {{{{Object.Field}}}} for merge fields
        3. Keep the document structure and formatting intact
        4. Only replace values that would realistically come from Salesforce
        5. Provide a list of all merge fields used
        
        Return your response in this JSON format:
        {{
            "template_content": "string (document with merge fields)",
            "merge_fields_used": [
                {{
                    "merge_field": "string ({{{{Object.Field}}}})",
                    "original_value": "string (what was replaced)",
                    "field_type": "string (text, number, date, etc.)",
                    "description": "string (what this field represents)"
                }}
            ],
            "template_metadata": {{
                "total_merge_fields": "number",
                "primary_object": "string",
                "related_objects": ["string array"],
                "template_complexity": "string (simple/medium/complex)"
            }},
            "conversion_notes": [
                "string array of notes about the conversion process"
            ]
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                return json.loads(json_str)
            else:
                return {
                    "error": "Could not parse template conversion response",
                    "raw_response": response_text
                }
                
        except Exception as e:
            logger.error("Error converting document to template", error=str(e))
            return {
                "error": str(e)
            }
    
    async def generate_document_from_template(self, template_content: str, merge_data: Dict[str, Any]) -> str:
        """
        Generate a final document by replacing merge fields with actual data.
        
        Args:
            template_content: Template with merge fields
            merge_data: Data to replace merge fields with
            
        Returns:
            Generated document content
        """
        try:
            # Simple regex-based replacement for merge fields
            generated_content = template_content
            
            # Find all merge fields in the format {{Object.Field}}
            merge_field_pattern = r'\{\{([^}]+)\}\}'
            merge_fields = re.findall(merge_field_pattern, template_content)
            
            for field in merge_fields:
                # Try to find the value in merge_data
                value = self._get_nested_value(merge_data, field)
                if value is not None:
                    generated_content = generated_content.replace(f"{{{{{field}}}}}", str(value))
                else:
                    # Keep the merge field if no data is available
                    logger.warning(f"No data found for merge field: {field}")
            
            return generated_content
            
        except Exception as e:
            logger.error("Error generating document from template", error=str(e))
            return template_content
    
    def _format_salesforce_fields(self, salesforce_objects: List[Dict]) -> str:
        """Format Salesforce objects and fields for the AI prompt."""
        if not salesforce_objects:
            return "No Salesforce field information available"
            
        formatted = []
        for obj in salesforce_objects[:10]:  # Limit to first 10 objects to avoid token limits
            obj_info = f"Object: {obj.get('name', 'Unknown')} ({obj.get('label', 'Unknown')})\n"
            obj_info += "Common Fields: Id, Name, CreatedDate, LastModifiedDate\n"
            formatted.append(obj_info)
        
        return "\n".join(formatted)
    
    def _get_nested_value(self, data: Dict, field_path: str) -> Optional[Any]:
        """Get a nested value from data using dot notation (e.g., 'Account.Name')."""
        try:
            keys = field_path.split('.')
            value = data
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return None
            return value
        except:
            return None
    
    def is_available(self) -> bool:
        """Check if Gemini service is available and configured."""
        return GEMINI_AVAILABLE and self.model is not None

# Global instance
gemini_service = GeminiService() 
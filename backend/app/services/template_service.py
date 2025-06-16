"""
Template conversion service using AI with Salesforce and ServiceNow integrations
"""

import structlog
from typing import Dict, List, Optional, Any
from app.services.ai_service import ai_service
from app.services.salesforce_service import salesforce_service
from app.services.servicenow_service import servicenow_service

logger = structlog.get_logger()


class TemplateService:
    """Template conversion service with AI enhancement."""
    
    def __init__(self):
        self.initialized = False
        self.ai_service = ai_service
        self.salesforce_service = salesforce_service
        self.servicenow_service = servicenow_service
    
    async def initialize(self):
        """Initialize template service."""
        await self.ai_service.initialize()
        await self.salesforce_service.initialize()
        await self.servicenow_service.initialize()
        self.initialized = True
        logger.info("Template service initialized")
    
    async def close(self):
        """Close template service."""
        await self.ai_service.close()
        await self.salesforce_service.close()
        await self.servicenow_service.close()
        logger.info("Template service closed")
    
    async def analyze_document(self, text: str) -> Dict[str, Any]:
        """Analyze document content using AI to determine best conversion approach."""
        
        # Use AI to analyze document structure and content
        analysis_prompt = f"""
        Analyze this document and provide insights for template conversion:
        
        Document Content:
        {text[:2000]}...
        
        Please provide:
        1. Document type (quote, proposal, contract, invoice, incident, change_request, etc.)
        2. Key entities found (companies, people, dates, amounts, etc.)
        3. Structure analysis (sections, formatting, etc.)
        4. Recommended platform (Salesforce for CRM documents, ServiceNow for ITSM documents)
        5. Confidence level (1-10)
        
        Respond in JSON format.
        """
        
        try:
            ai_response = await self.ai_service.generate_response(
                analysis_prompt,
                max_tokens=500
            )
            
            # Parse AI response for analysis
            analysis = {
                "ai_analysis": ai_response,
                "document_length": len(text),
                "word_count": len(text.split()),
                "has_structured_data": self._detect_structured_data(text)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in AI document analysis: {e}")
            return {
                "ai_analysis": "AI analysis unavailable",
                "document_length": len(text),
                "word_count": len(text.split()),
                "has_structured_data": self._detect_structured_data(text)
            }
    
    def _detect_structured_data(self, text: str) -> bool:
        """Detect if document contains structured data like tables, lists, etc."""
        structured_indicators = [
            r'\|.*\|',  # Table format
            r'^\d+\.',  # Numbered lists
            r'^\*\s',   # Bullet points
            r'^\-\s',   # Dash lists
            r'\$[\d,]+', # Currency amounts
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'  # Dates
        ]
        
        import re
        for pattern in structured_indicators:
            if re.search(pattern, text, re.MULTILINE):
                return True
        return False
    
    async def convert_to_salesforce_template(
        self, 
        text: str, 
        document_type: str = None,
        use_ai_enhancement: bool = True
    ) -> Dict[str, Any]:
        """Convert document to Salesforce template with optional AI enhancement."""
        
        # Basic conversion using Salesforce service
        basic_conversion = self.salesforce_service.convert_to_template(text, document_type)
        
        if not use_ai_enhancement:
            return basic_conversion
        
        # AI-enhanced conversion
        try:
            enhancement_prompt = f"""
            Enhance this Salesforce template conversion by:
            1. Identifying missed field mappings
            2. Suggesting better field names
            3. Removing redundant content
            4. Adding missing Salesforce fields that would be useful
            
            Original text: {text[:1000]}...
            
            Current template: {basic_conversion['template_text'][:1000]}...
            
            Document type: {basic_conversion['document_type']}
            
            Provide suggestions for improvement in JSON format:
            {{
                "suggested_fields": {{"field_name": "{{Salesforce.Field}}"}},
                "content_improvements": ["improvement1", "improvement2"],
                "additional_markup": ["markup1", "markup2"]
            }}
            """
            
            ai_enhancement = await self.ai_service.generate_response(
                enhancement_prompt,
                max_tokens=800
            )
            
            basic_conversion["ai_enhancement"] = ai_enhancement
            basic_conversion["enhancement_applied"] = True
            
        except Exception as e:
            logger.error(f"Error in AI enhancement for Salesforce: {e}")
            basic_conversion["ai_enhancement"] = "AI enhancement unavailable"
            basic_conversion["enhancement_applied"] = False
        
        return basic_conversion
    
    async def convert_to_servicenow_template(
        self, 
        text: str, 
        document_type: str = None,
        use_ai_enhancement: bool = True
    ) -> Dict[str, Any]:
        """Convert document to ServiceNow template with optional AI enhancement."""
        
        # Basic conversion using ServiceNow service
        basic_conversion = self.servicenow_service.convert_to_template(text, document_type)
        
        if not use_ai_enhancement:
            return basic_conversion
        
        # AI-enhanced conversion
        try:
            enhancement_prompt = f"""
            Enhance this ServiceNow template conversion by:
            1. Identifying missed field mappings
            2. Suggesting better ITSM field names
            3. Removing redundant content
            4. Adding missing ServiceNow fields that would be useful
            
            Original text: {text[:1000]}...
            
            Current template: {basic_conversion['template_text'][:1000]}...
            
            Document type: {basic_conversion['document_type']}
            
            Provide suggestions for improvement in JSON format:
            {{
                "suggested_fields": {{"field_name": "${{servicenow.field}}"}},
                "content_improvements": ["improvement1", "improvement2"],
                "additional_markup": ["markup1", "markup2"]
            }}
            """
            
            ai_enhancement = await self.ai_service.generate_response(
                enhancement_prompt,
                max_tokens=800
            )
            
            basic_conversion["ai_enhancement"] = ai_enhancement
            basic_conversion["enhancement_applied"] = True
            
        except Exception as e:
            logger.error(f"Error in AI enhancement for ServiceNow: {e}")
            basic_conversion["ai_enhancement"] = "AI enhancement unavailable"
            basic_conversion["enhancement_applied"] = False
        
        return basic_conversion
    
    async def compare_platforms(self, text: str) -> Dict[str, Any]:
        """Compare Salesforce vs ServiceNow conversion options."""
        
        # Get both conversions
        salesforce_conversion = await self.convert_to_salesforce_template(text, use_ai_enhancement=False)
        servicenow_conversion = await self.convert_to_servicenow_template(text, use_ai_enhancement=False)
        
        # AI-powered comparison
        try:
            comparison_prompt = f"""
            Compare these two template conversion options and recommend the best platform:
            
            Document text: {text[:500]}...
            
            Salesforce conversion:
            - Document type: {salesforce_conversion['document_type']}
            - Mapped fields: {len(salesforce_conversion['mapped_fields'])}
            
            ServiceNow conversion:
            - Document type: {servicenow_conversion['document_type']}
            - Mapped fields: {len(servicenow_conversion['mapped_fields'])}
            
            Which platform is better suited for this document and why?
            Provide recommendation with confidence score (1-10).
            """
            
            ai_recommendation = await self.ai_service.generate_response(
                comparison_prompt,
                max_tokens=300
            )
            
        except Exception as e:
            logger.error(f"Error in AI comparison: {e}")
            ai_recommendation = "AI comparison unavailable"
        
        return {
            "salesforce_conversion": salesforce_conversion,
            "servicenow_conversion": servicenow_conversion,
            "ai_recommendation": ai_recommendation,
            "comparison_metrics": {
                "salesforce_fields_mapped": len(salesforce_conversion['mapped_fields']),
                "servicenow_fields_mapped": len(servicenow_conversion['mapped_fields']),
                "salesforce_doc_type": salesforce_conversion['document_type'],
                "servicenow_doc_type": servicenow_conversion['document_type']
            }
        }
    
    def get_available_platforms(self) -> Dict[str, Any]:
        """Get information about available integration platforms."""
        return {
            "salesforce": {
                "name": "Salesforce",
                "description": "CRM platform for sales and customer management",
                "document_types": list(self.salesforce_service.field_mappings.keys()),
                "field_count": sum(len(fields) for fields in self.salesforce_service.field_mappings.values()),
                "markup_style": "{{Object.Field}}"
            },
            "servicenow": {
                "name": "ServiceNow",
                "description": "ITSM platform for IT service management",
                "document_types": list(self.servicenow_service.field_mappings.keys()),
                "field_count": sum(len(fields) for fields in self.servicenow_service.field_mappings.values()),
                "markup_style": "${field_name}"
            }
        }


# Global template service instance
template_service = TemplateService() 
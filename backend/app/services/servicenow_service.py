"""
ServiceNow service for ITSM integration and template conversion
"""

import structlog
import re
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = structlog.get_logger()


class ServiceNowService:
    """ServiceNow service for ITSM integration and template conversion."""
    
    def __init__(self):
        self.instance_url = getattr(settings, 'SERVICENOW_INSTANCE_URL', None)
        self.initialized = False
        self.field_mappings = self._initialize_field_mappings()
    
    def _initialize_field_mappings(self) -> Dict[str, Dict[str, str]]:
        """Initialize ServiceNow field mappings for different document types."""
        return {
            "incident": {
                "incident_number": "${number}",
                "short_description": "${short_description}",
                "description": "${description}",
                "caller": "${caller_id.name}",
                "caller_email": "${caller_id.email}",
                "category": "${category}",
                "subcategory": "${subcategory}",
                "urgency": "${urgency}",
                "priority": "${priority}",
                "state": "${state}",
                "assigned_to": "${assigned_to.name}",
                "assignment_group": "${assignment_group.name}",
                "company": "${company.name}",
                "location": "${location.name}",
                "opened_at": "${opened_at}",
                "resolved_at": "${resolved_at}",
                "work_notes": "${work_notes}"
            },
            "change_request": {
                "change_number": "${number}",
                "short_description": "${short_description}",
                "description": "${description}",
                "requested_by": "${requested_by.name}",
                "change_type": "${type}",
                "category": "${category}",
                "risk": "${risk}",
                "impact": "${impact}",
                "urgency": "${urgency}",
                "priority": "${priority}",
                "state": "${state}",
                "approval": "${approval}",
                "assigned_to": "${assigned_to.name}",
                "assignment_group": "${assignment_group.name}",
                "start_date": "${start_date}",
                "end_date": "${end_date}",
                "implementation_plan": "${implementation_plan}",
                "backout_plan": "${backout_plan}",
                "test_plan": "${test_plan}"
            },
            "problem": {
                "problem_number": "${number}",
                "short_description": "${short_description}",
                "description": "${description}",
                "category": "${category}",
                "subcategory": "${subcategory}",
                "state": "${state}",
                "priority": "${priority}",
                "assigned_to": "${assigned_to.name}",
                "assignment_group": "${assignment_group.name}",
                "root_cause": "${root_cause}",
                "workaround": "${workaround}",
                "fix_notes": "${fix_notes}"
            },
            "request": {
                "request_number": "${number}",
                "short_description": "${short_description}",
                "description": "${description}",
                "requested_for": "${requested_for.name}",
                "requested_by": "${requested_by.name}",
                "category": "${category}",
                "item": "${cat_item.name}",
                "state": "${state}",
                "urgency": "${urgency}",
                "priority": "${priority}",
                "due_date": "${due_date}",
                "assigned_to": "${assigned_to.name}",
                "assignment_group": "${assignment_group.name}"
            },
            "knowledge": {
                "title": "${short_description}",
                "text": "${text}",
                "category": "${kb_category.label}",
                "author": "${author.name}",
                "valid_to": "${valid_to}",
                "workflow_state": "${workflow_state}",
                "article_type": "${article_type}"
            }
        }
    
    async def initialize(self):
        """Initialize ServiceNow service."""
        logger.info("ServiceNow service initialized")
        self.initialized = True
    
    async def close(self):
        """Close ServiceNow service."""
        logger.info("ServiceNow service closed")
    
    def detect_document_type(self, text: str) -> str:
        """Detect ServiceNow document type based on content analysis."""
        text_lower = text.lower()
        
        # Incident detection
        incident_keywords = ['incident', 'issue', 'problem report', 'service down', 'system error', 'outage']
        if any(keyword in text_lower for keyword in incident_keywords):
            return "incident"
        
        # Change request detection
        change_keywords = ['change request', 'change management', 'deployment', 'upgrade', 'maintenance window']
        if any(keyword in text_lower for keyword in change_keywords):
            return "change_request"
        
        # Problem detection
        problem_keywords = ['problem', 'root cause', 'investigation', 'multiple incidents', 'underlying issue']
        if any(keyword in text_lower for keyword in problem_keywords):
            return "problem"
        
        # Service request detection
        request_keywords = ['service request', 'request for', 'please provide', 'access request', 'catalog item']
        if any(keyword in text_lower for keyword in request_keywords):
            return "request"
        
        # Knowledge article detection
        knowledge_keywords = ['how to', 'procedure', 'guide', 'instructions', 'documentation', 'steps']
        if any(keyword in text_lower for keyword in knowledge_keywords):
            return "knowledge"
        
        # Default to incident if uncertain
        return "incident"
    
    def extract_fields_from_text(self, text: str, document_type: str) -> Dict[str, str]:
        """Extract relevant fields from ServiceNow document text."""
        extracted_fields = {}
        
        # Common patterns for field extraction
        patterns = {
            "short_description": [
                r'(?:title|subject|summary):\s*([^\n\r]+)',
                r'^([^\n\r]{10,100})',  # First line if reasonable length
            ],
            "description": [
                r'(?:description|details|issue):\s*(.*?)(?:\n\n|\n[A-Z]|\Z)',
            ],
            "email": [r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'],
            "phone": [r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'],
            "date": [r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', r'\b\d{4}-\d{2}-\d{2}\b'],
            "number": [r'(?:INC|CHG|PRB|REQ|KB)\d+', r'(?:incident|change|problem|request)\s*#?\s*(\w+)'],
            "priority": [r'(?:priority|urgency):\s*(high|medium|low|\d)', r'(critical|high|medium|low)\s*priority'],
            "state": [r'(?:status|state):\s*([^\n\r]+)'],
            "category": [r'(?:category|type):\s*([^\n\r]+)']
        }
        
        for field_name, field_patterns in patterns.items():
            for pattern in field_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
                if matches:
                    value = matches[0] if isinstance(matches[0], str) else ' '.join(matches[0])
                    extracted_fields[field_name] = value.strip()
                    break
        
        return extracted_fields
    
    def convert_to_template(self, text: str, document_type: str = None) -> Dict[str, Any]:
        """Convert document text to ServiceNow template with field mappings."""
        if not document_type:
            document_type = self.detect_document_type(text)
        
        # Extract fields from text
        extracted_fields = self.extract_fields_from_text(text, document_type)
        
        # Get field mappings for document type
        field_mappings = self.field_mappings.get(document_type, self.field_mappings["incident"])
        
        # Convert text to template
        template_text = text
        mapped_fields = {}
        
        for field_name, servicenow_field in field_mappings.items():
            if field_name in extracted_fields:
                value = extracted_fields[field_name]
                # Replace the actual value with ServiceNow field
                template_text = re.sub(
                    re.escape(value), 
                    servicenow_field, 
                    template_text, 
                    flags=re.IGNORECASE
                )
                mapped_fields[field_name] = {
                    "original_value": value,
                    "servicenow_field": servicenow_field
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
        """Clean and format template text for ServiceNow."""
        # Remove redundant whitespace
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Remove common redundant phrases for ITSM
        redundant_phrases = [
            r'please help',
            r'as soon as possible',
            r'urgent request',
            r'thank you in advance'
        ]
        
        for phrase in redundant_phrases:
            text = re.sub(phrase, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def get_available_fields(self, document_type: str = "incident") -> Dict[str, str]:
        """Get available ServiceNow fields for a document type."""
        return self.field_mappings.get(document_type, self.field_mappings["incident"])


# Global ServiceNow service instance
servicenow_service = ServiceNowService() 
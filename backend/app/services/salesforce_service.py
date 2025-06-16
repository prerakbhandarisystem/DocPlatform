"""
Salesforce service for CRM integration and template conversion
"""

import structlog
import re
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = structlog.get_logger()


class SalesforceService:
    """Salesforce service for CRM integration and template conversion."""
    
    def __init__(self):
        self.client_id = settings.SALESFORCE_CLIENT_ID
        self.initialized = False
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
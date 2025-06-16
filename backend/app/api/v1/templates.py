"""
Template conversion API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import structlog

from app.services.template_service import template_service
from app.api.routes.document import get_document_text

logger = structlog.get_logger()

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/platforms")
async def get_available_platforms() -> Dict[str, Any]:
    """Get information about available integration platforms."""
    try:
        return template_service.get_available_platforms()
    except Exception as e:
        logger.error(f"Error getting platforms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{document_id}")
async def analyze_document_for_template(document_id: str) -> Dict[str, Any]:
    """Analyze a document to determine the best template conversion approach."""
    try:
        # Get document text
        document_text_response = await get_document_text(document_id)
        text_content = document_text_response.get("text_content", "")
        
        if not text_content:
            raise HTTPException(status_code=400, detail="Document text not available")
        
        # Analyze document
        analysis = await template_service.analyze_document(text_content)
        
        return {
            "document_id": document_id,
            "analysis": analysis,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert/{document_id}/salesforce")
async def convert_to_salesforce_template(
    document_id: str,
    document_type: Optional[str] = None,
    use_ai_enhancement: bool = True
) -> Dict[str, Any]:
    """Convert document to Salesforce template."""
    try:
        # Get document text
        document_text_response = await get_document_text(document_id)
        text_content = document_text_response.get("text_content", "")
        
        if not text_content:
            raise HTTPException(status_code=400, detail="Document text not available")
        
        # Convert to Salesforce template
        conversion_result = await template_service.convert_to_salesforce_template(
            text_content, 
            document_type, 
            use_ai_enhancement
        )
        
        return {
            "document_id": document_id,
            "platform": "salesforce",
            "conversion": conversion_result,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting document {document_id} to Salesforce: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert/{document_id}/servicenow")
async def convert_to_servicenow_template(
    document_id: str,
    document_type: Optional[str] = None,
    use_ai_enhancement: bool = True
) -> Dict[str, Any]:
    """Convert document to ServiceNow template."""
    try:
        # Get document text
        document_text_response = await get_document_text(document_id)
        text_content = document_text_response.get("text_content", "")
        
        if not text_content:
            raise HTTPException(status_code=400, detail="Document text not available")
        
        # Convert to ServiceNow template
        conversion_result = await template_service.convert_to_servicenow_template(
            text_content, 
            document_type, 
            use_ai_enhancement
        )
        
        return {
            "document_id": document_id,
            "platform": "servicenow",
            "conversion": conversion_result,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting document {document_id} to ServiceNow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare/{document_id}")
async def compare_platform_conversions(document_id: str) -> Dict[str, Any]:
    """Compare Salesforce vs ServiceNow template conversion options."""
    try:
        # Get document text
        document_text_response = await get_document_text(document_id)
        text_content = document_text_response.get("text_content", "")
        
        if not text_content:
            raise HTTPException(status_code=400, detail="Document text not available")
        
        # Compare conversions
        comparison_result = await template_service.compare_platforms(text_content)
        
        return {
            "document_id": document_id,
            "comparison": comparison_result,
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing platforms for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fields/salesforce/{document_type}")
async def get_salesforce_fields(document_type: str) -> Dict[str, Any]:
    """Get available Salesforce fields for a document type."""
    try:
        fields = template_service.salesforce_service.get_available_fields(document_type)
        return {
            "platform": "salesforce",
            "document_type": document_type,
            "fields": fields,
            "field_count": len(fields),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error getting Salesforce fields for {document_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fields/servicenow/{document_type}")
async def get_servicenow_fields(document_type: str) -> Dict[str, Any]:
    """Get available ServiceNow fields for a document type."""
    try:
        fields = template_service.servicenow_service.get_available_fields(document_type)
        return {
            "platform": "servicenow",
            "document_type": document_type,
            "fields": fields,
            "field_count": len(fields),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Error getting ServiceNow fields for {document_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 
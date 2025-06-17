"""
Template API routes for AI-powered template conversion
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import structlog

from app.core.database import get_db
from app.models.template import Template, TemplateVersion, Clause, GeneratedDocument
from app.models.document import Document
from app.services.gemini_service import gemini_service
from app.services.document_service import document_service

logger = structlog.get_logger()
router = APIRouter()

# Pydantic models for request/response
class DocumentAnalysisRequest(BaseModel):
    document_id: str

class TemplateConversionRequest(BaseModel):
    document_id: str
    analysis_results: Dict[str, Any]
    template_name: str
    description: Optional[str] = None
    salesforce_object: str

class TemplateGenerationRequest(BaseModel):
    template_id: str
    salesforce_record_id: Optional[str] = None
    merge_data: Dict[str, Any]

class TemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    document_type: str
    salesforce_object: str
    is_active: bool
    created_at: str
    current_version: Optional[Dict[str, Any]] = None

@router.post("/analyze/{document_id}")
async def analyze_document(
    document_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze a document using Gemini AI to identify type, structure, and potential merge fields.
    """
    try:
        if not gemini_service.is_available():
            raise HTTPException(
                status_code=503, 
                detail="AI service not available. Please configure GEMINI_API_KEY."
            )
        
        # Get the document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Extract text content from document
        document_text = document_service.extract_text_from_document(document)
        
        if len(document_text) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Document content too short for analysis"
            )
        
        # Analyze with Gemini
        analysis_result = await gemini_service.analyze_document(document_text)
        
        # Add document metadata to the analysis
        analysis_result["document_metadata"] = {
            "document_id": document.id,
            "filename": document.filename,
            "filetype": document.filetype,
            "filesize": document.filesize,
            "uploaded_at": document.uploaded_at.isoformat()
        }
        
        logger.info("Document analysis completed", document_id=document_id)
        return analysis_result
        
    except Exception as e:
        logger.error("Error analyzing document", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/convert")
async def convert_to_template(
    request: TemplateConversionRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Convert a document to a template with merge fields using AI analysis.
    """
    try:
        if not gemini_service.is_available():
            raise HTTPException(
                status_code=503, 
                detail="AI service not available. Please configure GEMINI_API_KEY."
            )
        
        # Get the document
        document = db.query(Document).filter(Document.id == request.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Extract document content using document service
        document_content = document_service.extract_text_from_document(document)
        
        # Convert to template using Gemini
        conversion_result = await gemini_service.convert_to_template(
            document_content, 
            request.analysis_results,
            []  # TODO: Pass Salesforce objects
        )
        
        if "error" in conversion_result:
            raise HTTPException(status_code=500, detail=conversion_result["error"])
        
        # Save template to database
        template = Template(
            name=request.template_name,
            description=request.description,
            document_type=request.analysis_results.get("document_type", "Unknown"),
            salesforce_object=request.salesforce_object,
            created_by="system",
            tags=request.analysis_results.get("recommendations", [])
        )
        
        db.add(template)
        db.flush()  # Get the template ID
        
        # Create first template version
        template_version = TemplateVersion(
            template_id=template.id,
            version_number=1,
            content=conversion_result.get("template_content", ""),
            merge_fields=conversion_result.get("merge_fields_used", []),
            ai_analysis=request.analysis_results,
            is_current=True,
            created_by="system"
        )
        
        db.add(template_version)
        
        # Create clauses
        clauses = request.analysis_results.get("identified_clauses", [])
        for i, clause_data in enumerate(clauses):
            clause = Clause(
                template_id=template.id,
                title=clause_data.get("title", f"Clause {i+1}"),
                content=clause_data.get("content", ""),
                clause_type=clause_data.get("type", "General"),
                position=clause_data.get("position", i+1),
                is_mandatory=clause_data.get("is_mandatory", False),
                ai_confidence=clause_data.get("confidence", "medium")
            )
            db.add(clause)
        
        db.commit()
        
        logger.info("Template created successfully", template_id=template.id)
        
        return {
            "success": True,
            "template_id": template.id,
            "template_name": template.name,
            "conversion_result": conversion_result,
            "clauses_created": len(clauses)
        }
        
    except Exception as e:
        db.rollback()
        logger.error("Error converting to template", error=str(e))
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    active_only: bool = True,
    db: Session = Depends(get_db)
) -> List[TemplateResponse]:
    """
    Get a list of all templates.
    """
    try:
        query = db.query(Template)
        if active_only:
            query = query.filter(Template.is_active == True)
        
        templates = query.order_by(Template.created_at.desc()).all()
        
        result = []
        for template in templates:
            # Get current version
            current_version = db.query(TemplateVersion).filter(
                TemplateVersion.template_id == template.id,
                TemplateVersion.is_current == True
            ).first()
            
            template_dict = {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "document_type": template.document_type,
                "salesforce_object": template.salesforce_object,
                "is_active": template.is_active,
                "created_at": template.created_at.isoformat(),
                "current_version": {
                    "id": current_version.id,
                    "version_number": current_version.version_number,
                    "merge_fields_count": len(current_version.merge_fields) if current_version.merge_fields else 0
                } if current_version else None
            }
            result.append(template_dict)
        
        return result
        
    except Exception as e:
        logger.error("Error listing templates", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")

@router.get("/{template_id}")
async def get_template(
    template_id: str,
    version_number: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific template with its content and clauses.
    """
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get specific version or current version
        if version_number:
            version = db.query(TemplateVersion).filter(
                TemplateVersion.template_id == template_id,
                TemplateVersion.version_number == version_number
            ).first()
        else:
            version = db.query(TemplateVersion).filter(
                TemplateVersion.template_id == template_id,
                TemplateVersion.is_current == True
            ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Template version not found")
        
        # Get clauses
        clauses = db.query(Clause).filter(
            Clause.template_id == template_id
        ).order_by(Clause.position).all()
        
        return {
            "template": {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "document_type": template.document_type,
                "salesforce_object": template.salesforce_object,
                "is_active": template.is_active,
                "created_at": template.created_at.isoformat(),
                "updated_at": template.updated_at.isoformat()
            },
            "version": {
                "id": version.id,
                "version_number": version.version_number,
                "content": version.content,
                "merge_fields": version.merge_fields,
                "ai_analysis": version.ai_analysis,
                "is_current": version.is_current,
                "created_at": version.created_at.isoformat()
            },
            "clauses": [
                {
                    "id": clause.id,
                    "title": clause.title,
                    "content": clause.content,
                    "clause_type": clause.clause_type,
                    "position": clause.position,
                    "is_mandatory": clause.is_mandatory,
                    "ai_confidence": clause.ai_confidence
                }
                for clause in clauses
            ]
        }
        
    except Exception as e:
        logger.error("Error getting template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")

@router.post("/{template_id}/generate")
async def generate_document(
    template_id: str,
    request: TemplateGenerationRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate a document from a template using provided data.
    """
    try:
        # Get template and current version
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        version = db.query(TemplateVersion).filter(
            TemplateVersion.template_id == template_id,
            TemplateVersion.is_current == True
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="No current template version found")
        
        merge_data = request.merge_data
        
        # Generate document content
        generated_content = await gemini_service.generate_document_from_template(
            version.content,
            merge_data
        )
        
        # Save generated document record
        generated_doc = GeneratedDocument(
            template_id=template.id,
            template_version_id=version.id,
            salesforce_record_id=request.salesforce_record_id,
            merge_data=merge_data,
            generated_content=generated_content,
            generated_by="system"
        )
        
        db.add(generated_doc)
        db.commit()
        
        logger.info("Document generated successfully", 
                   template_id=template_id, 
                   generated_doc_id=generated_doc.id)
        
        return {
            "success": True,
            "generated_document_id": generated_doc.id,
            "content": generated_content,
            "merge_data_used": merge_data,
            "template_info": {
                "template_id": template.id,
                "template_name": template.name,
                "version_number": version.version_number
            }
        }
        
    except Exception as e:
        db.rollback()
        logger.error("Error generating document", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Document generation failed: {str(e)}")

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a template (soft delete by setting is_active = False).
    """
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        template.is_active = False
        db.commit()
        
        return {"success": True, "message": "Template deleted successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error("Error deleting template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}") 
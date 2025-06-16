from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    documentId: str  # Changed from document_id to match frontend
    documentText: Optional[str] = None  # Add document text content
    selected_text: Optional[str] = None
    feature: str = "chat"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[Dict[str, Any]]] = None
    corrections: Optional[List[Dict[str, Any]]] = None
    status: str = "success"

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Chat with AI about the document."""
    try:
        logger.info(f"🤖 AI Chat request: {request.feature} for document {request.documentId}")
        
        # Initialize AI service
        ai_service = AIService()
        await ai_service.initialize()
        
        # Prepare context with document information
        context_info = []
        if request.documentText:
            context_info.append(f"Document Content:\n{request.documentText[:2000]}...")  # Limit context size
            logger.info(f"📄 Using document content ({len(request.documentText)} chars)")
        
        if request.selected_text:
            context_info.append(f"Selected Text: {request.selected_text}")
            
        if request.context and request.context.get('documentData'):
            doc_data = request.context['documentData']
            context_info.append(f"Document: {doc_data.get('filename', 'Unknown')}")
        
        # Create comprehensive prompt based on feature type
        if request.feature == "summary":
            prompt = f"Please provide a comprehensive summary of this document:\n\n{context_info[0] if context_info else ''}\n\nUser request: {request.message}"
        elif request.feature == "questions":
            prompt = f"Based on this document content, please answer the following question:\n\nDocument: {context_info[0] if context_info else ''}\n\nQuestion: {request.message}"
        elif request.feature == "grammar":
            text_to_check = request.selected_text or request.message
            prompt = f"Please check and improve the grammar and writing quality of this text:\n\n{text_to_check}\n\nContext document:\n{context_info[0] if context_info else ''}"
        elif request.feature == "translation":
            target_lang = request.context.get('targetLanguage', 'Spanish') if request.context else 'Spanish'
            prompt = f"Please translate this text to {target_lang}:\n\n{request.message}\n\nDocument context:\n{context_info[0] if context_info else ''}"
        else:
            # General chat
            full_context = "\n\n".join(context_info) if context_info else "No document context available"
            prompt = f"Document Context:\n{full_context}\n\nUser: {request.message}\n\nPlease respond helpfully based on the document content."
        
        # Get AI response
        response = await ai_service.process_request(
            message=request.message,
            document_id=request.documentId,
            selected_text=request.selected_text,
            feature=request.feature,
            context=request.context,
            document_content=request.documentText
        )
        
        logger.info("✅ AI response generated successfully")
        return ChatResponse(
            response=response.get("response", "I apologize, but I couldn't generate a response."),
            suggestions=response.get("suggestions", []),
            corrections=response.get("corrections", []),
            status="success"
        )
        
    except Exception as e:
        logger.error(f"❌ AI chat error: {str(e)}")
        return ChatResponse(
            response=f"I apologize, but I encountered an error while processing your request. Error: {str(e)}",
            status="error"
        )

@router.get("/features")
async def get_ai_features():
    """
    Get available AI features
    """
    return {
        "features": [
            {
                "id": "chat",
                "name": "General Chat",
                "description": "General conversation about the document"
            },
            {
                "id": "questions",
                "name": "Q&A",
                "description": "Ask specific questions about document content"
            },
            {
                "id": "suggestions",
                "name": "Content Suggestions", 
                "description": "Get suggestions for improving content"
            },
            {
                "id": "summary",
                "name": "Summarization",
                "description": "Summarize document sections or entire document"
            },
            {
                "id": "grammar",
                "name": "Grammar Check",
                "description": "Check grammar and style"
            },
            {
                "id": "translation",
                "name": "Translation",
                "description": "Translate content to different languages"
            },
            {
                "id": "templates",
                "name": "Templates",
                "description": "Suggest document templates and formats"
            },
            {
                "id": "collaboration",
                "name": "Collaboration",
                "description": "Collaboration notes and feedback"
            }
        ]
    }

@router.get("/test")
async def test_ai_endpoint():
    """Test endpoint to verify AI router is working"""
    return {
        "message": "🤖 AI endpoint is working!",
        "timestamp": "2024-01-01T00:00:00Z",
        "status": "ready"
    } 
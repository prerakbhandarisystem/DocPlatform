"""
Salesforce API routes for connection and object management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
from typing import Dict, List, Optional, Any
import structlog
from pydantic import BaseModel

from app.services.salesforce_service import salesforce_service

logger = structlog.get_logger()
router = APIRouter(tags=["salesforce"])


class SalesforceCallbackRequest(BaseModel):
    code: str
    state: str


@router.get("/status")
async def get_connection_status() -> Dict[str, Any]:
    """Get current Salesforce connection status."""
    try:
        status = salesforce_service.get_connection_status()
        return {
            "success": True,
            **status
        }
    except Exception as e:
        logger.error(f"Error getting Salesforce status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/url")
async def get_salesforce_auth_url() -> Dict[str, Any]:
    """Get Salesforce OAuth authorization URL."""
    try:
        result = salesforce_service.get_oauth_authorization_url()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to generate authorization URL")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Salesforce auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auth/callback")
async def handle_salesforce_callback(request: SalesforceCallbackRequest) -> Dict[str, Any]:
    """Handle OAuth callback from Salesforce."""
    try:
        result = await salesforce_service.handle_oauth_callback(
            code=request.code,
            state=request.state
        )
        
        if not result.get("connected"):
            raise HTTPException(
                status_code=401, 
                detail=result.get("error", "Failed to authenticate with Salesforce")
            )
        
        return {
            "success": True,
            **result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling Salesforce callback: {e}")
        print("SALESFORCE CALLBACK ERROR (POST):", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/callback")
async def handle_salesforce_callback_get(
    code: str = Query(..., description="Authorization code from Salesforce"),
    state: str = Query(..., description="State parameter for CSRF protection")
):
    """Handle OAuth callback from Salesforce (GET request)."""
    try:
        result = await salesforce_service.handle_oauth_callback(code=code, state=state)
        
        if result.get("connected"):
            # Redirect to success page
            return RedirectResponse(
                url="http://localhost:3000/dashboard/documents?salesforce=connected",
                status_code=302
            )
        else:
            # Redirect to error page
            error_msg = result.get("error", "Authentication failed")
            return RedirectResponse(
                url=f"http://localhost:3000/dashboard/documents?salesforce=error&message={error_msg}",
                status_code=302
            )
        
    except Exception as e:
        logger.error(f"Error handling Salesforce callback: {e}")
        print("SALESFORCE CALLBACK ERROR (GET):", e)
        return RedirectResponse(
            url=f"http://localhost:3000/dashboard/documents?salesforce=error&message=Authentication failed",
            status_code=302
        )


@router.post("/disconnect")
async def disconnect_from_salesforce() -> Dict[str, Any]:
    """Disconnect from Salesforce org."""
    try:
        result = salesforce_service.disconnect()
        return result
        
    except Exception as e:
        logger.error(f"Error disconnecting from Salesforce: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/objects")
async def get_salesforce_objects() -> Dict[str, Any]:
    """Get all SObjects from the connected Salesforce org."""
    try:
        result = await salesforce_service.get_sobjects()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Failed to retrieve Salesforce objects")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting Salesforce objects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/objects/{sobject_name}/fields")
async def get_salesforce_object_fields(sobject_name: str) -> Dict[str, Any]:
    """Get all fields for a specific SObject."""
    try:
        result = await salesforce_service.get_sobject_fields(sobject_name)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", f"Failed to retrieve fields for {sobject_name}")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fields for {sobject_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/objects/{sobject_name}")
async def get_salesforce_object_details(sobject_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific SObject including fields and relationships."""
    try:
        result = await salesforce_service.get_sobject_fields(sobject_name)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", f"Failed to retrieve details for {sobject_name}")
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting details for {sobject_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 
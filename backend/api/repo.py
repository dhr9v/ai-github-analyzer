from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
import tempfile
import os
import shutil
import logging
from typing import Optional

from backend.schemas.stateless_schemas import AnalyzeRequest
from backend.services.orchestrator import AnalysisOrchestrator
from backend.services.cloner import ClonerService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["repositories"])

@router.post("/analyze")
def analyze_repository(req: AnalyzeRequest):
    """
    Stateless endpoint to clone and analyze a Git repository.
    Returns the complete analysis & issues report directly.
    """
    if not req.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please add it to your settings."
        )

    try:
        result = AnalysisOrchestrator.run_analysis_stateless(
            url=req.url,
            branch=req.branch or "main",
            gemini_api_key=req.gemini_api_key,
            gemini_model=req.gemini_model or "gemini-2.5-flash",
            github_pat=req.github_pat,
            custom_system_prompt=req.custom_system_prompt
        )
        return result
    except Exception as e:
        logger.error(f"Stateless analysis failed for {req.url}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/analyze/zip")
async def analyze_zip_repository(
    gemini_api_key: str = Form(...),
    gemini_model: str = Form("gemini-2.5-flash"),
    custom_system_prompt: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Stateless endpoint to upload a ZIP file, extract it, and perform audit checks.
    Returns the complete analysis & issues report directly.
    """
    if not gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please add it to your settings."
        )

    if not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP file packages are supported."
        )

    # Use a temp folder to extract ZIP
    temp_extract_dir = tempfile.mkdtemp()
    try:
        file_bytes = await file.read()
        ClonerService.extract_zip(file_bytes, temp_extract_dir)

        result = AnalysisOrchestrator.run_analysis_stateless(
            url=f"zip-upload://{file.filename}",
            branch="main",
            gemini_api_key=gemini_api_key,
            gemini_model=gemini_model,
            custom_system_prompt=custom_system_prompt,
            local_dir=temp_extract_dir
        )
        return result
    except Exception as e:
        logger.error(f"Stateless ZIP analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        # Assure extraction directory cleanup
        try:
            shutil.rmtree(temp_extract_dir)
        except Exception:
            pass

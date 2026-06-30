from fastapi import APIRouter, HTTPException, status
from google import genai
from google.genai import types
import logging

from backend.schemas.stateless_schemas import GenerateRequest
from backend.ai.reviewer import parse_gemini_error

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["generators"])

@router.post("/tests")
def generate_unit_tests_stateless(req: GenerateRequest):
    """
    Stateless endpoint to generate a unit test suite using Gemini.
    """
    if not req.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured."
        )

    # Build prompt
    prompt = (
        f"You are a Senior QA/SDET Engineer. Write a comprehensive unit test suite using pytest for '{req.repo_name}'.\n"
        "Generate mock configurations (using unittest.mock or pytest-mock) and list edge cases.\n"
    )

    if req.analysis_summary:
        prompt += f"\nCodebase overview:\n{req.analysis_summary}\n"
    
    if req.most_complex_methods:
        prompt += f"\nFocus tests on these complex functions/methods:\n{req.most_complex_methods}\n"

    prompt += "\nOutput the test suite in clean, readable Markdown code blocks with explanations of what is being tested."

    try:
        client = genai.Client(api_key=req.gemini_api_key)
        response = client.models.generate_content(
            model=req.gemini_model or "gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3
            )
        )
        return {"content": response.text}
    except Exception as e:
        logger.error(f"Stateless unit test generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=parse_gemini_error(e)
        )

@router.post("/docs")
def generate_documentation_stateless(req: GenerateRequest):
    """
    Stateless endpoint to generate codebase technical documentation using Gemini.
    """
    if not req.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured."
        )

    # Build prompt
    prompt = (
        f"You are a Senior Technical Writer and Architect. Generate extensive codebase documentation for '{req.repo_name}'.\n"
        "Include the following sections:\n"
        "1. Project README & Description\n"
        "2. Installation & Quickstart Manual\n"
        "3. Core API / Endpoint Documentation\n"
        "4. Architectural Overview & Folder Layout\n"
        "5. Developer Contribution Guide\n"
    )

    if req.analysis_summary:
        prompt += f"\nCodebase Health Context:\n{req.analysis_summary}\n"

    prompt += "\nEnsure the documentation is formatted in clean, professional GitHub Flavored Markdown."

    try:
        client = genai.Client(api_key=req.gemini_api_key)
        response = client.models.generate_content(
            model=req.gemini_model or "gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3
            )
        )
        return {"content": response.text}
    except Exception as e:
        logger.error(f"Stateless docs generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=parse_gemini_error(e)
        )

from fastapi import APIRouter, HTTPException, status
import logging
from google import genai
from google.genai import types

from backend.schemas.stateless_schemas import ChatRequest
from backend.ai.reviewer import parse_gemini_error

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("")
def chat_with_codebase(req: ChatRequest):
    """
    Stateless endpoint to perform a conversation step using Gemini.
    Accepts messages list and context, returns assistant's reply.
    """
    if not req.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key is not configured. Please add it to settings."
        )

    # Convert incoming messages history to Google GenAI Types
    contents = []
    for m in req.messages:
        role = "user" if m.role == "user" else "model"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=m.content)]
            )
        )

    # Establish system instructions
    system_instruction = (
        f"You are an expert AI Senior Software Engineer and coding assistant. You are answering queries about the repository '{req.repo_name}'.\n"
        f"URL: {req.repo_url}\n\n"
        f"Here is the context of the latest repository analysis report:\n"
        f"{req.analysis_summary}\n\n"
        "Answer the user's questions about the codebase, code design, security vulnerabilities, or refactoring ideas.\n"
        "Be extremely technical. Present code blocks, unit test mock ideas (e.g. pytest), or architectural diagrams where needed.\n"
        "Always refer to the specific files, classes, or patterns that appear in the context."
    )

    try:
        client = genai.Client(api_key=req.gemini_api_key)
        response = client.models.generate_content(
            model=req.gemini_model or "gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            )
        )
        assistant_reply = response.text or "I apologize, I could not generate an answer."
        return {"content": assistant_reply}
    except Exception as e:
        logger.error(f"Stateless Chat API failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=parse_gemini_error(e)
        )

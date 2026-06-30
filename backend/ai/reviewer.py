import os
import json
import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Pydantic schemas for Structured Output from Gemini
class AIIssue(BaseModel):
    file_path: str = Field(description="The path of the file containing the issue, relative to the repository root.")
    line_number: Optional[int] = Field(None, description="The line number where the issue occurs, or null if it applies to the whole file.")
    category: str = Field(description="Category of the issue. Must be one of: 'security', 'performance', 'bug', 'style', 'architecture'.")
    severity: str = Field(description="Severity of the issue. Must be one of: 'critical', 'warning', 'info'.")
    message: str = Field(description="Detailed explanation of the issue, what is wrong, and why.")
    code_snippet: Optional[str] = Field(None, description="The specific lines of code that contain the issue.")
    suggested_fix: Optional[str] = Field(None, description="Step-by-step recommendation or refactoring to resolve the issue.")

class AIReviewResult(BaseModel):
    overall_score: int = Field(description="Overall health score of the repository, from 0 (very poor) to 100 (excellent).")
    security_score: int = Field(description="Security score, from 0 to 100.")
    performance_score: int = Field(description="Performance score, from 0 to 100.")
    maintainability_score: int = Field(description="Maintainability score, from 0 to 100.")
    documentation_score: int = Field(description="Documentation score, from 0 to 100.")
    testing_score: int = Field(description="Testing score, from 0 to 100.")
    architecture_score: int = Field(description="Architecture score, from 0 to 100.")
    
    executive_summary: str = Field(description="High-level summary of the codebase's current state, main findings, and general impressions.")
    strengths: List[str] = Field(description="List of 3-5 major architectural or code quality strengths in the codebase.")
    weaknesses: List[str] = Field(description="List of 3-5 major weaknesses or areas of concern in the codebase.")
    refactoring_suggestions: List[str] = Field(description="List of concrete refactoring suggestions or next steps for the engineering team.")
    
    issues: List[AIIssue] = Field(description="List of specific code quality, performance, security, or architectural issues found.")

def parse_gemini_error(e: Exception) -> str:
    """
    Parses raw Google GenAI SDK exceptions and returns a clean, human-readable error description.
    """
    err_msg = str(e)
    # Check for invalid API key
    if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg or "invalid API key" in err_msg.lower() or "INVALID_ARGUMENT" in err_msg:
        return "Invalid Gemini API Key. Please verify your API Key in Settings and try again."
    # Check for quota exceeded / rate limits
    elif "quota" in err_msg.lower() or "exhausted" in err_msg.lower() or "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
        return "Gemini API Quota Exceeded. You have run out of free tier tokens or hit model rate limits. Please try again later or configure a different key."
    # Check for model access errors
    elif "model" in err_msg.lower() and ("not found" in err_msg.lower() or "404" in err_msg):
        return "The requested Gemini model is not supported or accessible with this API key. Check settings configuration."
    
    return f"Gemini API Error: {err_msg}"

class GeminiReviewer:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)

    def generate_review(
        self,
        repo_summary: str,
        folder_structure: str,
        dependencies: str,
        static_analysis_summary: str,
        critical_code_files: List[dict],
        model: str = "gemini-2.5-flash",
        custom_system_prompt: Optional[str] = None
    ) -> AIReviewResult:
        """
        Invokes Gemini model using the new google-genai SDK to generate a structured review of the codebase.
        """
        # Lazy initialization fallback if key changed in runtime settings
        if not self.client:
            api_key = self.api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
            if api_key:
                self.client = genai.Client(api_key=api_key)
            else:
                raise ValueError("Gemini API Key is not configured. Please add it to your Settings or .env file.")

        default_system_prompt = (
            "You are an elite Principal Systems Architect, Chief Security Officer, and Lead Software Engineer.\n"
            "Your task is to perform an exhaustive, professional code review of a cloned GitHub repository.\n"
            "Evaluate its security (looking for SQL injection, command injections, hardcoded secrets, weak crypto, unsafe deserialization, XSS, CSRF, SSRF),\n"
            "performance (nested loops, repeated queries, dead code, blocking ops, big-O bottlenecks, large memory allocations),\n"
            "maintainability, test coverage, documentation, and overall architectural patterns.\n"
            "You must return a structured JSON response matching the required schema. Be highly specific, concrete, and constructive."
        )
        system_prompt = custom_system_prompt or default_system_prompt

        user_content = f"""
## Repository Summary
{repo_summary}

## Directory Structure
```
{folder_structure}
```

## Configuration & Dependencies
{dependencies}

## Static Analysis Reports (Lint/Sec/Complexity metrics)
{static_analysis_summary}

## Critical Source Files (Selected files for audit)
"""
        for f in critical_code_files:
            user_content += f"\n### File: {f['file_path']}\n"
            user_content += f"```\n{f['content']}\n```\n"

        user_content += "\nAnalyze the repository context above and generate a comprehensive code review report."

        try:
            response = self.client.models.generate_content(
                model=model,
                contents=user_content,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AIReviewResult,
                    system_instruction=system_prompt,
                    temperature=0.2,
                )
            )
            
            result_json = response.text
            return AIReviewResult.model_validate_json(result_json)
            
        except Exception as e:
            logger.error(f"Error during Gemini Code Review generation: {str(e)}")
            raise RuntimeError(parse_gemini_error(e))


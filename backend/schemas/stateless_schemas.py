from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AnalyzeRequest(BaseModel):
    url: str
    branch: Optional[str] = "main"
    gemini_api_key: str
    gemini_model: Optional[str] = "gemini-2.5-flash"
    github_pat: Optional[str] = None
    custom_system_prompt: Optional[str] = None

class ChatMessagePayload(BaseModel):
    role: str # 'user' or 'model' / 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessagePayload]
    repo_name: str
    repo_url: str
    analysis_summary: Optional[str] = ""
    gemini_api_key: str
    gemini_model: Optional[str] = "gemini-2.5-flash"

class GenerateRequest(BaseModel):
    repo_name: str
    analysis_summary: Optional[str] = ""
    most_complex_methods: Optional[List[Dict[str, Any]]] = None
    gemini_api_key: str
    gemini_model: Optional[str] = "gemini-2.5-flash"

class ReportGenerateRequest(BaseModel):
    format: str # 'pdf', 'md', 'html', 'json'
    repo_name: str
    analysis: Dict[str, Any]
    issues: List[Dict[str, Any]]

import os
import datetime
import tempfile
from fastapi import APIRouter, HTTPException, status, Response
from fastapi.responses import FileResponse
import logging

from backend.schemas.stateless_schemas import ReportGenerateRequest
from backend.services.reports_gen import ReportGeneratorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])

class DictObject:
    def __init__(self, **entries):
        for k, v in entries.items():
            if k in ["created_at", "completed_at"] and isinstance(v, str):
                try:
                    # Try parsing ISO timestamp string into datetime
                    setattr(self, k, datetime.datetime.fromisoformat(v.replace("Z", "+00:00")))
                except Exception:
                    setattr(self, k, datetime.datetime.utcnow())
            elif isinstance(v, dict):
                setattr(self, k, DictObject(**v))
            elif isinstance(v, list):
                setattr(self, k, [DictObject(**item) if isinstance(item, dict) else item for item in v])
            else:
                setattr(self, k, v)

@router.post("/generate")
def generate_report_stateless(req: ReportGenerateRequest):
    """
    Stateless endpoint to compile and download PDF, MD, HTML, or JSON reports.
    Accepts full analysis and issues data, returns download file stream directly.
    """
    fmt = req.format.lower()
    if fmt not in ["pdf", "md", "json", "html"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report format. Choose pdf, md, json, or html."
        )

    # Convert incoming dicts to namespace objects for backward compatibility with ReportGeneratorService
    analysis_obj = DictObject(**req.analysis)
    issues_list = [DictObject(**i) for i in req.issues]

    try:
        if fmt == "json":
            json_data = ReportGeneratorService.generate_json(analysis_obj, issues_list, req.repo_name)
            return Response(
                content=json_data,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=code_review_{req.repo_name}.json"}
            )
        elif fmt == "md":
            md_data = ReportGeneratorService.generate_md(analysis_obj, issues_list, req.repo_name)
            return Response(
                content=md_data,
                media_type="text/markdown",
                headers={"Content-Disposition": f"attachment; filename=code_review_{req.repo_name}.md"}
            )
        elif fmt == "html":
            html_data = ReportGeneratorService.generate_html(analysis_obj, issues_list, req.repo_name)
            return Response(
                content=html_data,
                media_type="text/html",
                headers={"Content-Disposition": f"attachment; filename=code_review_{req.repo_name}.html"}
            )
        elif fmt == "pdf":
            # Generate PDF to a temp file and read its bytes
            fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
            os.close(fd) # Close file descriptor so reportlab can open it
            try:
                ReportGeneratorService.generate_pdf(analysis_obj, issues_list, req.repo_name, pdf_path)
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                return Response(
                    content=pdf_bytes,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=code_review_{req.repo_name}.pdf"}
                )
            finally:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
    except Exception as e:
        logger.error(f"Stateless report compilation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from backend.database.connection import get_db
from backend.models.models import Repository, Analysis, Issue, User
from backend.schemas.schemas import SearchResultItem
from backend.api.deps import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=List[SearchResultItem])
def global_search(
    q: str,
    repo_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not q or len(q) < 2:
        return []

    results = []

    # 1. Search Repositories
    repos_query = db.query(Repository).filter(Repository.user_id == current_user.id)
    if repo_id:
        repos_query = repos_query.filter(Repository.id == repo_id)
    repos = repos_query.all()
    repo_ids = [r.id for r in repos]

    for r in repos:
        if q.lower() in r.name.lower() or q.lower() in r.url.lower():
            results.append(
                SearchResultItem(
                    type="repository",
                    title=r.name,
                    subtitle=f"GitHub URL: {r.url}",
                    repo_id=r.id,
                    item_id=r.id
                )
            )

    # 2. Search Issues
    if repo_ids:
        analyses = db.query(Analysis).filter(
            Analysis.repo_id.in_(repo_ids),
            Analysis.status == "completed"
        ).all()
        
        # Mapping to retrieve repo_id quickly
        analysis_to_repo = {a.id: a.repo_id for a in analyses}
        analysis_ids = list(analysis_to_repo.keys())

        if analysis_ids:
            issues = db.query(Issue).filter(
                Issue.analysis_id.in_(analysis_ids)
            ).all()

            for i in issues:
                if q.lower() in i.message.lower() or q.lower() in i.file_path.lower():
                    results.append(
                        SearchResultItem(
                            type="issue",
                            title=f"Issue in {os.path.basename(i.file_path)} (Line {i.line_number or '-'})",
                            subtitle=i.message,
                            path=i.file_path,
                            line=i.line_number,
                            analysis_id=i.analysis_id,
                            repo_id=analysis_to_repo.get(i.analysis_id),
                            item_id=i.id
                        )
                    )

            # 3. Search Complex Methods in Radon complexity logs
            for a in analyses:
                if a.complexity_data and "most_complex_methods" in a.complexity_data:
                    methods = a.complexity_data["most_complex_methods"]
                    for m in methods:
                        m_name = m.get("name", "")
                        m_file = m.get("file", "")
                        m_type = m.get("type", "method")
                        if q.lower() in m_name.lower() or q.lower() in m_file.lower():
                            results.append(
                                SearchResultItem(
                                    type="function" if m_type == "function" else "class",
                                    title=f"{m_type.capitalize()}: {m_name}",
                                    subtitle=f"Complexity: {m.get('complexity')} in {m_file} (Line {m.get('lineno')})",
                                    path=m_file,
                                    line=m.get("lineno"),
                                    analysis_id=a.id,
                                    repo_id=a.repo_id,
                                    item_id=a.id
                                )
                            )

    return results[:50]

import os
import datetime
import logging
from typing import List, Dict, Any, Optional
from backend.services.cloner import ClonerService
from backend.services.static_analyzer import StaticAnalyzerService
from backend.services.complexity import ComplexityService
from backend.ai.reviewer import GeminiReviewer

logger = logging.getLogger(__name__)

class AnalysisOrchestrator:
    @staticmethod
    def get_folder_tree(startpath: str, max_depth: int = 4) -> str:
        """
        Generates a visual directory tree structure string for the prompt context.
        """
        tree_lines = []
        startpath = os.path.abspath(startpath)
        for root, dirs, files in os.walk(startpath):
            # Skip hidden and cache folders
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "venv", ".venv", "__pycache__"]]
            
            depth = root[len(startpath):].count(os.sep)
            if depth >= max_depth:
                continue
                
            indent = "  " * depth
            subdir = os.path.basename(root)
            if subdir:
                tree_lines.append(f"{indent}└── {subdir}/")
            else:
                tree_lines.append("└── /")
                
            sub_indent = "  " * (depth + 1)
            # Show up to 10 files per directory to avoid huge printouts
            for f in files[:10]:
                if not f.startswith("."):
                    tree_lines.append(f"{sub_indent}├── {f}")
            if len(files) > 10:
                tree_lines.append(f"{sub_indent}├── ... ({len(files) - 10} more files)")
                
        return "\n".join(tree_lines)

    @staticmethod
    def select_critical_files(repo_dir: str, max_files: int = 15) -> List[Dict[str, str]]:
        """
        Selects key source code and config files to supply directly to Gemini's code audit.
        Prioritizes: requirements, package configs, Dockerfiles, and top source files.
        """
        critical_files = []
        extensions = [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"]
        config_names = ["package.json", "requirements.txt", "pyproject.toml", "Dockerfile", "docker-compose.yml"]

        candidate_files = []

        for root, _, files in os.walk(repo_dir):
            if any(p in root for p in [".git", "node_modules", "venv", ".venv", "__pycache__", "build", "dist"]):
                continue
                
            for f in files:
                file_path = os.path.join(root, f)
                rel_path = os.path.relpath(file_path, repo_dir).replace("\\", "/")
                
                # Config files
                if f in config_names:
                    candidate_files.append((rel_path, file_path, 0)) # Highest priority
                    continue
                    
                # Code files
                ext = os.path.splitext(f)[1].lower()
                if ext in extensions:
                    try:
                        # Rank by size (smaller files first, avoiding massive bundles)
                        size = os.path.getsize(file_path)
                        if 100 < size < 100000: # 100B to 100KB range
                            candidate_files.append((rel_path, file_path, size))
                    except Exception:
                        pass  # nosec B110

        # Sort candidate files: priority configs first, then smaller source files
        candidate_files.sort(key=lambda x: (x[2] > 0, x[2]))

        for rel_path, file_path, _ in candidate_files[:max_files]:
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as fread:
                    lines = fread.readlines()
                    # Cap lines per file to prevent prompt flooding
                    content = "".join(lines[:300])
                    if len(lines) > 300:
                        content += "\n... (truncated: file too long)"
                    critical_files.append({
                        "file_path": rel_path,
                        "content": content
                    })
            except Exception:
                pass  # nosec B110

        return critical_files


    @classmethod
    def run_analysis_stateless(
        cls,
        url: str,
        branch: str,
        gemini_api_key: str,
        gemini_model: str = "gemini-2.5-flash",
        github_pat: Optional[str] = None,
        custom_system_prompt: Optional[str] = None,
        local_dir: Optional[str] = None
    ) -> dict:
        """
        Runs the analysis pipeline in a fully stateless manner.
        Clones (if local_dir is not provided) to a temp dir, runs static checks,
        sends to Gemini, compiles results, and returns the analysis data dict.
        """
        import tempfile
        import shutil

        # Use temporary directory for clone if not already extracted (e.g. from ZIP)
        temp_dir_obj = None
        if not local_dir:
            temp_dir_obj = tempfile.TemporaryDirectory()
            repo_dest = temp_dir_obj.name
            logger.info(f"Cloning repo to stateless temp dir: {repo_dest}")
            commit_hash = ClonerService.clone_repo(
                url=url,
                dest_dir=repo_dest,
                branch=branch,
                token=github_pat
            )
        else:
            repo_dest = local_dir
            commit_hash = f"zip-upload-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"

        try:
            logger.info("Stateless: Starting static analysis checks")
            meta = StaticAnalyzerService.detect_project_metadata(repo_dest)
            complexity_results = ComplexityService.analyze_repository(repo_dest)
            static_issues = StaticAnalyzerService.analyze(repo_dest)

            # Context prep
            critical_files = cls.select_critical_files(repo_dest)
            folder_tree = cls.get_folder_tree(repo_dest)
            
            repo_summary = (
                f"Languages: {', '.join(meta.get('languages', []))}\n"
                f"Frameworks: {', '.join(meta.get('frameworks', []))}\n"
                f"Backend: {', '.join(meta.get('backend', []))}\n"
                f"Frontend: {', '.join(meta.get('frontend', []))}\n"
                f"Databases: {', '.join(meta.get('databases', []))}\n"
                f"ORM: {', '.join(meta.get('orms', []))}\n"
                f"Architecture: {meta.get('architecture', 'Monolith')}"
            )
            dependencies = (
                f"Package Managers: {', '.join(meta.get('package_managers', []))}\n"
                f"Containerization: {', '.join(meta.get('containerization', []))}\n"
                f"CI/CD: {', '.join(meta.get('cicd', []))}\n"
                f"Authentication: {', '.join(meta.get('authentication', []))}"
            )
            static_summary_str = (
                f"Total Issues Detected by Linters: {len(static_issues)}\n"
                f"Ruff (Code Style/Bugs): {sum(1 for i in static_issues if i['tool'] == 'ruff')} issues\n"
                f"Bandit (Security scan): {sum(1 for i in static_issues if i['tool'] == 'bandit')} issues\n"
                f"Mypy (Type checks): {sum(1 for i in static_issues if i['tool'] == 'mypy')} issues\n"
                f"Average Cyclomatic Complexity: {complexity_results.get('average_cyclomatic_complexity', 0)}\n"
                f"Average Maintainability Index: {complexity_results.get('average_maintainability_index', 0)} (A/B/C: {complexity_results.get('mi_distribution')})"
            )
            
            logger.info("Stateless: Invoking Gemini Code Review")
            reviewer = GeminiReviewer(api_key=gemini_api_key)
            review_res = reviewer.generate_review(
                repo_summary=repo_summary,
                folder_structure=folder_tree,
                dependencies=dependencies,
                static_analysis_summary=static_summary_str,
                critical_code_files=critical_files,
                model=gemini_model,
                custom_system_prompt=custom_system_prompt
            )

            # Format the output JSON dictionary matching Analysis & Issues structure
            output_issues = []
            
            # 1. Add static analysis issues
            for idx, issue_data in enumerate(static_issues):
                output_issues.append({
                    "id": idx + 1,
                    "file_path": issue_data["file_path"],
                    "line_number": issue_data["line_number"],
                    "category": issue_data["category"],
                    "severity": issue_data["severity"],
                    "tool": issue_data["tool"],
                    "message": issue_data["message"],
                    "code_snippet": issue_data["code_snippet"],
                    "suggested_fix": issue_data["suggested_fix"]
                })

            # 2. Add Gemini audit issues
            start_idx = len(output_issues) + 1
            for idx, issue_data in enumerate(review_res.issues):
                clean_path = issue_data.file_path.replace("\\", "/")
                # Truncate absolute path prefix if returned by mistake
                if repo_dest in clean_path:
                    clean_path = os.path.relpath(clean_path, repo_dest).replace("\\", "/")

                output_issues.append({
                    "id": start_idx + idx,
                    "file_path": clean_path,
                    "line_number": issue_data.line_number,
                    "category": issue_data.category,
                    "severity": issue_data.severity,
                    "tool": "gemini",
                    "message": issue_data.message,
                    "code_snippet": issue_data.code_snippet,
                    "suggested_fix": issue_data.suggested_fix
                })

            # Format the analysis dict
            analysis_data = {
                "status": "completed",
                "branch": branch,
                "commit_hash": commit_hash,
                "overall_score": review_res.overall_score,
                "security_score": review_res.security_score,
                "performance_score": review_res.performance_score,
                "maintainability_score": review_res.maintainability_score,
                "documentation_score": review_res.documentation_score,
                "testing_score": review_res.testing_score,
                "architecture_score": review_res.architecture_score,
                "executive_summary": review_res.executive_summary,
                "strengths": review_res.strengths,
                "weaknesses": review_res.weaknesses,
                "refactoring_suggestions": review_res.refactoring_suggestions,
                "complexity_data": complexity_results,
                "issues": output_issues,
                "created_at": datetime.datetime.utcnow().isoformat(),
                "completed_at": datetime.datetime.utcnow().isoformat(),
                "error_message": None
            }
            return analysis_data

        finally:
            # Clean up temp dir clone if created
            if temp_dir_obj:
                try:
                    temp_dir_obj.cleanup()
                except Exception:
                    pass  # nosec B110


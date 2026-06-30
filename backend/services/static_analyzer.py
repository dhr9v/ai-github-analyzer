import os
import sys
import subprocess  # nosec B404
import json
import re
from typing import List, Dict, Any, Optional

class StaticAnalyzerService:
    @staticmethod
    def detect_project_metadata(repo_dir: str) -> Dict[str, Any]:
        """
        Scans files in repo_dir to detect project details: languages, frameworks, 
        package managers, databases, ORMs, and container configs.
        """
        metadata = {
            "languages": set(),
            "frameworks": set(),
            "package_managers": set(),
            "databases": set(),
            "orms": set(),
            "frontend": set(),
            "backend": set(),
            "authentication": set(),
            "testing_frameworks": set(),
            "containerization": set(),
            "cicd": set(),
            "architecture": "Monolith (Standard Directory Layout)"
        }

        # Check file indicators
        has_src = False
        has_app = False
        has_tests = False
        has_services = False
        has_controllers = False
        has_views = False
        has_models = False

        for root, dirs, files in os.walk(repo_dir):
            # Skip git and venv folders
            if any(p in root for p in [".git", "node_modules", "venv", ".venv", "__pycache__"]):
                continue

            for d in dirs:
                if d.lower() == "src":
                    has_src = True
                elif d.lower() in ["app", "apps"]:
                    has_app = True
                elif d.lower() in ["tests", "test"]:
                    has_tests = True
                elif d.lower() == "services":
                    has_services = True
                elif d.lower() == "controllers":
                    has_controllers = True
                elif d.lower() == "models":
                    has_models = True
                elif d.lower() == "views":
                    has_views = True

            for f in files:
                ext = os.path.splitext(f)[1].lower()
                
                # Languages
                if ext == ".py":
                    metadata["languages"].add("Python")
                elif ext in [".js", ".jsx"]:
                    metadata["languages"].add("JavaScript")
                elif ext in [".ts", ".tsx"]:
                    metadata["languages"].add("TypeScript")
                elif ext == ".go":
                    metadata["languages"].add("Go")
                elif ext == ".rs":
                    metadata["languages"].add("Rust")
                elif ext == ".java":
                    metadata["languages"].add("Java")
                elif ext in [".cpp", ".cc", ".h"]:
                    metadata["languages"].add("C/C++")
                elif ext == ".cs":
                    metadata["languages"].add("C#")
                elif ext == ".rb":
                    metadata["languages"].add("Ruby")
                elif ext == ".php":
                    metadata["languages"].add("PHP")

                # Package Managers
                if f == "package-lock.json" or f == "package.json":
                    metadata["package_managers"].add("npm")
                elif f == "yarn.lock":
                    metadata["package_managers"].add("yarn")
                elif f == "pnpm-lock.yaml":
                    metadata["package_managers"].add("pnpm")
                elif f == "requirements.txt":
                    metadata["package_managers"].add("pip (requirements.txt)")
                elif f in ["pyproject.toml", "poetry.lock"]:
                    metadata["package_managers"].add("poetry")
                elif f == "Cargo.toml":
                    metadata["package_managers"].add("cargo")
                elif f == "go.mod":
                    metadata["package_managers"].add("go modules")
                elif f == "pom.xml":
                    metadata["package_managers"].add("maven")

                # Frameworks / Backend / Frontend / ORM Detection by file contents or specific filenames
                file_path = os.path.join(root, f)
                
                # Read short file contents for scans
                content_sample = ""
                if ext in [".py", ".json", ".js", ".ts", ".tsx", ".yaml", ".yml", ".toml"]:
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as file_read:
                            content_sample = file_read.read(4000)
                    except Exception:
                        pass  # nosec B110

                # Containerization
                if f == "Dockerfile" or "docker" in f.lower():
                    metadata["containerization"].add("Docker")
                if "kubernetes" in content_sample or "apiVersion:" in content_sample:
                    metadata["containerization"].add("Kubernetes")

                # CI/CD
                if ".github/workflows" in root:
                    metadata["cicd"].add("GitHub Actions")
                if f == ".gitlab-ci.yml":
                    metadata["cicd"].add("GitLab CI")

                # Python specific detection
                if ext == ".py":
                    if "fastapi" in content_sample.lower():
                        metadata["frameworks"].add("FastAPI")
                        metadata["backend"].add("FastAPI")
                    if "flask" in content_sample.lower():
                        metadata["frameworks"].add("Flask")
                        metadata["backend"].add("Flask")
                    if "django" in content_sample.lower() or f == "manage.py":
                        metadata["frameworks"].add("Django")
                        metadata["backend"].add("Django")
                    if "sqlalchemy" in content_sample.lower():
                        metadata["orms"].add("SQLAlchemy")
                    if "peewee" in content_sample.lower():
                        metadata["orms"].add("Peewee")
                    if "pytest" in content_sample.lower() or "import pytest" in content_sample:
                        metadata["testing_frameworks"].add("pytest")
                    if "unittest" in content_sample.lower():
                        metadata["testing_frameworks"].add("unittest")

                # JS/TS specific detection
                if ext in [".js", ".ts", ".tsx", ".json"]:
                    if "express" in content_sample.lower():
                        metadata["frameworks"].add("Express")
                        metadata["backend"].add("Express (Node.js)")
                    if "next" in content_sample.lower() and f == "package.json":
                        metadata["frameworks"].add("Next.js")
                        metadata["frontend"].add("Next.js")
                        metadata["backend"].add("Next.js (API Routes)")
                    if "react" in content_sample.lower() and f == "package.json":
                        metadata["frameworks"].add("React")
                        metadata["frontend"].add("React")
                    if "vue" in content_sample.lower() and f == "package.json":
                        metadata["frameworks"].add("Vue")
                        metadata["frontend"].add("Vue")
                    if "angular" in content_sample.lower() and f == "package.json":
                        metadata["frameworks"].add("Angular")
                        metadata["frontend"].add("Angular")
                    if "prisma" in content_sample.lower():
                        metadata["orms"].add("Prisma")
                    if "mongoose" in content_sample.lower():
                        metadata["orms"].add("Mongoose")
                        metadata["databases"].add("MongoDB")
                    if "jest" in content_sample.lower():
                        metadata["testing_frameworks"].add("Jest")

                # Databases
                if "postgresql" in content_sample.lower() or "psycopg" in content_sample.lower():
                    metadata["databases"].add("PostgreSQL")
                if "mysql" in content_sample.lower():
                    metadata["databases"].add("MySQL")
                if "sqlite" in content_sample.lower() or ext == ".db":
                    metadata["databases"].add("SQLite")
                if "mongodb" in content_sample.lower() or "mongo" in content_sample.lower():
                    metadata["databases"].add("MongoDB")
                if "redis" in content_sample.lower():
                    metadata["databases"].add("Redis")

                # Authentication
                if "jwt" in content_sample.lower() or "jose" in content_sample.lower() or "jsonwebtoken" in content_sample.lower():
                    metadata["authentication"].add("JWT Auth")
                if "firebase" in content_sample.lower() and "auth" in content_sample.lower():
                    metadata["authentication"].add("Firebase Auth")
                if "oauth" in content_sample.lower():
                    metadata["authentication"].add("OAuth2")

        # Architecture detection heuristics
        if has_controllers and has_models and has_views:
            metadata["architecture"] = "MVC (Model-View-Controller)"
        elif has_services and has_models and has_app:
            metadata["architecture"] = "Clean Architecture / DDD"
        elif has_src and not has_app and not has_services:
            metadata["architecture"] = "Standard Src Layout"
        
        # Clean sets to sorted lists
        res = {k: sorted(list(v)) if isinstance(v, set) else v for k, v in metadata.items()}
        
        # Format lists for display
        if not res["languages"]: res["languages"] = ["Unknown"]
        if not res["frameworks"]: res["frameworks"] = ["Vanilla/No Framework"]
        
        return res

    @staticmethod
    def run_command(cmd: List[str], cwd: str) -> str:
        """
        Helper to run subprocess commands safely.
        """
        try:
            result = subprocess.run(  # nosec B603
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="ignore",
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            return result.stdout or result.stderr or ""
        except Exception as e:
            return f"Error executing command {' '.join(cmd)}: {str(e)}"

    @classmethod
    def analyze(cls, repo_dir: str) -> List[Dict[str, Any]]:
        """
        Runs static analysis tools and returns a standardized list of Issue dicts.
        """
        issues = []
        
        # Resolve Python executable in the virtual environment if running from it, otherwise use current sys.executable
        py_exe = sys.executable

        # 1. Run Ruff
        ruff_output = cls.run_command([py_exe, "-m", "ruff", "check", "--format=json", "."], repo_dir)
        try:
            # Ruff might output nothing or valid JSON
            if ruff_output.strip().startswith("[") or ruff_output.strip().startswith("{"):
                ruff_issues = json.loads(ruff_output)
                if isinstance(ruff_issues, dict):
                    # In some versions, it's a dict containing a 'results' key or similar
                    ruff_issues = ruff_issues.get("results", [])
                
                for ri in ruff_issues:
                    # Ruff item mapping
                    location = ri.get("location", {})
                    # Suggested fix if available
                    fix = ri.get("fix", {})
                    fix_message = fix.get("message") if fix else None
                    
                    category = "style"
                    code = ri.get("code", "")
                    # Ruff codes mapping
                    if code.startswith("E") or code.startswith("W"):
                        category = "style"
                    elif code.startswith("F") or code.startswith("B"):
                        category = "bug"
                    elif code.startswith("S"):
                        category = "security"

                    issues.append({
                        "file_path": ri.get("filename", ri.get("file", "")),
                        "line_number": location.get("row", 1),
                        "category": category,
                        "severity": "warning" if category == "style" else "critical",
                        "tool": "ruff",
                        "message": f"[{code}] {ri.get('message', '')}",
                        "code_snippet": ri.get("noqa_row") or ri.get("cell"),
                        "suggested_fix": fix_message
                    })
        except Exception:
            pass  # nosec B110

        # 2. Run Bandit (Security check)
        bandit_output = cls.run_command([py_exe, "-m", "bandit", "-r", "-f", "json", "."], repo_dir)
        try:
            if bandit_output.strip().startswith("{"):
                bandit_data = json.loads(bandit_output)
                results = bandit_data.get("results", [])
                for bi in results:
                    sev = bi.get("issue_severity", "LOW").lower()
                    severity = "critical" if sev == "high" else "warning" if sev == "medium" else "info"
                    
                    issues.append({
                        "file_path": bi.get("filename", ""),
                        "line_number": bi.get("line_number", 1),
                        "category": "security",
                        "severity": severity,
                        "tool": "bandit",
                        "message": f"[{bi.get('test_id', 'B000')}] {bi.get('issue_text', '')}",
                        "code_snippet": bi.get("code", ""),
                        "suggested_fix": f"Review code at line {bi.get('line_number', 1)}. Refer to rule {bi.get('test_id', '')} for details."
                    })
        except Exception:
            pass  # nosec B110

        # 3. Run Mypy (Type checking)
        mypy_output = cls.run_command([py_exe, "-m", "mypy", "--ignore-missing-imports", "."], repo_dir)
        # Mypy reports errors line by line: filename:line: error: message
        for line in mypy_output.splitlines():
            # Match formats like: "path/to/file.py:123: error: message"
            match = re.match(r"^([^:]+):(\d+):\s*(error|warning|note):\s*(.*)$", line)
            if match:
                fpath, line_num, level, msg = match.groups()
                # Skip summaries
                if "found" in msg or "errors" in msg:
                    continue
                issues.append({
                    "file_path": fpath,
                    "line_number": int(line_num),
                    "category": "bug" if level == "error" else "style",
                    "severity": "critical" if level == "error" else "info",
                    "tool": "mypy",
                    "message": f"[mypy] {msg}",
                    "code_snippet": None,
                    "suggested_fix": "Fix type annotations to resolve this type safety check."
                })

        # Normalize relative file paths so they don't contain repo_dir path
        for issue in issues:
            raw_path = issue["file_path"]
            # Convert Windows backslashes
            raw_path = raw_path.replace("\\", "/")
            # Remove repo_dir prefix if exists
            normalized_repo_dir = repo_dir.replace("\\", "/").rstrip("/") + "/"
            if raw_path.startswith(normalized_repo_dir):
                issue["file_path"] = raw_path[len(normalized_repo_dir):]
            elif os.path.isabs(issue["file_path"]) or repo_dir in raw_path:
                # Fallback matching
                rel = os.path.relpath(issue["file_path"], repo_dir)
                issue["file_path"] = rel.replace("\\", "/")
            
        return issues

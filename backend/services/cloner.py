import os
import shutil
import re
import zipfile
import datetime
from typing import Tuple, Optional
import git

class ClonerService:
    @staticmethod
    def parse_github_url(url: str) -> Tuple[str, str]:
        """
        Parses a GitHub URL and returns (owner, repo_name)
        Matches:
          https://github.com/owner/repo
          https://github.com/owner/repo.git
          git@github.com:owner/repo.git
        """
        url = url.strip()
        pattern = r"(?:https?://github\.com/|git@github\.com:)([^/]+)/([^/\.]+)(?:\.git)?$"
        match = re.search(pattern, url)
        if not match:
            raise ValueError("Invalid GitHub URL format. Expected 'https://github.com/owner/repo'")
        return match.group(1), match.group(2)

    @staticmethod
    def clone_repo(url: str, dest_dir: str, branch: Optional[str] = None, token: Optional[str] = None) -> str:
        """
        Clones a repository to dest_dir. Returns the head commit hash.
        """
        clone_url = url
        if token and url.startswith("https://github.com/"):
            # Injects PAT token securely for private repository clones
            clone_url = url.replace("https://github.com/", f"https://{token}@github.com/")

        if os.path.exists(dest_dir):
            ClonerService.cleanup_dir(dest_dir)

        os.makedirs(dest_dir, exist_ok=True)

        kwargs = {}
        if branch:
            kwargs["branch"] = branch

        try:
            repo = git.Repo.clone_from(clone_url, dest_dir, **kwargs)
            commit_hash = repo.head.commit.hexsha
            return commit_hash
        except Exception as e:
            raise RuntimeError(f"Failed to clone repository: {str(e)}")

    @staticmethod
    def extract_zip(zip_file_bytes: bytes, dest_dir: str) -> str:
        """
        Extracts an uploaded repository ZIP file to dest_dir.
        """
        if os.path.exists(dest_dir):
            ClonerService.cleanup_dir(dest_dir)
        os.makedirs(dest_dir, exist_ok=True)

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            tmp.write(zip_file_bytes)
            tmp_path = tmp.name

        try:
            with zipfile.ZipFile(tmp_path, 'r') as zip_ref:
                zip_ref.extractall(dest_dir)
            
            # Generate a unique string for zip upload tracking
            timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
            return f"zip-upload-{timestamp}"
        finally:
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    @staticmethod
    def cleanup_dir(dir_path: str):
        """
        Removes a directory, resolving Windows read-only git permission issues.
        """
        if not os.path.exists(dir_path):
            return
        
        def onerror(func, path, exc_info):
            import stat
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass

        try:
            shutil.rmtree(dir_path, onerror=onerror)
        except Exception:
            try:
                shutil.rmtree(dir_path, ignore_errors=True)
            except Exception:
                pass

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./reviews.db"
    JWT_SECRET: str = "8f5b84931a24d081f9a2e32a688bcae52467fd8a3e74287d60e6e7cb61c36b8e"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Directory where repositories will be cloned
    CLONE_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
        "data", 
        "cloned_repos"
    )

settings = Settings()

# Ensure clone dir exists
os.makedirs(settings.CLONE_DIR, exist_ok=True)

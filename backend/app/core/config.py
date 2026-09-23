import os
import json
from typing import List

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RiskNexus Risk Intelligence Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "risknexus-secret-key-change-in-production"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite:///./risknexus.db"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"
    ACTIVE_DATASET: str = "Dataset1"
    DATA_SOURCE_CACHE_DIR: str = ".data_sources"
    SUPABASE_PRIMARY_DATABASE_URL: str = ""
    SUPABASE_SECONDARY_DATABASE_URL: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_HOST_CONTAINER: str = ""
    MYSQL_PORT: int = 3306
    MYSQL_DATABASE: str = "glpi"
    MYSQL_USER: str = ""
    MYSQL_PASSWORD: str = ""
    GLPI_ENABLED: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        raw_value = os.getenv("CORS_ORIGINS", self.CORS_ORIGINS)
        if isinstance(raw_value, list):
            return [str(origin).strip() for origin in raw_value if str(origin).strip()]

        normalized_value = str(raw_value).strip()
        if not normalized_value:
            return []

        try:
            parsed_value = json.loads(normalized_value)
        except json.JSONDecodeError:
            parsed_value = None

        if isinstance(parsed_value, list):
            return [str(origin).strip() for origin in parsed_value if str(origin).strip()]

        return [origin.strip() for origin in normalized_value.split(",") if origin.strip()]

    class Config:
        case_sensitive = True
        env_file = (".env", "../.env")

settings = Settings()

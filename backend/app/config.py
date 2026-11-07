"""Configuración centralizada de la aplicación.

Todos los valores se leen de variables de entorno (o del archivo ``.env``)
mediante pydantic-settings. Los secretos nunca deben tener valores por defecto
reales en el código.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    app_env: Literal["development", "production"] = "development"
    app_name: str = "TikTok Library"
    public_base_url: str = "http://localhost:5173"

    # Persistencia
    database_url: str = "sqlite+aiosqlite:///./data/library.db"
    storage_root: Path = Path("./media")

    # Sesión y seguridad
    session_ttl_minutes: int = Field(default=120, ge=5, le=60 * 24 * 30)
    cookie_secure: bool = True
    token_encryption_key: SecretStr | None = None

    # TikTok (los secretos son SecretStr para que no aparezcan en logs/repr)
    tiktok_client_key: str | None = None
    tiktok_client_secret: SecretStr | None = None
    tiktok_redirect_uri: str | None = None
    tiktok_scopes: str = "user.info.basic"

    # Descargas
    download_concurrency: int = Field(default=2, ge=1, le=16)
    download_max_retries: int = Field(default=3, ge=0, le=10)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def tiktok_configured(self) -> bool:
        """Indica si hay credenciales de TikTok configuradas (no si están aprobadas)."""
        return bool(
            self.tiktok_client_key
            and self.tiktok_client_secret
            and self.tiktok_redirect_uri
        )


@lru_cache
def get_settings() -> Settings:
    """Devuelve una instancia única de configuración (inyectable en FastAPI)."""
    return Settings()


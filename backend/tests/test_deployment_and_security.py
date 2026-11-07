"""Pruebas de auditoría de seguridad y validación de configuración de despliegue."""

from pathlib import Path
import re


ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def test_no_secrets_in_env_examples() -> None:
    """Verifica que ningún archivo .env.example contenga secretos reales."""
    example_files = [
        ROOT_DIR / ".env.example",
        ROOT_DIR / "backend" / ".env.example",
    ]

    for env_file in example_files:
        assert env_file.exists(), f"Falta {env_file}"
        content = env_file.read_text(encoding="utf-8")

        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                val = val.strip()
                # Si es una clave sensible, debe estar vacía o ser un placeholder explícito
                if key in {"TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY"}:
                    assert val == "", f"{env_file.name} contiene valor no vacío para {key}: {val}"


def test_gitignore_covers_critical_data() -> None:
    """Verifica que .gitignore ignore carpetas sensibles de base de datos, multimedia y .env."""
    gitignore = ROOT_DIR / ".gitignore"
    assert gitignore.exists()
    content = gitignore.read_text(encoding="utf-8")

    assert ".env" in content
    assert "data/" in content
    assert "media/" in content
    assert "*.db" in content


def test_dockerfile_backend_uses_non_root() -> None:
    """Verifica que el Dockerfile del backend ejecute con usuario no root."""
    dockerfile = ROOT_DIR / "backend" / "Dockerfile"
    assert dockerfile.exists()
    content = dockerfile.read_text(encoding="utf-8")

    assert "USER appuser" in content
    assert "EXPOSE 8000" in content
    assert "HEALTHCHECK" in content


def test_dockerfile_frontend_and_nginx_proxy() -> None:
    """Verifica la configuración del Dockerfile de frontend y el proxy inverso con Range headers."""
    dockerfile = ROOT_DIR / "frontend" / "Dockerfile"
    nginx_conf = ROOT_DIR / "frontend" / "nginx.conf"

    assert dockerfile.exists()
    assert nginx_conf.exists()

    content_nginx = nginx_conf.read_text(encoding="utf-8")
    assert "proxy_pass http://backend:8000/api/;" in content_nginx
    assert "proxy_set_header Range $http_range;" in content_nginx
    assert "proxy_buffering off;" in content_nginx
    assert "client_max_body_size" in content_nginx


def test_docker_compose_structure() -> None:
    """Verifica la definición básica de docker-compose.yml."""
    compose_file = ROOT_DIR / "docker-compose.yml"
    assert compose_file.exists()
    content = compose_file.read_text(encoding="utf-8")

    assert "backend:" in content
    assert "frontend:" in content
    assert "./data:/app/data" in content
    assert "./media:/app/media" in content

